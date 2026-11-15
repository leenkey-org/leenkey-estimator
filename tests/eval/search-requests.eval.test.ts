import { describe, expect, it, vi } from "vitest";
import { SEARCH_CASES } from "../fixtures/search-requests";

// L2-06, acceptance criterion of SPEC-V2 section 23: « Recherche en langage
// naturel → filtres corrects sur 10 requêtes de test », against the real
// model. Each of the ten searches is sent as a buyer writes it, with the
// request of the conversation (the prompt of the buyer, their tools, the
// settings of core/ai/chat.ts) and a file whose project names a budget and
// communes of its own: the model must call search_listings with the criteria
// of the message only, and the search it becomes must be the expected one.
//
// `npm run ai:eval-search`, with ANTHROPIC_API_KEY (billed: ten calls of the
// fast model). Without a key, every case is skipped. Never run by the CI.

vi.mock("server-only", () => ({}));

const key = process.env.ANTHROPIC_API_KEY?.trim();

describe.skipIf(!key)("the real model turns the words of a buyer into the right search", () => {
  it.each(SEARCH_CASES.map((item) => [item.ask, item] as const))(
    "%s",
    async (_ask, item) => {
      const { chatRequest } = await import("@/core/ai/chat");
      const { createModelMessage } = await import("@/core/ai/client");
      const { personMessage } = await import("@/core/ai/conversation");
      const { MODELS } = await import("@/core/ai/models");
      const { systemPrompt } = await import("@/core/ai/prompts");
      const { buyerContextText } = await import("@/leenkey/ai/context");
      const { searchQueryOf, searchRequest } = await import("@/leenkey/ai/search-request");
      const { toolsFor } = await import("@/leenkey/ai/tools");

      // A project with a budget and communes the message does not name: none
      // of them may become a criterion of the search.
      const file = buyerContextText({
        firstName: "Chloé",
        now: new Date(),
        file: {
          project: {
            kind: "residence_principale",
            cities: ["Chilly-Mazarin", "Montlhéry"],
            budgetMaxEuros: 365_000,
            financing: "Informations déclarées",
            declared: true,
            financingCheckedOn: null,
          },
          offers: [],
          offersTotal: 0,
          listing: null,
        },
      });
      const message = await createModelMessage(
        chatRequest(MODELS.fast, systemPrompt("buyer", []), toolsFor("buyer"), [
          personMessage({ type: "user", text: item.ask, context: file }),
        ]),
        { timeout: 90_000, maxRetries: 1 },
      );
      const calls = message.content.filter((block) => block.type === "tool_use");
      expect(
        calls.map((block) => block.name),
        "one call, of search_listings",
      ).toEqual(["search_listings"]);
      const request = searchRequest.safeParse(calls[0]?.input);
      expect(request.success, JSON.stringify(calls[0]?.input)).toBe(true);
      if (!request.success) return;
      const query = searchQueryOf(request.data);
      expect(query.filters, JSON.stringify(request.data)).toEqual(item.filters);
      expect(query.sort).toBe(item.sort);
    },
    120_000,
  );
});
