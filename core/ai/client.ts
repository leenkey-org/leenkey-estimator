import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// The one client of the Anthropic API (CLAUDE.md section 8): nowhere else
// calls the SDK. The key (ANTHROPIC_API_KEY) is read on the server only,
// without the spaces and line breaks a copy may add (a header refuses them).
// AI_MOCK=1 (end-to-end tests): no call leaves, the caller gives a scripted
// model instead (never in production). An error of the SDK may hold the key
// (an invalid header is quoted whole): it is logged by its kind and status
// only (describeError), never by its message.

let client: Anthropic | null = null;

/** The key as stored, without any space or line break; undefined without one. */
export function apiKey(
  raw: string | undefined = process.env.ANTHROPIC_API_KEY,
): string | undefined {
  const key = raw?.replace(/\s+/g, "");
  return key ? key : undefined;
}

function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: apiKey(), maxRetries: 2, timeout: 60_000 });
  return client;
}

/** Secrets that may appear in a text (a key, a bearer token), masked. */
export function redactSecrets(text: string): string {
  return text
    .replace(/sk-ant-[^\s"'`]*(?:\s+[A-Za-z0-9_-]{8,})*/g, "[secret]")
    .replace(/Bearer\s+[^\s"'`]+(?:\s+[A-Za-z0-9_-]{8,})*/gi, "Bearer [secret]");
}

/**
 * What a log says of an error: an error of the API by its class and status;
 * any other one by its name and its message with its secrets masked, 300
 * characters at most. Never a key, whatever the error quotes.
 */
export function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    // Its status, its type and the id of the request (for the support of Anthropic).
    return ["API error", error.status, error.type, error.requestID]
      .filter((part) => part !== null && part !== undefined && part !== "")
      .join(" ");
  }
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return redactSecrets(text).slice(0, 300);
}

/** Deterministic answers for the end-to-end tests, never in production. */
export function isAiMock(): boolean {
  return process.env.AI_MOCK === "1" && process.env.NEXT_PUBLIC_ENV !== "production";
}

/** A key, or the deterministic answers of the tests. */
export function isAiConfigured(): boolean {
  return isAiMock() || apiKey() !== undefined;
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
