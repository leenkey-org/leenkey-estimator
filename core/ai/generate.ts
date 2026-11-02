import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { describeError, type ModelRequest } from "./client";
import { SUGGESTION_SETTINGS } from "./models";

// One text written by the model in a single call, not streamed (SPEC-V2
// section 12: the suggestions of the assistant). The caller gives the call
// (createModelMessage, or the scripted model of the tests) and logs the
// message, whatever came of it: its tokens are billed.

/** One call of the model, the whole message at once. */
export type TextCall = (request: ModelRequest) => Promise<Anthropic.Message>;

export type GenerateError = "refused" | "unavailable";

export type Generation =
  | { ok: true; text: string; message: Anthropic.Message }
  | { ok: false; error: GenerateError; message: Anthropic.Message | null };

/** The request of a text: its rules (system), what to write from (prompt). */
export function textRequest(model: string, system: string, prompt: string): ModelRequest {
  return {
    model,
    max_tokens: SUGGESTION_SETTINGS.maxTokens,
    system: [{ type: "text", text: system }],
    messages: [{ role: "user", content: prompt }],
    thinking: { type: "adaptive" },
    output_config: { effort: SUGGESTION_SETTINGS.effort },
  };
}

/** The visible text of a message, thinking left out. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
}

export async function generateText(
  call: TextCall,
  request: ModelRequest,
  log: { userId: string; kind: string },
): Promise<Generation> {
  let message: Anthropic.Message;
  try {
    message = await call(request);
  } catch (error) {
    console.error("[ai] model call failed", {
      user_id: log.userId,
      kind: log.kind,
      error: describeError(error),
    });
    return { ok: false, error: "unavailable", message: null };
  }
  if (message.stop_reason === "refusal") return { ok: false, error: "refused", message };
  const text = textOf(message);
  // Cut off by its length, or nothing written: no suggestion half written.
  if (message.stop_reason === "max_tokens" || text === "") {
    console.error("[ai] no text written", {
      user_id: log.userId,
      kind: log.kind,
      stop_reason: message.stop_reason,
    });
    return { ok: false, error: "unavailable", message };
  }
  return { ok: true, text, message };
}
