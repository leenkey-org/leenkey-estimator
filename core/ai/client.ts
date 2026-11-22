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

/** One call of the model, not streamed: the whole message at once (suggestions, L1-29). */
export const createModelMessage = (
  request: ModelRequest,
  options?: { timeout?: number; maxRetries?: number; signal?: AbortSignal },
): Promise<Anthropic.Message> => anthropic().messages.create(request, options);

/** A request refused as written (400): the history replayed is not accepted. */
export function isBadRequest(error: unknown): boolean {
  return error instanceof Anthropic.BadRequestError;
}

/**
 * What an error of a call that carries a file means for its caller (L3-05),
 * from its status and its type, never from a guess on its words (the one
 * exception is the sentence the API uses for a context that does not fit):
 * - `too_heavy`: the request is too large (413 request_too_large);
 * - `too_long`: the file does not fit the context of the model (400, « prompt
 *   is too long »);
 * - `rejected`: the request is refused as written (any other 400): a file the
 *   API cannot read, or a setting of ours it does not accept;
 * - `blocked`: nothing was read and nothing will be for now (401 the key, 402
 *   the billing, 403 a permission, 404 the model, 429 the quota, 5xx and 529
 *   the service, after the retries of the SDK): the caller stops;
 * - null: no answer (a timeout, the network): to try again.
 */
export type ModelErrorKind = "too_heavy" | "too_long" | "rejected" | "blocked";

export function modelErrorKind(error: unknown): ModelErrorKind | null {
  if (!(error instanceof Anthropic.APIError) || typeof error.status !== "number") return null;
  if (error.status === 413) return "too_heavy";
  if (error.status === 400) {
    return /prompt is too long/i.test(error.message) ? "too_long" : "rejected";
  }
  return "blocked";
}
