// Models of the assistant (SPEC-V2 section 3), never written anywhere else.
// The identifiers can be changed without a deployment of code
// (AI_MODEL_FAST, AI_MODEL_SMART). A model given here must accept the
// mid-conversation system messages (the file of the person, core/ai/chat.ts)
// and adaptive thinking: Claude Sonnet 5.5 and Claude Opus 5.5 do.

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
