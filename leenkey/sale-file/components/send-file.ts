import {
  SALE_FILE_EXTENSIONS,
  SALE_FILE_MAX_BYTES,
  type SaleFileMime,
} from "@/lib/config/documents";
import { startDocumentUpload } from "../actions";

// From the browser to the private bucket (SPEC-V2 15): a file of the sale
// file weighs up to 20 MB, more than a server action carries (4 MB). The
// server opens a signed upload URL for this one file, the browser sends the
// file to it, then asks the server to check and file it (fileDocument,
// fileDdt).

const isSaleFileMime = (value: string): value is SaleFileMime => value in SALE_FILE_EXTENSIONS;

export type SendFileResult =
  | { ok: true; path: string }
  | { ok: false; error: "auth" | "invalid" | "unsupported" | "too_heavy" | "unavailable" };

/** Sends a PDF, a JPEG or a PNG of 20 MB at most to its place in the bucket. */
export async function sendSaleFile(propertyId: string, file: File): Promise<SendFileResult> {
  if (!isSaleFileMime(file.type)) return { ok: false, error: "unsupported" };
  if (file.size > SALE_FILE_MAX_BYTES) return { ok: false, error: "too_heavy" };
  const opened = await startDocumentUpload({
    propertyId,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!opened.ok) return opened;
  // As the storage client sends a file to a signed upload URL.
  const body = new FormData();
  // A private document is never kept by a browser or a cache.
  body.append("cacheControl", "0");
  body.append("", file);
  const sent = await fetch(opened.data.uploadUrl, {
    method: "PUT",
    body,
    headers: { "x-upsert": "false" },
  });
  if (!sent.ok) return { ok: false, error: sent.status === 413 ? "too_heavy" : "unavailable" };
  return { ok: true, path: opened.data.path };
}
