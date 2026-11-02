import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { AnswerLog } from "./chat";
import { LOG_LIMITS, type LogRow, type StoredToolResult, type StoredUser } from "./conversation";
import type { AiContext } from "./tools/types";

// The log of the assistant (ai_conversations, ai_messages; CLAUDE.md section
// 8: every conversation kept for the admin to read again), written and read
// with the session of the person (RLS: their own conversations; the admin
// reads them all, so the owner is checked here too). The tokens of each
// answer are kept with it: those read from the cache and written to it in
// its content (usage), the columns hold the tokens billed in full.

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The rows of a conversation read back for its history: the last ones, oldest first. */
export const LOG_ROWS_MAX = 300;

export type Conversation = { id: string; context: AiContext; entityId: string | null };

/**
 * What a log holds: the conversation with the assistant, or one suggestion
 * (a reply in the messaging, a description of a listing; L1-29), never
 * reopened as a conversation.
 */
export type LogKind = "chat" | "reply_suggestion" | "listing_description";

const CONTEXTS: readonly AiContext[] = ["seller", "buyer", "admin"];

/** A conversation of the person with the assistant (never someone else's, even for an admin). */
export async function findConversation(
  supabase: Supabase,
  profileId: string,
  conversationId: string,
): Promise<{ ok: true; data: Conversation | null } | { ok: false }> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, context, property_id")
    .eq("id", conversationId)
    .eq("profile_id", profileId)
    .eq("kind", "chat")
    .maybeSingle();
  if (error) {
    console.error("[ai] conversation read failed", { user_id: profileId, code: error.code });
    return { ok: false };
  }
  const context = CONTEXTS.find((candidate) => candidate === data?.context);
  if (!data || !context) return { ok: true, data: null };
  return { ok: true, data: { id: data.id, context, entityId: data.property_id } };
}

/** The last conversation of the person with the assistant in a context, if any. */
export async function lastConversation(
  supabase: Supabase,
  profileId: string,
  context: AiContext,
): Promise<{ ok: true; data: Conversation | null } | { ok: false }> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, context, property_id")
    .eq("profile_id", profileId)
    .eq("context", context)
    .eq("kind", "chat")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[ai] conversation read failed", { user_id: profileId, code: error.code });
    return { ok: false };
  }
  return { ok: true, data: data ? { id: data.id, context, entityId: data.property_id } : null };
}

/** A new conversation; the entity (a property) must be the person's (RLS). */
export async function openConversation(
  supabase: Supabase,
  profileId: string,
  context: AiContext,
  entityId: string | null,
  kind: LogKind = "chat",
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ profile_id: profileId, context, property_id: entityId, kind })
    .select("id")
    .single();
  if (error) {
    console.error("[ai] conversation creation failed", {
      user_id: profileId,
      entity_id: entityId,
      code: error.code,
    });
    return null;
  }
  return data.id;
}

export async function readLog(
  supabase: Supabase,
  conversationId: string,
): Promise<{ ok: true; data: LogRow[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(LOG_ROWS_MAX);
  if (error) {
    console.error("[ai] log read failed", { entity_id: conversationId, code: error.code });
    return { ok: false };
  }
  return { ok: true, data: data.reverse() };
}

async function insert(
  supabase: Supabase,
  row: {
    conversation_id: string;
    role: "user" | "assistant" | "tool";
    content: Json;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
  },
): Promise<"ok" | "duplicate" | "failed"> {
  const { error } = await supabase.from("ai_messages").insert(row);
  if (!error) return "ok";
  if (error.code === "23505") return "duplicate";
  console.error("[ai] log write failed", {
    entity_id: row.conversation_id,
    role: row.role,
    code: error.code,
  });
  return "failed";
}

export function logUser(supabase: Supabase, conversationId: string, content: StoredUser) {
  return insert(supabase, { conversation_id: conversationId, role: "user", content });
}

/**
 * What a suggestion was written from (L1-29): the text given to the model,
 * kept for the admin to read again (bounded like a result of a tool).
 */
export function logRequest(supabase: Supabase, conversationId: string, text: string) {
  return insert(supabase, {
    conversation_id: conversationId,
    role: "user",
    content: { type: "request", text: text.slice(0, LOG_LIMITS.result) },
  });
}

export function logAnswer(supabase: Supabase, conversationId: string, answer: AnswerLog) {
  const { usage } = answer;
  return insert(supabase, {
    conversation_id: conversationId,
    role: "assistant",
    content: {
      type: "assistant",
      blocks: answer.blocks as Json,
      stopReason: answer.stopReason,
      usage: {
        cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
        cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
      },
    },
    model: answer.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
  });
}

/** A result of a tool: once per call (unique index), a second one is "duplicate". */
export function logResult(supabase: Supabase, conversationId: string, result: StoredToolResult) {
  return insert(supabase, {
    conversation_id: conversationId,
    role: "tool",
    content: { ...result, result: (result.result ?? null) as Json },
  });
}
