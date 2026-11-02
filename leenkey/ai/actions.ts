"use server";

import { revalidatePath } from "next/cache";
import { buildHistory, type StoredToolResult } from "@/core/ai/conversation";
import { findConversation, logResult, readLog } from "@/core/ai/log";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toolCallSchema } from "@/lib/validations/assistant";
import { DECLINED } from "./assistant";
import { assistantConversation, isFailure } from "./queries";
import { toolsFor } from "./tools";
import type { AssistantConversation } from "./types";

// The person answers an action proposed by the assistant (SPEC-V2 section
// 12, ConfirmActionCard): « Confirmer » runs the tool with their session
// (RLS), « Annuler » runs nothing; the answer is logged once (a second click
// finds it already answered). Once every action of the answer is answered,
// the browser asks the route /api/ai/chat to go on (a stream, which a server
// action does not give, CLAUDE.md section 8).

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
  | { ok: false; error: "auth" | "invalid" | "not_found" | "unavailable" };

async function answer(input: unknown, confirm: boolean): Promise<ToolCallResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
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

  let result: StoredToolResult;
  if (!confirm) {
    result = {
      type: "tool_result",
      tool_use_id: call.id,
      name: call.name,
      status: "declined",
      result: DECLINED,
    };
  } else {
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
        });
      } catch (error) {
        console.error("[ai] confirmed tool failed", {
          user_id: profile.id,
          entity_id: conversationId,
          tool: call.name,
          error: error instanceof Error ? error.message : String(error),
        });
        output = { updated: false, error: "The change could not be made: nothing was changed." };
      }
    }
    result = {
      type: "tool_result",
      tool_use_id: call.id,
      name: call.name,
      status: "confirmed",
      result: output,
    };
  }

  const logged = await logResult(supabase, conversationId, result);
  if (logged === "failed") return { ok: false, error: "unavailable" };
  // Answered meanwhile (a second click, another tab): what was logged first stands.
  if (logged === "duplicate") return { ok: false, error: "not_found" };

  const outcome = !confirm ? "declined" : isFailure(result.result) ? "error" : "confirmed";
  // The listing changed: the pages of the seller show it (L1-14b).
  if (outcome === "confirmed") revalidatePath("/vendeur", "layout");
  return { ok: true, data: { outcome, remaining } };
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
