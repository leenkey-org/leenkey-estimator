import "server-only";
import { createClient } from "@/lib/supabase/server";
import { embedTexts, vectorLiteral } from "./embeddings";
import type { AiContext } from "./tools/types";

// Search of the knowledge base (L1-27, SPEC-V2 section 12): the question
// embedded (embeddings.ts), then the SQL function search_knowledge, with the
// session of the account (it reads the cards of its audience, never the
// table): closeness of meaning and words of the question, fused; the cards of
// the current step of the sale a little first. No threshold: gte-small gives
// every pair of French texts a similarity above 0.8, an off-topic question
// included (scripts/kb-eval.mjs); the model reads the cards and uses only
// those that answer (prompt of the assistant, L1-28).

/** The context of the assistant: the cards of its audience (one of the roles of the account). */
export type KnowledgeAudience = AiContext;

export type KnowledgeCard = {
  id: string;
  category: string;
  stepCode: string | null;
  question: string;
  answer: string;
  /** Closeness of meaning, from -1 to 1. */
  similarity: number;
  /** Rank of the card, meaning and words fused: the higher the better. */
  score: number;
};

/** 5 cards at most (SPEC-V2 section 12, also capped in SQL). */
export const KNOWLEDGE_MAX_CARDS = 5;
export const KNOWLEDGE_QUERY_MAX = 500;

export type KnowledgeResult =
  | { ok: true; data: KnowledgeCard[] }
  | { ok: false; error: "invalid" | "unavailable" };

export async function searchKnowledge({
  query,
  audience,
  stepCode = null,
  limit = KNOWLEDGE_MAX_CARDS,
}: {
  query: string;
  audience: KnowledgeAudience;
  stepCode?: string | null;
  limit?: number;
}): Promise<KnowledgeResult> {
  const text = query.trim();
  if (text.length === 0 || text.length > KNOWLEDGE_QUERY_MAX)
    return { ok: false, error: "invalid" };

  const embedded = await embedTexts([text]);
  if (!embedded.ok) return embedded;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_knowledge", {
    p_embedding: vectorLiteral(embedded.data[0]),
    p_query: text,
    p_audience: audience,
    p_step_code: stepCode ?? undefined,
    p_limit: Math.min(Math.max(Math.trunc(limit), 1), KNOWLEDGE_MAX_CARDS),
  });
  if (error) {
    console.error("[ai] knowledge search failed", { code: error.code });
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    // Generated types declare the columns of a function result as never null.
    data: data.map((row) => ({
      id: row.id,
      category: row.category,
      stepCode: row.step_code as string | null,
      question: row.question,
      answer: row.answer,
      similarity: row.similarity,
      score: row.score,
    })),
  };
}
