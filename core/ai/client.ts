import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// The one client of the Anthropic API (CLAUDE.md section 8): nowhere else
// calls the SDK. The key (ANTHROPIC_API_KEY) is read by the SDK on the
// server only. AI_MOCK=1 (end-to-end tests): no call leaves, the caller
// gives a scripted model instead (never in production).

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

/** Deterministic answers for the end-to-end tests, never in production. */
export function isAiMock(): boolean {
  return process.env.AI_MOCK === "1" && process.env.NEXT_PUBLIC_ENV !== "production";
}

/** A key, or the deterministic answers of the tests. */
export function isAiConfigured(): boolean {
  return isAiMock() || Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ModelRequest = Omit<Anthropic.MessageCreateParamsNonStreaming, "stream">;

export type ModelHandlers = {
  /** Each piece of the visible answer, as it is written. */
  onText(delta: string): void;
  signal?: AbortSignal;
};

/** One call of the model, streamed: the text as it comes, then the whole message. */
export type ModelCall = (
  request: ModelRequest,
  handlers: ModelHandlers,
) => Promise<Anthropic.Message>;

export const streamModel: ModelCall = async (request, { onText, signal }) => {
  const stream = anthropic().messages.stream(request, { signal });
  stream.on("text", onText);
  return stream.finalMessage();
};

/** A request refused as written (400): the history replayed is not accepted. */
export function isBadRequest(error: unknown): boolean {
  return error instanceof Anthropic.BadRequestError;
}
