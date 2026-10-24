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
  const targetId = typeof body.targetPlayerId === "string" ? body.targetPlayerId : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!targetId || targetId === user.id) return json(400, { error: "invalid_target_player" });
  if (action !== "block" && action !== "unblock") return json(400, { error: "invalid_action" });

  if (action === "block") {
    const { error } = await client.from("player_blocks")
      .upsert({ blocker_id: user.id, blocked_id: targetId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
    if (error) {
      console.error("block player failed", { code: error.code });
      return json(500, { error: "block_failed" });
    }
  } else {
    const { error } = await client.from("player_blocks")
      .delete().eq("blocker_id", user.id).eq("blocked_id", targetId);
    if (error) {
      console.error("unblock player failed", { code: error.code });
      return json(500, { error: "unblock_failed" });
    }
  }
  return json(200, { success: true, action, targetPlayerId: targetId });
});
