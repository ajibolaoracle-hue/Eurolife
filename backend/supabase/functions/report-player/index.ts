import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
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

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const reportedId = typeof body.reportedPlayerId === "string" ? body.reportedPlayerId : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  const allowedCategories = new Set(["harassment", "hate", "sexual_content", "spam", "scam", "cheating", "other"]);

  if (!reportedId || reportedId === user.id) return json(400, { error: "invalid_reported_player" });
  if (!allowedCategories.has(category)) return json(400, { error: "invalid_report_category" });
  if (details.length > 2000) return json(400, { error: "report_details_too_long" });

  const { data, error } = await client.from("player_reports")
    .insert({ reporter_id: user.id, reported_id: reportedId, category, details })
    .select("id,reporter_id,reported_id,category,details,status,created_at")
    .single();
  if (error) {
    console.error("player report insert failed", { code: error.code });
    return json(500, { error: "report_submission_failed" });
  }
  return json(201, { report: data });
});
