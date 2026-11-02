"use server";

import { revalidatePath } from "next/cache";
import { describeError } from "@/core/ai/client";
import { buildHistory, type StoredToolResult } from "@/core/ai/conversation";
import { findConversation, logResult, readLog } from "@/core/ai/log";
import { getProfile, missingAcceptances } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toolCallSchema } from "@/lib/validations/assistant";
import { DECLINED } from "./assistant";
import { assistantConversation, isFailure } from "./queries";
import { toolsFor } from "./tools";
import type { AssistantConversation } from "./types";

// The person answers an action proposed by the assistant (SPEC-V2 section
// 12, ConfirmActionCard): « Confirmer » runs the tool with their session
// (RLS), which writes its change and its result in the log in one
// transaction (ai_listing_update); « Annuler » runs nothing. An action is
// answered once: a second click, another tab or a message written meanwhile
// finds it answered, and nothing more is written. Once every action of the
// answer is answered, the browser asks the route /api/ai/chat to go on (a
// stream, which a server action does not give, CLAUDE.md section 8).

export type ToolCallResult =
  | {
      ok: true;
      data: {
        /** What became of the action: run, failed (nothing written) or cancelled. */
        outcome: "confirmed" | "error" | "declined";
        /** Actions of the same answer still waiting: 0, the turn may go on. */
        remaining: number;
      };
    }
  | { ok: false; error: "auth" | "conditions" | "invalid" | "not_found" | "unavailable" };

/** The output of a tool that writes when the call was answered meanwhile. */
const answered = (output: unknown) =>
  typeof output === "object" && output !== null && "answered" in output && output.answered === true;

async function answer(input: unknown, confirm: boolean): Promise<ToolCallResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if ((await missingAcceptances(profile.id)).length > 0) return { ok: false, error: "conditions" };
  const parsed = toolCallSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { conversationId, toolCallId } = parsed.data;

  const supabase = await createClient();
  const conversation = await findConversation(supabase, profile.id, conversationId);
  if (!conversation.ok) return { ok: false, error: "unavailable" };
  if (!conversation.data || !profile.roles.includes(conversation.data.context)) {
    return { ok: false, error: "not_found" };
  }
  const log = await readLog(supabase, conversationId);
  if (!log.ok) return { ok: false, error: "unavailable" };
  const pending = buildHistory(log.data, { maxTurns: 1 }).pending;
  const call = pending.find((candidate) => candidate.id === toolCallId);
  // Already answered, or not an action of the last answer.
  if (!call) return { ok: false, error: "not_found" };
  const remaining = pending.length - 1;

  const context = conversation.data.context;
  const tool = toolsFor(context).find(
    (candidate) => candidate.name === call.name && candidate.requiresConfirmation,
  );
  if (!tool) return { ok: false, error: "not_found" };

  if (!confirm) {
    const declined: StoredToolResult = {
      type: "tool_result",
      tool_use_id: call.id,
      name: call.name,
      status: "declined",
      result: DECLINED,
    };
    const logged = await logResult(supabase, conversationId, declined);
    if (logged === "failed") return { ok: false, error: "unavailable" };
    if (logged === "duplicate") return { ok: false, error: "not_found" };
    return { ok: true, data: { outcome: "declined", remaining } };
  }

  const toolInput = tool.input.safeParse(call.input);
  let output: unknown;
  if (!toolInput.success) {
    output = { updated: false, error: "Invalid input: nothing was changed." };
  } else {
    try {
      output = await tool.execute(toolInput.data, {
        profileId: profile.id,
        context,
        stepCode: null,
        call: { conversationId, toolUseId: call.id, name: call.name },
      });
    } catch (error) {
      console.error("[ai] confirmed tool failed", {
        user_id: profile.id,
        entity_id: conversationId,
        tool: call.name,
        error: describeError(error),
      });
      output = { updated: false, error: "The change could not be made: nothing was changed." };
    }
  }
  // Answered meanwhile (a second click, another tab, a new message): nothing written.
  if (answered(output)) return { ok: false, error: "not_found" };
  if (!isFailure(output)) {
    // Written with its result in the log. The pages of the seller show it (L1-14b).
    revalidatePath("/vendeur", "layout");
    return { ok: true, data: { outcome: "confirmed", remaining } };
  }
  // Nothing written: the reason in the log, for the model and the person.
  const failed: StoredToolResult = {
    type: "tool_result",
    tool_use_id: call.id,
    name: call.name,
    status: "confirmed",
    result: output,
  };
  const logged = await logResult(supabase, conversationId, failed);
  if (logged === "failed") return { ok: false, error: "unavailable" };
  if (logged === "duplicate") return { ok: false, error: "not_found" };
  return { ok: true, data: { outcome: "error", remaining } };
}

/** « Confirmer »: the action runs, with the session of the person. */
export async function confirmToolCall(input: unknown): Promise<ToolCallResult> {
  return answer(input, true);
}

/** « Annuler »: nothing runs; the assistant reads that nothing changed. */
export async function declineToolCall(input: unknown): Promise<ToolCallResult> {
  return answer(input, false);
}

/** The last conversation of the seller with the assistant, to open it again (the panel). */
export async function loadAssistantConversation(): Promise<
  { ok: true; data: AssistantConversation } | { ok: false; error: "auth" | "unavailable" }
> {
  const profile = await getProfile();
  if (!profile || !profile.roles.includes("seller")) return { ok: false, error: "auth" };
  const conversation = await assistantConversation(profile.id, "seller");
  return conversation.ok ? conversation : { ok: false, error: "unavailable" };
}
