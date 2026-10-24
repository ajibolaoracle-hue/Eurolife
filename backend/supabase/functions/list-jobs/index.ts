import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { error: "method_not_allowed" });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json(500, { error: "server_not_configured" });
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return json(401, { error: "invalid_token" });

  const params = new URL(req.url).searchParams;
  const status = params.get("status") ?? "open";
  const allowedStatuses = new Set(["open", "applied", "hired", "in_progress", "submitted", "completed", "cancelled", "disputed", "mine"]);
  if (!allowedStatuses.has(status)) return json(400, { error: "invalid_status" });
  const rawLimit = Number(params.get("limit") ?? "20");
  const rawOffset = Number(params.get("offset") ?? "0");
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50 || !Number.isInteger(rawOffset) || rawOffset < 0)
    return json(400, { error: "invalid_pagination" });

  let query = client.from("jobs")
    .select("id,employer_id,worker_id,business_name,title,description,wage_euros,estimated_minutes,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .range(rawOffset, rawOffset + rawLimit - 1);

  if (status === "mine") {
    query = query.or("employer_id.eq." + user.id + ",worker_id.eq." + user.id);
  } else if (["open", "completed"].includes(status)) {
    query = query.eq("status", status);
  } else {
    // Private/non-open states are returned only if the authenticated player is involved.
    query = query.eq("status", status).or("employer_id.eq." + user.id + ",worker_id.eq." + user.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("job board query failed", { code: error.code });
    return json(500, { error: "job_board_unavailable" });
  }
  return json(200, { jobs: data ?? [], limit: rawLimit, offset: rawOffset });
});
