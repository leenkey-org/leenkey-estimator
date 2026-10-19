import { z } from "zod";
import { textLength } from "./listing";

// L1-21 (SPEC-V2 8.6): what a participant sends, checked again by the
// database. Lengths are counted as Postgres does (char_length): an emoji is
// one character.
export const MESSAGE_MAX = 4000;
export const REPORT_REASON_MIN = 3;
export const REPORT_REASON_MAX = 2000;

const messageBody = z
  .string()
  .trim()
  .refine((value) => textLength(value) >= 1, "empty")
  .refine((value) => textLength(value) <= MESSAGE_MAX, "tooLong");

export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: messageBody,
});

/** The first message of a buyer, which opens the conversation on a listing. */
export const firstMessageSchema = z.object({
  listingId: z.string().uuid(),
  body: messageBody,
});

export const reportSchema = z.object({
  conversationId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .refine((value) => textLength(value) >= REPORT_REASON_MIN, "tooShort")
    .refine((value) => textLength(value) <= REPORT_REASON_MAX, "tooLong"),
});

export const conversationIdSchema = z.string().uuid();

export type MessageInput = z.infer<typeof messageSchema>;
export type FirstMessageInput = z.infer<typeof firstMessageSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
