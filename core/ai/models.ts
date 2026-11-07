// Models of the assistant (SPEC-V2 section 3), never written anywhere else.
// The identifiers can be changed without a deployment of code
// (AI_MODEL_FAST, AI_MODEL_SMART). A model given here must accept adaptive
// thinking and the effort setting: Claude Sonnet 5.5 and Claude Opus 5.5 do.

export const MODELS = {
  /** Conversation, suggestions, pre-analysis: where speed counts. */
  fast: process.env.AI_MODEL_FAST || "claude-sonnet-5-5",
  /** Documents of the sale, an offer explained, the daily brief of the admin. */
  smart: process.env.AI_MODEL_SMART || "claude-opus-5-5",
} as const;

/**
 * The conversation: adaptive thinking (the model thinks when a question
 * needs it) at low effort, the level advised for a chat; the answers stay
 * short. 16 000 tokens at most per answer, thinking included: a cap on the
 * cost of one message, far above a real answer.
 */
export const CHAT_SETTINGS = {
  effort: "low",
  maxTokens: 16_000,
  /** Calls of the model in one turn (tools read, then the answer). */
  maxSteps: 6,
} as const;

/**
 * The assistant of the public site (DECISIONS.md 2026-11-07): short answers
 * (120 words), no tool, one call per question; 2 000 tokens at most,
 * thinking included, a cap on what a question of a visitor costs.
 */
export const VISITOR_SETTINGS = {
  maxTokens: 2_000,
} as const;

/**
 * A suggestion (L1-29): a reply in the messaging, a description of a
 * listing; one call, not streamed, adaptive thinking at low effort. 4 000
 * tokens at most, thinking included: a description is about 300.
 */
export const SUGGESTION_SETTINGS = {
  effort: "low",
  maxTokens: 4_000,
  /** The seller waits for it on the screen: 30 s and one retry at most. */
  timeoutMs: 30_000,
  maxRetries: 1,
} as const;
