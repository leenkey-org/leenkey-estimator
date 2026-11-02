import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// The log of a conversation with the assistant (ai_messages, SPEC-V2
// section 12) and the history sent back to the model from it. A row per
// message of the person (with the file of the person at that moment, sent
// as a system message after it), per answer of the model (its blocks as
// returned, thinking included, with the model and the tokens) and per result
// of a tool. The log only grows: the history is rebuilt the same way at each
// call, so that the model reads the same bytes again (prompt caching) and
// its thinking blocks stay valid (they are tied to an unchanged history).

export type ToolStatus = "done" | "confirmed" | "declined" | "superseded" | "error";

const textBlock = z.object({ type: z.literal("text"), text: z.string() }).passthrough();
const thinkingBlock = z
  .object({ type: z.literal("thinking"), thinking: z.string(), signature: z.string() })
  .passthrough();
const redactedThinkingBlock = z
  .object({ type: z.literal("redacted_thinking"), data: z.string() })
  .passthrough();
const toolUseBlock = z
  .object({
    type: z.literal("tool_use"),
    id: z.string().min(1).max(200),
    name: z.string().min(1).max(100),
    input: z.record(z.unknown()),
  })
  .passthrough();
const assistantBlock = z.discriminatedUnion("type", [
  textBlock,
  thinkingBlock,
  redactedThinkingBlock,
  toolUseBlock,
]);

export const storedUser = z.object({
  type: z.literal("user"),
  text: z.string(),
  /** The file of the person when the message was sent: given to the model after it. */
  context: z.string().nullable(),
});
export const storedAssistant = z.object({
  type: z.literal("assistant"),
  blocks: z.array(assistantBlock),
  stopReason: z.string().nullable(),
});
export const storedToolResult = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string().min(1).max(200),
  name: z.string(),
  status: z.enum(["done", "confirmed", "declined", "superseded", "error"]),
  /** What the model reads: the output of the tool, or why it did not run. */
  result: z.unknown(),
});

export type StoredUser = z.infer<typeof storedUser>;
export type StoredAssistant = z.infer<typeof storedAssistant>;
export type StoredToolResult = z.infer<typeof storedToolResult>;
export type AssistantBlock = z.infer<typeof assistantBlock>;
export type ToolUse = z.infer<typeof toolUseBlock>;

/** A row of ai_messages, as read with the session of the person. */
export type LogRow = { role: string; content: unknown };

/** One row read back: its content checked (the log is the person's to write, RLS). */
type Entry =
  | { role: "user"; content: StoredUser }
  | { role: "assistant"; content: StoredAssistant }
  | { role: "tool"; content: StoredToolResult };

function readRow(row: LogRow): Entry | null {
  if (row.role === "user") {
    const content = storedUser.safeParse(row.content);
    return content.success ? { role: "user", content: content.data } : null;
  }
  if (row.role === "assistant") {
    const content = storedAssistant.safeParse(row.content);
    return content.success ? { role: "assistant", content: content.data } : null;
  }
  if (row.role === "tool") {
    const content = storedToolResult.safeParse(row.content);
    return content.success ? { role: "tool", content: content.data } : null;
  }
  return null;
}

/** The blocks of an answer as they are kept in the log (and sent back). */
export function toStoredBlocks(content: Anthropic.ContentBlock[]): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  for (const block of content) {
    const parsed = assistantBlock.safeParse(block);
    if (parsed.success) blocks.push(parsed.data);
  }
  return blocks;
}

/** What the model reads of a result. */
export function toolResultBlock(result: StoredToolResult): Anthropic.ToolResultBlockParam {
  return {
    type: "tool_result",
    tool_use_id: result.tool_use_id,
    content: typeof result.result === "string" ? result.result : JSON.stringify(result.result),
    is_error: result.status === "error" ? true : undefined,
  };
}

/** Answer to a call left without a result (a turn cut short): the model reads it did not run. */
function notRun(toolUse: ToolUse): StoredToolResult {
  return {
    type: "tool_result",
    tool_use_id: toolUse.id,
    name: toolUse.name,
    status: "error",
    result: "Not run: the conversation went on without this action.",
  };
}

const isThinking = (block: AssistantBlock) =>
  block.type === "thinking" || block.type === "redacted_thinking";

type Turn = { entries: Entry[] };

function turnsOf(rows: readonly LogRow[]): Turn[] {
  const turns: Turn[] = [];
  for (const row of rows) {
    const entry = readRow(row);
    if (!entry) continue;
    if (entry.role === "user") turns.push({ entries: [entry] });
    // Before the first message of the person: nothing to attach to.
    else if (turns.length > 0) turns[turns.length - 1].entries.push(entry);
  }
  return turns;
}

export type History = {
  messages: Anthropic.MessageParam[];
  /** Calls of the last answer still waiting for the person (to confirm). */
  pending: ToolUse[];
  /** Turns left out at the start (the window): their thinking is not sent back. */
  truncated: boolean;
};

/**
 * The history sent to the model: the last `maxTurns` turns (a message of the
 * person and what followed), the current one always whole. Within a turn,
 * every call of a tool gets its result in the next message, all of them
 * together; a call left without one (a turn cut short) reads « not run »,
 * except the calls of the very last answer, which wait for the person
 * (`pending`). A former turn without an answer (an error) is left out: the
 * person saw the error. Thinking blocks go back as returned, except when
 * turns were left out at the start (the history is no longer the one they
 * were written with: those of the former turns are dropped) or when asked
 * (`withoutThinking`, a history refused by the API).
 */
export function buildHistory(
  rows: readonly LogRow[],
  { maxTurns = 10, withoutThinking = false }: { maxTurns?: number; withoutThinking?: boolean } = {},
): History {
  const all = turnsOf(rows);
  const kept = all.slice(-maxTurns);
  const truncated = kept.length < all.length;
  const messages: Anthropic.MessageParam[] = [];
  let pending: ToolUse[] = [];

  kept.forEach((turn, index) => {
    const current = index === kept.length - 1;
    const turnMessages: Anthropic.MessageParam[] = [];
    const dropThinking = withoutThinking || (truncated && !current);

    let open: ToolUse[] = [];
    let results: StoredToolResult[] = [];
    // The results of the calls of the previous answer, each call answered once.
    const flush = (closing: boolean): Anthropic.ToolResultBlockParam[] => {
      const blocks: Anthropic.ToolResultBlockParam[] = [];
      for (const call of open) {
        const result = results.find((candidate) => candidate.tool_use_id === call.id);
        if (result) blocks.push(toolResultBlock(result));
        else if (closing) blocks.push(toolResultBlock(notRun(call)));
      }
      return blocks;
    };

    for (const entry of turn.entries) {
      if (entry.role === "user") {
        turnMessages.push({ role: "user", content: entry.content.text });
        if (entry.content.context) {
          turnMessages.push({ role: "system", content: entry.content.context });
        }
      } else if (entry.role === "tool") {
        results.push(entry.content);
      } else {
        const answers = flush(true);
        if (answers.length > 0) turnMessages.push({ role: "user", content: answers });
        const blocks = dropThinking
          ? entry.content.blocks.filter((block) => !isThinking(block))
          : entry.content.blocks;
        // Thinking alone, dropped: nothing left to send of this answer.
        if (blocks.length === 0) continue;
        turnMessages.push({ role: "assistant", content: blocks });
        open = blocks.filter((block): block is ToolUse => block.type === "tool_use");
        results = [];
      }
    }

    if (open.length > 0) {
      const waiting = open.filter(
        (call) => !results.some((result) => result.tool_use_id === call.id),
      );
      if (current && waiting.length > 0) {
        // The answers already given wait with the others: sent together.
        pending = waiting;
      } else {
        const answers = flush(!current);
        if (answers.length > 0) turnMessages.push({ role: "user", content: answers });
      }
    }

    // A former turn without an answer left (an error, or thinking alone):
    // the person saw the error; its system message would come before the
    // next message of the person, which the API refuses.
    if (current || turnMessages.some((message) => message.role === "assistant")) {
      messages.push(...turnMessages);
    }
  });

  return { messages, pending, truncated };
}

/** Whether a history sends thinking blocks back (to retry without them when refused). */
export function hasThinking(messages: readonly Anthropic.MessageParam[]): boolean {
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      Array.isArray(message.content) &&
      message.content.some(
        (block) => block.type === "thinking" || block.type === "redacted_thinking",
      ),
  );
}

/** A line of the conversation as the person sees it again. */
export type DisplayItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | {
      kind: "action";
      toolCallId: string;
      name: string;
      input: Record<string, unknown>;
      /** pending: waits for the person (the calls of the last answer only). */
      state: ToolStatus | "pending";
      /** The output of the tool, once run. */
      result: unknown;
    };

/**
 * The conversation as the person sees it: their messages, the text of the
 * answers, and the actions to confirm (`confirmable`: the tools that write)
 * with what became of them. The tools that read stay out of sight.
 */
export function displayItems(
  rows: readonly LogRow[],
  confirmable: (name: string) => boolean,
): DisplayItem[] {
  const entries = rows.map(readRow).filter((entry): entry is Entry => entry !== null);
  const results = new Map<string, StoredToolResult>();
  for (const entry of entries) {
    if (entry.role === "tool") results.set(entry.content.tool_use_id, entry.content);
  }
  const lastIndex = (role: Entry["role"]) =>
    entries.reduce((last, entry, index) => (entry.role === role ? index : last), -1);
  const lastAnswer = lastIndex("assistant");
  const lastUser = lastIndex("user");
  const items: DisplayItem[] = [];
  entries.forEach((entry, index) => {
    if (entry.role === "user") {
      items.push({ kind: "user", text: entry.content.text });
      return;
    }
    if (entry.role !== "assistant") return;
    const text = entry.content.blocks
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    if (text) items.push({ kind: "assistant", text });
    for (const block of entry.content.blocks) {
      if (block.type !== "tool_use" || !confirmable(block.name)) continue;
      const result = results.get(block.id);
      const waiting = index === lastAnswer && index > lastUser;
      items.push({
        kind: "action",
        toolCallId: block.id,
        name: block.name,
        input: block.input,
        state: result ? result.status : waiting ? "pending" : "superseded",
        result: result?.result ?? null,
      });
    }
  });
  return items;
}
