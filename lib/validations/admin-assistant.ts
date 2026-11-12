import { z } from "zod";

// /admin/assistant (L1-30d, SPEC-V2 17): its tabs and filters in the address,
// the test search of the FAQ and the import of a file, as the browser sends
// them to the server.

export const ASSISTANT_TABS = ["faq", "journal", "consommation"] as const;
export type AssistantTab = (typeof ASSISTANT_TABS)[number];

export const AI_LOG_CONTEXTS = ["seller", "buyer", "admin", "visitor"] as const;
export type AiLogContext = (typeof AI_LOG_CONTEXTS)[number];

/** The words of the address for the contexts (« ?contexte=vendeur »). */
export const AI_LOG_CONTEXT_PARAMS: Record<AiLogContext, string> = {
  seller: "vendeur",
  buyer: "acquereur",
  admin: "equipe",
  visitor: "visiteur",
};

export type AssistantQuery = { tab: AssistantTab; context?: AiLogContext; query?: string };

export function parseAssistantQuery(
  params: Record<string, string | string[] | undefined>,
): AssistantQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const tab = z.enum(ASSISTANT_TABS).safeParse(first(params.onglet));
  const context = AI_LOG_CONTEXTS.find(
    (key) => AI_LOG_CONTEXT_PARAMS[key] === first(params.contexte),
  );
  const query = z.string().trim().min(1).max(100).safeParse(first(params.q));
  return {
    tab: tab.success ? tab.data : "faq",
    context,
    query: query.success ? query.data : undefined,
  };
}

export function assistantHref({ tab, context, query }: AssistantQuery): string {
  const params = new URLSearchParams();
  if (tab !== "faq") params.set("onglet", tab);
  if (context) params.set("contexte", AI_LOG_CONTEXT_PARAMS[context]);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/admin/assistant?${search}` : "/admin/assistant";
}

export const knowledgeSearchSchema = z.object({
  query: z.string().trim().min(3).max(500),
  audience: z.enum(["seller", "buyer"]),
});

/** A file of the FAQ: 300 KB of text at most (the FAQ of the client is about 60). */
export const KNOWLEDGE_FILE_MAX = 300_000;

export const knowledgeImportSchema = z.object({
  fileName: z.string().min(1).max(200),
  content: z.string().min(1).max(KNOWLEDGE_FILE_MAX),
});

export const caseSummarySchema = z.object({ caseId: z.string().uuid() });
