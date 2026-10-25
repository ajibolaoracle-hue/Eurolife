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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json(500, { error: "server_not_configured" });

  const auth = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) return json(401, { error: "invalid_token" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const kind = typeof body.kind === "string" ? body.kind : "direct";
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!["direct", "group", "business"].includes(kind)) return json(400, { error: "invalid_conversation_kind" });
  if (kind === "direct" && (!targetUserId || targetUserId === user.id)) return json(400, { error: "valid_target_user_required" });
  if (kind !== "direct" && title.length > 80) return json(400, { error: "title_too_long" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let targetExists = false;
  if (kind === "direct") {
    const { data: target, error: targetError } = await admin.from("player_profiles").select("user_id").eq("user_id", targetUserId).maybeSingle();
    if (targetError) return json(500, { error: "target_check_failed" });
    targetExists = !!target;
    if (!targetExists) return json(404, { error: "player_not_found" });

    const { data: blocks, error: blockError } = await admin.from("player_blocks")
      .select("blocker_id,blocked_id")
      .or("and(blocker_id.eq." + user.id + ",blocked_id.eq." + targetUserId + "),and(blocker_id.eq." + targetUserId + ",blocked_id.eq." + user.id + ")");
    if (blockError) return json(500, { error: "block_check_failed" });
    if ((blocks ?? []).length) return json(403, { error: "messaging_blocked" });
  }

  const { data: conversation, error: createError } = await admin.from("conversations")
    .insert({ kind, title: title || null, created_by: user.id })
    .select("id,kind,title,created_by,created_at").single();
  if (createError) return json(500, { error: "conversation_create_failed" });

  const memberIds = kind === "direct" ? [user.id, targetUserId] : [user.id];
  const { error: memberError } = await admin.from("conversation_members")
    .insert(memberIds.map((user_id) => ({ conversation_id: conversation.id, user_id })));
  if (memberError) {
    await admin.from("conversations").delete().eq("id", conversation.id);
    return json(500, { error: "conversation_membership_create_failed" });
  }
  return json(201, { conversation, memberIds });
});
