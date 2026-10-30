import "server-only";
import { createClient } from "@/lib/supabase/server";

// Embeddings of texts (L1-27, SPEC-V2 section 3): the gte-small model built
// into Supabase, by the Edge Function `embed` (supabase/functions/embed),
// called with the session of the signed-in account; 384 dimensions, mean
// pooled and normalized. No stand-in here: the cards are embedded by the same
// function, a question must be in the same space (the E2E tests use the
// function of the local stack).

export const EMBEDDING_DIMENSIONS = 384;
/** What the function accepts in one call. */
export const EMBED_MAX_TEXTS = 16;
export const EMBED_MAX_CHARS = 2_000;
/** A cold function loads its model first: past this, the search is unavailable. */
export const EMBED_TIMEOUT_MS = 20_000;

export type EmbedResult = { ok: true; data: number[][] } | { ok: false; error: "unavailable" };

const isEmbedding = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === EMBEDDING_DIMENSIONS &&
  value.every((x) => typeof x === "number" && Number.isFinite(x));

export async function embedTexts(texts: readonly string[]): Promise<EmbedResult> {
  if (texts.length === 0 || texts.length > EMBED_MAX_TEXTS)
    return { ok: false, error: "unavailable" };
  const input = texts.map((text) => text.trim().slice(0, EMBED_MAX_CHARS));
  if (input.some((text) => text.length === 0)) return { ok: false, error: "unavailable" };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{ embeddings?: unknown }>("embed", {
    body: { input },
    timeout: EMBED_TIMEOUT_MS,
  });
  const embeddings = data?.embeddings;
  if (
    error ||
    !Array.isArray(embeddings) ||
    embeddings.length !== input.length ||
    !embeddings.every(isEmbedding)
  ) {
    console.error("[ai] embedding failed", { error: error?.name ?? "invalid response" });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: embeddings };
}

/** The text form of a vector, as pgvector reads it: « [0.1,0.2,…] ». */
export function vectorLiteral(vector: readonly number[]): string {
  return `[${vector.join(",")}]`;
}
