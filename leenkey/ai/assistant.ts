import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { isAiMock, streamModel, type ModelCall } from "@/core/ai/client";
import { buildHistory, type StoredToolResult } from "@/core/ai/conversation";
import { knowledgeCards } from "@/core/ai/knowledge";
import { findConversation, logResult, logUser, openConversation, readLog } from "@/core/ai/log";
import { MODELS } from "@/core/ai/models";
import { systemPrompt } from "@/core/ai/prompts";
import { dailyLimit } from "@/core/ai/quotas";
import type { AnyAiTool, ToolContext } from "@/core/ai/tools/types";
import type { SessionProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ChatRequest } from "@/lib/validations/assistant";
import { sellerContextText } from "./context";
import { mockModel } from "./mock";
import { sellerFile } from "./seller-data";
import { toolsFor } from "./tools";

// A turn of the assistant of the seller (L1-28), prepared before the answer
// streams (app/api/ai/chat/route.ts): the conversation (found or opened), the
// message of the person counted against their daily limit and logged with
// their file, the history, the system prompt with the FAQ, the tools.

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** History of a turn: the last 10 messages of the person and what followed each (SPEC: about 20 messages). */
export const HISTORY_TURNS = 10;

/** What the model reads of an action the person did not confirm. */
export const DECLINED = "The seller cancelled this action: nothing was changed.";
export const SUPERSEDED =
  "The seller wrote a new message instead of confirming: nothing was changed.";

export type PreparedTurn = {
  conversationId: string;
  supabase: Supabase;
  model: string;
  callModel: ModelCall;
  system: string;
  tools: AnyAiTool[];
  messages: Anthropic.MessageParam[];
  ctx: ToolContext;
};

export type PrepareError =
  | { error: "not_found" | "pending" | "nothing" | "unavailable" | "invalid" }
  | { error: "quota"; limit: number };

export async function prepareTurn(
  profile: SessionProfile,
  request: ChatRequest,
): Promise<{ ok: true; data: PreparedTurn } | ({ ok: false } & PrepareError)> {
  const supabase = await createClient();
  const context = request.context;

  let conversationId = request.conversationId ?? null;
  // The property of the conversation: given when it opens, kept after.
  let about = request.propertyId ?? null;
  if (conversationId) {
    const found = await findConversation(supabase, profile.id, conversationId);
    if (!found.ok) return { ok: false, error: "unavailable" };
    if (!found.data || found.data.context !== context) return { ok: false, error: "not_found" };
    about = found.data.entityId;
  }

  const cards = await knowledgeCards(context);
  if (!cards.ok) return { ok: false, error: "unavailable" };

  if ("message" in request) {
    const file = await sellerFile(profile.id);
    if (!file) return { ok: false, error: "unavailable" };
    const propertyId = about;
    if (propertyId && !file.properties.some((property) => property.id === propertyId)) {
      // Deleted since the conversation opened: about none of them now.
      if (request.conversationId) about = null;
      else return { ok: false, error: "invalid" };
    }

    // The limit of the day, before anything is written.
    const limit = dailyLimit(profile.roles, {
      hasPaidProperty: file.overview.some((property) => property.plan?.paid === true),
    });
    // No limit (an admin): the largest the function takes, the message still counted.
    const quota = await supabase.rpc("ai_quota_consume", { p_limit: limit ?? 2_147_483_647 });
    if (quota.error) {
      console.error("[ai] quota failed", { user_id: profile.id, code: quota.error.code });
      return { ok: false, error: "unavailable" };
    }
    if (!quota.data[0]?.allowed) return { ok: false, error: "quota", limit: limit ?? 0 };

    if (!conversationId) {
      conversationId = await openConversation(supabase, profile.id, context, about);
      if (!conversationId) return { ok: false, error: "unavailable" };
    } else {
      // Actions left waiting: the person wrote instead of answering them.
      const log = await readLog(supabase, conversationId);
      if (!log.ok) return { ok: false, error: "unavailable" };
      for (const call of buildHistory(log.data, { maxTurns: 1 }).pending) {
        const result: StoredToolResult = {
          type: "tool_result",
          tool_use_id: call.id,
          name: call.name,
          status: "superseded",
          result: SUPERSEDED,
        };
        if ((await logResult(supabase, conversationId, result)) === "failed") {
          return { ok: false, error: "unavailable" };
        }
      }
    }

    const contextText = sellerContextText({
      firstName: profile.firstName,
      now: new Date(),
      overview: file.overview,
      total: file.properties.length,
      propertyId: about,
    });
    const logged = await logUser(supabase, conversationId, {
      type: "user",
      text: request.message,
      context: contextText,
    });
    if (logged !== "ok") return { ok: false, error: "unavailable" };
  }

  if (!conversationId) return { ok: false, error: "not_found" };
  const log = await readLog(supabase, conversationId);
  if (!log.ok) return { ok: false, error: "unavailable" };
  const history = buildHistory(log.data, { maxTurns: HISTORY_TURNS });
  if (history.pending.length > 0) return { ok: false, error: "pending" };
  // A message: the history ends with it (and the file after it). Going on
  // after confirmations: it ends with their results, not yet answered.
  const last = history.messages.at(-1);
  const ready =
    "resume" in request
      ? last?.role === "user" && Array.isArray(last.content)
      : last?.role === "system" || last?.role === "user";
  if (!ready) return { ok: false, error: "nothing" };

  return {
    ok: true,
    data: {
      conversationId,
      supabase,
      model: MODELS.fast,
      callModel: isAiMock() ? mockModel : streamModel,
      system: systemPrompt(context, cards.data),
      tools: toolsFor(context),
      messages: history.messages,
      ctx: { profileId: profile.id, context, stepCode: null },
    },
  };
}
