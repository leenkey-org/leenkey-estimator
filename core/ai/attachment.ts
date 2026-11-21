import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { describeError, fileRejection, type ModelRequest } from "./client";
import { textOf, type TextCall } from "./generate";
import { ATTACHMENT_SETTINGS } from "./models";

// One text written by the model from a file it reads itself (L3-05): a PDF as
// a `document` block, a JPEG or a PNG as an `image` block, in base64, in a
// single call, not streamed. No text is extracted on our side: the model
// reads the pages as they are, scans included. Generic: a file, its rules
// (system), what to write (prompt); what the file is about is the caller's.
// The caller gives the call (createModelMessage, or the scripted model of the
// tests) and logs the message, whatever came of it: its tokens are billed.

export type AttachmentMediaType = "application/pdf" | "image/jpeg" | "image/png";

export type Attachment = { mediaType: AttachmentMediaType; data: Uint8Array };

/**
 * What a request may carry. A PDF: 20 MB (26.7 MB once in base64, under the
 * 32 MB of a request) and 100 pages, counted by the API, which refuses a
 * longer one. An image: 3.75 MB (5 MB once in base64, the most the API takes
 * for one image).
 */
export const ATTACHMENT_LIMITS = {
  pdfBytes: 20 * 1024 * 1024,
  pdfPages: 100,
  imageBytes: 3_750_000,
} as const;

/** A file heavier than a request may carry: never sent. */
export function attachmentTooHeavy(mediaType: AttachmentMediaType, sizeBytes: number): boolean {
  return (
    sizeBytes >
    (mediaType === "application/pdf" ? ATTACHMENT_LIMITS.pdfBytes : ATTACHMENT_LIMITS.imageBytes)
  );
}

/** The request of a text about a file: its rules (system), the file, then what to write. */
export function attachmentRequest(
  model: string,
  system: string,
  attachment: Attachment,
  prompt: string,
): ModelRequest {
  const data = Buffer.from(attachment.data).toString("base64");
  const file: Anthropic.ContentBlockParam =
    attachment.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: attachment.mediaType, data } };
  return {
    model,
    max_tokens: ATTACHMENT_SETTINGS.maxTokens,
    system: [{ type: "text", text: system }],
    // The file first, what to do with it after (the order advised for a long document).
    messages: [{ role: "user", content: [file, { type: "text", text: prompt }] }],
    thinking: { type: "adaptive" },
    output_config: { effort: ATTACHMENT_SETTINGS.effort },
  };
}

export type AttachmentError =
  /** The model could not be reached: to try again later. */
  | "unavailable"
  /** The model declined to answer. */
  | "refused"
  /** Nothing written, or an answer cut off by its length. */
  | "empty"
  /** Refused by the API as sent: too many pages, too heavy, not readable. */
  | "too_long"
  | "too_heavy"
  | "rejected";

export type AttachmentGeneration =
  | { ok: true; text: string; message: Anthropic.Message }
  | { ok: false; error: AttachmentError; message: Anthropic.Message | null };

export async function generateFromAttachment(
  call: TextCall,
  request: ModelRequest,
  log: { userId: string; entityId: string; kind: string },
): Promise<AttachmentGeneration> {
  let message: Anthropic.Message;
  try {
    message = await call(request);
  } catch (error) {
    console.error("[ai] model call failed", {
      user_id: log.userId,
      entity_id: log.entityId,
      kind: log.kind,
      error: describeError(error),
    });
    return { ok: false, error: fileRejection(error) ?? "unavailable", message: null };
  }
  if (message.stop_reason === "refusal") return { ok: false, error: "refused", message };
  const text = textOf(message);
  if (message.stop_reason === "max_tokens" || text === "") {
    console.error("[ai] no text written", {
      user_id: log.userId,
      entity_id: log.entityId,
      kind: log.kind,
      stop_reason: message.stop_reason,
    });
    return { ok: false, error: "empty", message };
  }
  return { ok: true, text, message };
}
