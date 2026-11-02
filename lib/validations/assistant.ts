import { z } from "zod";

// The assistant (L1-28, SPEC-V2 section 12): what the browser sends to the
// route /api/ai/chat and to the actions of confirmation.

/** A message to the assistant: 2 000 characters at most. */
export const ASSISTANT_MESSAGE_MAX = 2_000;

/** The contexts open to the browser (the buyer with lot 2, the admin with L1-30). */
export const ASSISTANT_CONTEXTS = ["seller"] as const;
export type AssistantContext = (typeof ASSISTANT_CONTEXTS)[number];

const common = {
  conversationId: z.string().uuid().nullish(),
  context: z.enum(ASSISTANT_CONTEXTS),
  /** The property the conversation is about (a new conversation only). */
  propertyId: z.string().uuid().nullish(),
};

/** A message of the person, or the turn going on after their confirmations. */
export const chatRequestSchema = z.union([
  z.object({ ...common, message: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX) }).strict(),
  z.object({ ...common, conversationId: z.string().uuid(), resume: z.literal(true) }).strict(),
]);

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** A change proposed by the assistant, confirmed or cancelled by the person. */
export const toolCallSchema = z.object({
  conversationId: z.string().uuid(),
  toolCallId: z.string().min(1).max(200),
});
