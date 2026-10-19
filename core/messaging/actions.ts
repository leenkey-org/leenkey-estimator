"use server";

import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  conversationIdSchema,
  messageSchema,
  messagesSinceSchema,
  reportSchema,
} from "@/lib/validations/messaging";
import { sendErrorOf } from "./errors";
import { listThreadMessages } from "./queries";
import { toThreadMessage, type SendError, type ThreadMessage } from "./types";

// Messaging actions (L1-21), with the session of the participant: RLS lets
// only the participants of an open conversation write in it, and the
// database applies the anti-abuse limits (SPEC-V2 8.6). No revalidatePath
// (CLAUDE.md section 9, exception): the conversation keeps its messages in
// the browser and receives the new one in the answer; the list follows the
// conversations through Realtime.

const MESSAGE_COLUMNS = "id, conversation_id, sender_id, body, kind, created_at";

/** The body refused by the schema: empty, or longer than 4 000 characters. */
function invalidBody(issues: { message: string; path: PropertyKey[] }[]): SendError {
  return issues.some((issue) => issue.path[0] === "body" && issue.message === "tooLong")
    ? "tooLong"
    : "empty";
}

export async function sendMessage(
  input: unknown,
): Promise<{ ok: true; data: ThreadMessage } | { ok: false; error: SendError }> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: invalidBody(parsed.error.issues) };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const { conversationId, body } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: profile.id, body })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) {
    let reason = sendErrorOf(error);
    // RLS refuses a closed conversation as an account that may no longer write.
    if (reason === "inactive") {
      const conversation = await supabase
        .from("conversations")
        .select("closed_at")
        .eq("id", conversationId)
        .maybeSingle();
      if (conversation.data?.closed_at) reason = "closed";
    }
    if (reason === "unavailable") {
      console.error("[messaging] message not sent", {
        user_id: profile.id,
        entity_id: conversationId,
        code: error.code,
      });
    }
    return { ok: false, error: reason };
  }
  return { ok: true, data: toThreadMessage(data) };
}

/** The participant read the conversation up to now (its unread mark goes). */
export async function markConversationRead(
  conversationId: unknown,
): Promise<{ ok: true; data: null } | { ok: false; error: "invalid" | "auth" | "unavailable" }> {
  const parsed = conversationIdSchema.safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("conversation_mark_read", {
    p_conversation_id: parsed.data,
  });
  if (error) {
    console.error("[messaging] mark read failed", {
      user_id: profile.id,
      entity_id: parsed.data,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: null };
}

/**
 * The messages of a conversation after a date: those sent while the page
 * was being opened, or while Realtime was reconnecting.
 */
export async function messagesSince(
  conversationId: unknown,
  after: unknown,
): Promise<
  { ok: true; data: ThreadMessage[] } | { ok: false; error: "invalid" | "auth" | "unavailable" }
> {
  const parsed = messagesSinceSchema.safeParse({ conversationId, after });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  return listThreadMessages(parsed.data.conversationId, { after: parsed.data.after });
}

/**
 * A participant reports the conversation, with a reason (SPEC-V2 8.6 and 17).
 * One open report per participant and conversation: a second one, while the
 * team has not dealt with the first, is already sent.
 */
export async function reportConversation(
  input: unknown,
): Promise<
  { ok: true; data: null } | { ok: false; error: "tooShort" | "tooLong" | "auth" | "unavailable" }
> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.message === "tooLong");
    return { ok: false, error: tooLong ? "tooLong" : "tooShort" };
  }
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const { conversationId, reason } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .insert({ conversation_id: conversationId, reporter_id: profile.id, reason });
  // 23505: their open report of this conversation is already with the team.
  if (error && error.code !== "23505") {
    console.error("[messaging] report not saved", {
      user_id: profile.id,
      entity_id: conversationId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: null };
}
