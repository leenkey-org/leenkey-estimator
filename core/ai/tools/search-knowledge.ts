import "server-only";
import { z } from "zod";
import { KNOWLEDGE_MAX_CARDS, KNOWLEDGE_QUERY_MAX, searchKnowledge } from "../knowledge";
import type { AiTool } from "./types";

// search_knowledge (SPEC-V2 section 12): every context, reads only. The
// assistant calls it before answering a question of method, delay or
// procedure; without a card, it says so and offers an advisor.

const input = z.object({
  query: z.string().trim().min(1).max(KNOWLEDGE_QUERY_MAX),
});

export type SearchKnowledgeOutput =
  | { found: true; cards: { question: string; answer: string; category: string }[] }
  | { found: false; reason: "no_card" | "unavailable" };

export const searchKnowledgeTool: AiTool<z.infer<typeof input>, SearchKnowledgeOutput> = {
  name: "search_knowledge",
  description:
    "Search the Leenkey knowledge base (the FAQ written by the Leenkey team) for the cards " +
    `that answer a question of method, delay or procedure. Returns ${KNOWLEDGE_MAX_CARDS} cards at most, ` +
    "the closest first. They may not all answer the question: use only those that do, and say " +
    "so when none does.",
  input,
  requiresConfirmation: false,
  contexts: ["seller", "buyer", "admin"],
  async execute({ query }, ctx) {
    const result = await searchKnowledge({
      query,
      audience: ctx.context,
      stepCode: ctx.stepCode,
    });
    if (!result.ok) return { found: false, reason: "unavailable" };
    if (result.data.length === 0) return { found: false, reason: "no_card" };
    return {
      found: true,
      cards: result.data.map(({ question, answer, category }) => ({ question, answer, category })),
    };
  },
};
