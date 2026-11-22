import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { describeError, modelErrorKind, type ModelRequest } from "./client";
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

/** A file ready to leave: encoded once, whatever the number of requests that carry it. */
export type Attachment = { mediaType: AttachmentMediaType; base64: string };

/**
 * What we send, our own limits (the API has its own, which its errors tell:
 * modelErrorKind). A PDF: 20 MB (the most a document of a sale weighs) and
 * 100 pages. An image: 3.75 MB. A longer or heavier file is never sent.
 */
export const ATTACHMENT_LIMITS = {
  pdfBytes: 20 * 1024 * 1024,
  pdfPages: 100,
  imageBytes: 3_750_000,
} as const;

/** A file heavier than we send. */
export function attachmentTooHeavy(mediaType: AttachmentMediaType, sizeBytes: number): boolean {
  return (
    sizeBytes >
    (mediaType === "application/pdf" ? ATTACHMENT_LIMITS.pdfBytes : ATTACHMENT_LIMITS.imageBytes)
  );
}

/**
 * The pages of a PDF, counted from its page objects (« /Type /Page »); null
 * when they cannot be counted this way (page objects kept in compressed
 * streams): the file is then sent, and the API says if it is too long.
 */
export function pdfPageCount(data: Uint8Array): number | null {
  const text = new TextDecoder("latin1").decode(data);
  const pages = text.match(/\/Type\s*\/Page(?![A-Za-z])/g)?.length ?? 0;
  return pages > 0 ? pages : null;
}

export function encodeAttachment(mediaType: AttachmentMediaType, data: Uint8Array): Attachment {
  return { mediaType, base64: Buffer.from(data).toString("base64") };
}

/** The request of a text about a file: its rules (system), the file, then what to write. */
export function attachmentRequest(
  model: string,
  system: string,
  attachment: Attachment,
  prompt: string,
): ModelRequest {
  const data = attachment.base64;
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
  /** No answer (a timeout, the network): to try again later. */
  | "unavailable"
  /** The model cannot be asked for now (key, quota, service): the caller stops, nothing was read. */
  | "blocked"
  /** The model declined to answer. */
  | "refused"
  /** Nothing written, or an answer cut off by its length. */
  | "empty"
  /** Refused by the API as sent: does not fit the context, too heavy, not accepted as written. */
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
    return { ok: false, error: modelErrorKind(error) ?? "unavailable", message: null };
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
