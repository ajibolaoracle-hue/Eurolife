import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authorization = req.headers.get("Authorization");
  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });
  if (!idempotencyKey || idempotencyKey.trim().length < 8 || idempotencyKey.length > 128)
    return json(400, { error: "valid_idempotency_key_required" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json(500, { error: "server_not_configured" });

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json(401, { error: "invalid_token" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const targetWorkerId = typeof body.targetWorkerId === "string" ? body.targetWorkerId : null;
  const allowed = new Set(["apply", "hire", "start", "submit", "approve", "cancel"]);
  if (!jobId || !allowed.has(action)) return json(400, { error: "invalid_job_action" });

  // The RPC uses auth.uid() to identify the actor. Forward the user's JWT to Postgres;
  // do not use the service-role context for the state transition.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.rpc("transition_player_job", {
    p_job_id: jobId,
    p_action: action,
    p_idempotency_key: idempotencyKey,
    p_target_worker_id: action === "hire" ? targetWorkerId : null,
  });
  if (error) {
    if (error.code === "28000") return json(401, { error: "unauthorized" });
    if (error.code === "42501") return json(403, { error: "forbidden" });
    if (error.code === "P0002") return json(404, { error: "job_not_found" });
    if (error.code === "22023") return json(400, { error: "invalid_action" });
    if (error.code === "P0001") return json(409, { error: error.message });
    console.error("job-action RPC failed", { code: error.code });
    return json(500, { error: "job_action_failed" });
  }
  return json(200, { job: data });
});
