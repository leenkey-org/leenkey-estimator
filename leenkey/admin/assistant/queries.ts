import "server-only";
import { requireAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AiLogContext } from "@/lib/validations/admin-assistant";
import { entryText } from "./queries-text";

// Reads of /admin/assistant (L1-30d, SPEC-V2 17) with the admin's session:
// the FAQ (RLS of knowledge_base: the team only), the tokens and the log of
// the assistant (SQL functions admin_ai_usage and admin_ai_conversations,
// rights of the caller: is_admin() and the RLS of the log). Each read
// checks the admin role itself.

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type KnowledgeRow = {
  id: string;
  audience: "seller" | "buyer" | "both";
  category: string;
  stepCode: string | null;
  question: string;
  sourceFile: string | null;
  updatedAt: string;
  /** Searchable by meaning: its embedding is computed. */
  embedded: boolean;
};

export type UsageRow = {
  day: string;
  context: string;
  model: string;
  answers: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type AiLogRow = {
  id: string;
  context: AiLogContext;
  kind: string;
  createdAt: string;
  lastAt: string;
  messages: number;
  inputTokens: number;
  outputTokens: number;
  /** null: a visitor without an account, or an account without a name. */
  name: string | null;
  reference: string | null;
  firstQuestion: string | null;
};

/** Conversations of the log shown at most. */
export const AI_LOG_LIMIT = 200;
/** Days of tokens shown. */
export const AI_USAGE_DAYS = 30;

function logFailure(read: string, error: { code?: string; message?: string }, userId: string) {
  console.error(`[admin] assistant ${read} failed`, { user_id: userId, code: error.code });
}

const fullName = (first: string | null, last: string | null) =>
  [first, last].filter(Boolean).join(" ") || null;

export async function adminKnowledge(): Promise<QueryResult<KnowledgeRow[]>> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const [cards, missing] = await Promise.all([
    supabase
      .from("knowledge_base")
      .select("id, audience, category, step_code, question, source_file, updated_at")
      .order("category")
      .order("question"),
    supabase.from("knowledge_base").select("id").is("embedding", null),
  ]);
  if (cards.error || missing.error) {
    logFailure("knowledge", (cards.error ?? missing.error)!, admin.id);
    return { ok: false, error: "unavailable" };
  }
  const without = new Set(missing.data.map((row) => row.id));
  return {
    ok: true,
    data: cards.data.map((row) => ({
      id: row.id,
      audience: row.audience as KnowledgeRow["audience"],
      category: row.category,
      stepCode: row.step_code,
      question: row.question,
      sourceFile: row.source_file,
      updatedAt: row.updated_at,
      embedded: !without.has(row.id),
    })),
  };
}

export async function adminAiUsage(days = AI_USAGE_DAYS): Promise<QueryResult<UsageRow[]>> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ai_usage", { p_days: days });
  if (error) {
    logFailure("usage", error, admin.id);
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: data.map((row) => ({
      day: row.day,
      context: row.context,
      model: row.model,
      answers: Number(row.answers),
      inputTokens: Number(row.input_tokens),
      outputTokens: Number(row.output_tokens),
      cacheReadTokens: Number(row.cache_read_tokens),
      cacheWriteTokens: Number(row.cache_write_tokens),
    })),
  };
}

export async function adminAiConversations(filter: {
  context?: AiLogContext;
  query?: string;
}): Promise<QueryResult<{ rows: AiLogRow[]; limited: boolean }>> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ai_conversations", {
    p_context: filter.context,
    p_query: filter.query,
    p_limit: AI_LOG_LIMIT + 1,
  });
  if (error) {
    // Not the search itself: it may hold what a person wrote.
    logFailure("log", error, admin.id);
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: {
      limited: data.length > AI_LOG_LIMIT,
      rows: data.slice(0, AI_LOG_LIMIT).map((row) => ({
        id: row.id,
        context: row.context as AiLogContext,
        kind: row.kind,
        createdAt: row.created_at,
        lastAt: row.last_at,
        messages: Number(row.messages),
        inputTokens: Number(row.input_tokens),
        outputTokens: Number(row.output_tokens),
        // Generated types declare the columns of a function result as never null.
        name: fullName(row.first_name as string | null, row.last_name as string | null),
        reference: (row.reference as string | null) ?? null,
        firstQuestion: (row.first_question as string | null) || null,
      })),
    },
  };
}

/** A message of the log as the team reads it. */
export type AiLogEntry = {
  id: string;
  role: "user" | "assistant" | "tool";
  /** What was written or answered; for a tool, its name and status. */
  text: string;
  /** What a suggestion or a draft was written from (the request). */
  request: boolean;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
};

export type AiLogDetail = {
  id: string;
  context: AiLogContext;
  kind: string;
  createdAt: string;
  name: string | null;
  profileId: string | null;
  reference: string | null;
  /** Only the latest MESSAGES_MAX messages are shown. */
  limited: boolean;
  entries: AiLogEntry[];
};

const MESSAGES_MAX = 300;

export async function adminAiConversation(id: string): Promise<QueryResult<AiLogDetail | null>> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("ai_conversations")
    .select(
      "id, context, kind, created_at, profile_id, property_id, profile:profiles(first_name, last_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logFailure("conversation", error, admin.id);
    return { ok: false, error: "unavailable" };
  }
  if (!conversation) return { ok: true, data: null };
  const [messages, listing] = await Promise.all([
    supabase
      .from("ai_messages")
      .select("id, role, content, model, input_tokens, output_tokens, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_MAX),
    conversation.property_id
      ? supabase
          .from("listings")
          .select("reference")
          .eq("property_id", conversation.property_id)
          .is("deleted_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (messages.error) {
    logFailure("messages", messages.error, admin.id);
    return { ok: false, error: "unavailable" };
  }
  const profile = Array.isArray(conversation.profile)
    ? conversation.profile[0]
    : conversation.profile;
  return {
    ok: true,
    data: {
      id: conversation.id,
      context: conversation.context as AiLogContext,
      kind: conversation.kind,
      createdAt: conversation.created_at,
      profileId: conversation.profile_id,
      name: profile ? fullName(profile.first_name, profile.last_name) : null,
      reference: listing.data?.reference ?? null,
      // The latest messages of a long conversation, in their order.
      limited: messages.data.length === MESSAGES_MAX,
      entries: messages.data.reverse().map((row) => ({
        id: row.id,
        role: row.role as AiLogEntry["role"],
        ...entryText(row.role, row.content),
        model: row.model,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        createdAt: row.created_at,
      })),
    },
  };
}
