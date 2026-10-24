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
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const avatarId = typeof body.avatarId === "string" ? body.avatarId.trim() : "default";
  if (displayName.length < 1 || displayName.length > 24) return json(400, { error: "display_name_must_be_1_to_24_characters" });
  if (avatarId.length < 1 || avatarId.length > 80) return json(400, { error: "invalid_avatar_id" });
  if (!/^[\p{L}\p{N} _.-]+$/u.test(displayName)) return json(400, { error: "display_name_contains_unsupported_characters" });

  const { data, error } = await client.from("player_profiles")
    .upsert({ user_id: user.id, display_name: displayName, avatar_id: avatarId, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("user_id,display_name,avatar_id,reputation,created_at,updated_at")
    .single();
  if (error) {
    if (error.code === "23505") return json(409, { error: "display_name_unavailable" });
    console.error("profile upsert failed", { code: error.code });
    return json(500, { error: "profile_save_failed" });
  }
  return json(200, { profile: data });
});
