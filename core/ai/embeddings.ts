import "server-only";
import { createClient } from "@/lib/supabase/server";

// Embeddings of texts (L1-27, SPEC-V2 section 3): the gte-small model built
// into Supabase, by the Edge Function `embed` (supabase/functions/embed),
// called with the session of the signed-in account; 384 dimensions, mean
// pooled and normalized. AI_MOCK=1 (E2E): a deterministic stand-in, no call.

export const EMBEDDING_DIMENSIONS = 384;
/** What the function accepts in one call. */
export const EMBED_MAX_TEXTS = 16;
export const EMBED_MAX_CHARS = 2_000;

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
  if (process.env.AI_MOCK === "1") return { ok: true, data: input.map(mockEmbedding) };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{ embeddings?: unknown }>("embed", {
    body: { input },
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

/**
 * AI_MOCK: the words of the text in 384 buckets, normalized. Same words, same
 * vector; texts sharing words are close: enough for the E2E paths.
 */
export function mockEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const words = text
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  for (const word of words) {
    let hash = 2166136261;
    for (const char of word) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    vector[Math.abs(hash) % EMBEDDING_DIMENSIONS] += 1;
  }
  const norm = Math.hypot(...vector);
  if (norm === 0) vector[0] = 1;
  return norm === 0 ? vector : vector.map((x) => x / norm);
}
