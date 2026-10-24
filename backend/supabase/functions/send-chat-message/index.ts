import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

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
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const messageText = typeof body.text === "string" ? body.text.trim() : "";
  if (!conversationId) return json(400, { error: "conversation_required" });
  if (!messageText || messageText.length > 500) return json(400, { error: "message_must_be_1_to_500_characters" });

  // Service role is server-only. All authorization checks below happen before insert.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: membership, error: membershipError } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) return json(500, { error: "membership_check_failed" });
  if (!membership) return json(403, { error: "conversation_membership_required" });

  const { data: members, error: membersError } = await admin
    .from("conversation_members").select("user_id")
    .eq("conversation_id", conversationId);
  if (membersError) return json(500, { error: "conversation_members_check_failed" });

  const otherIds = (members ?? []).map((m: { user_id: string }) => m.user_id).filter((id: string) => id !== user.id);
  if (otherIds.length > 0) {
    const { data: blocks, error: blockError } = await admin.from("player_blocks")
      .select("blocker_id,blocked_id")
      .or("and(blocker_id.eq." + user.id + ",blocked_id.in.(" + otherIds.join(",") + ")),and(blocked_id.eq." + user.id + ",blocker_id.in.(" + otherIds.join(",") + "))");
    if (blockError) return json(500, { error: "block_check_failed" });
    if ((blocks ?? []).length > 0) return json(403, { error: "messaging_blocked" });
  }

  // TODO before production: persist per-user rate-limit counters and apply spam/moderation checks.
  const { data: message, error: insertError } = await admin.from("chat_messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: messageText })
    .select("id,conversation_id,sender_id,body,created_at").single();
  if (insertError) {
    console.error("chat insert failed", { code: insertError.code });
    return json(500, { error: "message_send_failed" });
  }
  return json(201, { message });
});
