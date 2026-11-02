import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { isBadRequest, type ModelCall, type ModelRequest } from "./client";
import {
  hasThinking,
  notRun,
  toStoredBlocks,
  toolResultBlock,
  type AssistantBlock,
  type StoredToolResult,
  type ToolUse,
} from "./conversation";
import { CHAT_SETTINGS } from "./models";
import type { AnyAiTool, ToolContext } from "./tools/types";

// One turn of the assistant (SPEC-V2 section 12): the model streams its
// answer; the tools that read run at once and the model goes on with their
// results; a tool that writes stops the turn and waits for the person, who
// sees the change (event confirm) and confirms or not (leenkey/ai/actions.ts);
// the turn then goes on from the log. Every answer and every result is
// logged as it comes (ai_messages, with the model and the tokens).

export type ChatEvent =
  | { type: "text"; delta: string }
  /** A tool that reads is running (« Je consulte votre dossier… »). */
  | { type: "tool"; name: string }
  /** A tool that writes waits for the person: what it will change. */
  | { type: "confirm"; toolCallId: string; name: string; preview: unknown }
  | { type: "done"; reason: "end" | "confirm" | "limit" | "length" }
  | { type: "error"; error: "refused" | "unavailable" };

export type AnswerLog = {
  blocks: AssistantBlock[];
  stopReason: string | null;
  model: string;
  usage: Anthropic.Usage;
};

/** Writes the log; false when it could not: the turn stops (its history would be wrong). */
export type TurnLog = {
  answer(answer: AnswerLog): Promise<boolean>;
  result(result: StoredToolResult): Promise<boolean>;
};

export type TurnInput = {
  model: string;
  callModel: ModelCall;
  /** The system prompt: the same bytes at each call (cached). */
  system: string;
  /** The tools of the context, offered to the model. */
  tools: readonly AnyAiTool[];
  /** The history (buildHistory), ending with a message of the person or results of tools. */
  messages: Anthropic.MessageParam[];
  ctx: ToolContext;
  log: TurnLog;
  emit(event: ChatEvent): void;
  signal?: AbortSignal;
};

/** The tools as the model reads them, by name: the same bytes at each call. */
export function toolDefinitions(tools: readonly AnyAiTool[]): Anthropic.Tool[] {
  return tools
    .flatMap((tool) =>
      tool.inputSchema
        ? [
            {
              name: tool.name,
              description: tool.description,
              input_schema: tool.inputSchema,
              strict: true,
            },
          ]
        : [],
    )
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** The request of one call: the prompt and the tools cached, then the conversation. */
export function chatRequest(
  model: string,
  system: string,
  tools: readonly AnyAiTool[],
  messages: Anthropic.MessageParam[],
): ModelRequest {
  const definitions = toolDefinitions(tools);
  return {
    model,
    max_tokens: CHAT_SETTINGS.maxTokens,
    // One breakpoint at the end of the prompt (the tools come before it),
    // which the conversation does not move; the conversation itself cached
    // by the automatic breakpoint, which follows it.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    ...(definitions.length > 0 ? { tools: definitions } : {}),
    messages,
    thinking: { type: "adaptive" },
    output_config: { effort: CHAT_SETTINGS.effort },
    cache_control: { type: "ephemeral" },
  };
}

/** The history without its thinking blocks; an answer of thinking alone is left out. */
const withoutThinking = (messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] =>
  messages.flatMap((message) => {
    if (message.role !== "assistant" || !Array.isArray(message.content)) return [message];
    const content = message.content.filter(
      (block) => block.type !== "thinking" && block.type !== "redacted_thinking",
    );
    return content.length > 0 ? [{ ...message, content }] : [];
  });

function isAbort(error: unknown, signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === "AbortError");
}

const errorResult = (call: ToolUse, message: string): StoredToolResult => ({
  type: "tool_result",
  tool_use_id: call.id,
  name: call.name,
  status: "error",
  result: message,
});

/**
 * Runs a tool that reads, or checks a tool that writes and reads what it
 * would change (preview). The input is checked by the Zod schema of the tool
 * first, whatever the model sent.
 */
async function prepareCall(
  call: ToolUse,
  tools: readonly AnyAiTool[],
  ctx: ToolContext,
): Promise<{ result: StoredToolResult } | { confirm: unknown }> {
  const tool = tools.find((candidate) => candidate.name === call.name);
  if (!tool || !tool.contexts.includes(ctx.context)) {
    return { result: errorResult(call, `Unknown tool: ${call.name}.`) };
  }
  const input = tool.input.safeParse(call.input);
  if (!input.success) {
    const issues = input.error.issues
      .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; ");
    return { result: errorResult(call, `Invalid input (${issues}).`) };
  }
  try {
    if (tool.requiresConfirmation) {
      if (!tool.preview) return { result: errorResult(call, "This action is not available.") };
      const preview = await tool.preview(input.data, ctx);
      return preview.ok ? { confirm: preview.data } : { result: errorResult(call, preview.error) };
    }
    const output = await tool.execute(input.data, ctx);
    return {
      result: {
        type: "tool_result",
        tool_use_id: call.id,
        name: call.name,
        status: "done",
        result: output,
      },
    };
  } catch (error) {
    console.error("[ai] tool failed", {
      user_id: ctx.profileId,
      tool: call.name,
      error: error instanceof Error ? error.message : String(error),
    });
    return { result: errorResult(call, "The data could not be read. Try again later.") };
  }
}

export async function runTurn(input: TurnInput): Promise<void> {
  const { model, callModel, system, tools, ctx, log, emit, signal } = input;
  let messages = input.messages;
  let retried = false;

  for (let step = 0; step < CHAT_SETTINGS.maxSteps; step += 1) {
    let message: Anthropic.Message;
    try {
      message = await callModel(chatRequest(model, system, tools, messages), {
        onText: (delta) => emit({ type: "text", delta }),
        signal,
      });
    } catch (error) {
      if (isAbort(error, signal)) return;
      // A history the API refuses with its thinking blocks (the prompt
      // changed since they were written: a new FAQ): once more without them.
      if (isBadRequest(error) && !retried && hasThinking(messages)) {
        retried = true;
        messages = withoutThinking(messages);
        step -= 1;
        continue;
      }
      console.error("[ai] model call failed", {
        user_id: ctx.profileId,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
      emit({ type: "error", error: "unavailable" });
      return;
    }

    const blocks = toStoredBlocks(message.content);
    const kept = await log.answer({
      blocks,
      stopReason: message.stop_reason,
      model: message.model,
      usage: message.usage,
    });
    if (!kept) {
      emit({ type: "error", error: "unavailable" });
      return;
    }

    const calls = blocks.filter((block): block is ToolUse => block.type === "tool_use");
    // A refused answer, or one cut off by its length: its calls never run,
    // and are answered at once (never offered to confirm later).
    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") {
      for (const call of calls) await log.result(notRun(call));
      emit(
        message.stop_reason === "refusal"
          ? { type: "error", error: "refused" }
          : { type: "done", reason: "length" },
      );
      return;
    }
    if (calls.length === 0) {
      emit({ type: "done", reason: "end" });
      return;
    }

    const results: StoredToolResult[] = [];
    let waiting = false;
    for (const call of calls) {
      const tool = tools.find((candidate) => candidate.name === call.name);
      if (tool && !tool.requiresConfirmation) emit({ type: "tool", name: call.name });
      const prepared = await prepareCall(call, tools, ctx);
      if ("confirm" in prepared) {
        waiting = true;
        emit({ type: "confirm", toolCallId: call.id, name: call.name, preview: prepared.confirm });
      } else {
        if (!(await log.result(prepared.result))) {
          emit({ type: "error", error: "unavailable" });
          return;
        }
        results.push(prepared.result);
      }
    }
    // The results already given wait with the actions to confirm: the
    // turn goes on once the person has answered them all.
    if (waiting) {
      emit({ type: "done", reason: "confirm" });
      return;
    }
    messages = [
      ...messages,
      { role: "assistant", content: blocks },
      { role: "user", content: results.map(toolResultBlock) },
    ];
  }
  emit({ type: "done", reason: "limit" });
}
