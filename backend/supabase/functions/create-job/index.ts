import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json(500, { error: "server_not_configured" });

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json(401, { error: "invalid_token" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "Independent business";
  const wage = body.wageEuros;
  const minutes = body.estimatedMinutes;

  if (title.length < 1 || title.length > 80) return json(400, { error: "invalid_title" });
  if (description.length > 2000) return json(400, { error: "description_too_long" });
  if (businessName.length < 1 || businessName.length > 80) return json(400, { error: "invalid_business_name" });
  if (!Number.isInteger(wage) || (wage as number) < 1 || (wage as number) > 100000)
    return json(400, { error: "invalid_wage" });
  if (!Number.isInteger(minutes) || (minutes as number) < 5 || (minutes as number) > 1440)
    return json(400, { error: "invalid_duration" });

  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey || idempotencyKey.trim().length < 8 || idempotencyKey.length > 128)
    return json(400, { error: "valid_idempotency_key_required" });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.rpc("create_job_with_escrow", {
    p_business_name: businessName,
    p_title: title,
    p_description: description,
    p_wage_euros: wage,
    p_estimated_minutes: minutes,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    if (error.message.includes("insufficient_funds")) return json(409, { error: "insufficient_funds" });
    if (error.code === "22023") return json(400, { error: "invalid_request" });
    if (error.code === "28000") return json(401, { error: "unauthorized" });
    console.error("create-job RPC failed", { code: error.code });
    return json(500, { error: "job_creation_failed" });
  }
  return json(201, { job: data });
});
