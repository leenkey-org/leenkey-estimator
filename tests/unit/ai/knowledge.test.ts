import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// L1-27: embeddings and search of the knowledge base, with a stand-in of the
// Supabase client of the session (the Edge Function `embed`, the SQL function
// search_knowledge). The SQL ranking and its permissions are tested in
// supabase/tests/rls_knowledge_search.sql; the relevance on the FAQ of Cédric
// by scripts/kb-eval.mjs against a project.

type Invoke = { name: string; body: unknown; timeout?: number };
type Rpc = { name: string; args: Record<string, unknown> };

const mocks = vi.hoisted(() => ({
  embeddings: null as unknown,
  invokeError: null as Error | null,
  rows: [] as unknown[],
  rpcError: null as { code: string } | null,
  invoke: [] as Invoke[],
  rpc: [] as Rpc[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    functions: {
      invoke: async (name: string, options: { body: unknown; timeout?: number }) => {
        mocks.invoke.push({ name, body: options.body, timeout: options.timeout });
        return mocks.invokeError
          ? { data: null, error: mocks.invokeError }
          : { data: { embeddings: mocks.embeddings }, error: null };
      },
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      mocks.rpc.push({ name, args });
      return mocks.rpcError
        ? { data: null, error: mocks.rpcError }
        : { data: mocks.rows, error: null };
    },
  }),
}));

const { EMBEDDING_DIMENSIONS, EMBED_TIMEOUT_MS, embedTexts, vectorLiteral } =
  await import("@/core/ai/embeddings");
const { searchKnowledge } = await import("@/core/ai/knowledge");
const { searchKnowledgeTool } = await import("@/core/ai/tools/search-knowledge");

/** The answers of the stand-in for the next calls. */
function answers({
  embeddings = [unit(0)],
  invokeError = null,
  rows = [],
  rpcError = null,
}: {
  embeddings?: unknown;
  invokeError?: Error | null;
  rows?: unknown[];
  rpcError?: { code: string } | null;
} = {}) {
  Object.assign(mocks, { embeddings, invokeError, rows, rpcError, invoke: [], rpc: [] });
  return mocks;
}

function unit(index: number): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  vector[index] = 1;
  return vector;
}

const ROW = {
  id: "5eed9000-0000-4000-8000-000000000001",
  category: "notaire",
  step_code: "notary",
  question: "Dois-je avoir un notaire ?",
  answer: "Oui.",
  similarity: 0.91,
  score: 0.032,
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("embedTexts", () => {
  it("asks the Edge Function embed for the texts, trimmed", async () => {
    const calls = answers({ embeddings: [unit(0), unit(1)] });
    const result = await embedTexts(["  Faut-il un notaire ?  ", "Combien ?"]);
    expect(result).toEqual({ ok: true, data: [unit(0), unit(1)] });
    expect(calls.invoke).toEqual([
      {
        name: "embed",
        body: { input: ["Faut-il un notaire ?", "Combien ?"] },
        timeout: EMBED_TIMEOUT_MS,
      },
    ]);
  });

  it("refuses an empty text and more than 16 texts, without calling", async () => {
    const calls = answers();
    const unavailable = { ok: false, error: "unavailable" };
    expect(await embedTexts(["  "])).toEqual(unavailable);
    expect(await embedTexts(Array(17).fill("x"))).toEqual(unavailable);
    expect(await embedTexts([])).toEqual(unavailable);
    expect(calls.invoke).toHaveLength(0);
  });

  it("is unavailable when the function fails or answers something else than 384 numbers per text", async () => {
    for (const options of [
      { invokeError: new Error("FunctionsHttpError") },
      { embeddings: [unit(0).slice(1)] },
      { embeddings: [unit(0), unit(1)] },
      { embeddings: "nope" },
      { embeddings: [[...unit(0).slice(1), Number.NaN]] },
    ]) {
      answers(options);
      expect(await embedTexts(["Faut-il un notaire ?"])).toEqual({
        ok: false,
        error: "unavailable",
      });
    }
  });
});

describe("vectorLiteral", () => {
  it("writes a vector as pgvector reads it", () => {
    expect(vectorLiteral([0.5, -0.25, 1])).toBe("[0.5,-0.25,1]");
  });
});

describe("searchKnowledge", () => {
  it("embeds the question, then searches with its words, the audience and the step", async () => {
    const calls = answers({ rows: [ROW] });
    const result = await searchKnowledge({
      query: " Faut-il un notaire ? ",
      audience: "seller",
      stepCode: "notary",
    });
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: ROW.id,
          category: "notaire",
          stepCode: "notary",
          question: "Dois-je avoir un notaire ?",
          answer: "Oui.",
          similarity: 0.91,
          score: 0.032,
        },
      ],
    });
    expect(calls.rpc).toEqual([
      {
        name: "search_knowledge",
        args: {
          p_embedding: vectorLiteral(unit(0)),
          p_query: "Faut-il un notaire ?",
          p_audience: "seller",
          p_step_code: "notary",
          p_limit: 5,
        },
      },
    ]);
  });

  it("asks 5 cards at most, 1 at least, without a step when there is none", async () => {
    const calls = answers();
    await searchKnowledge({ query: "notaire", audience: "buyer", limit: 50 });
    await searchKnowledge({ query: "notaire", audience: "buyer", limit: 0 });
    expect(calls.rpc.map((call) => [call.args.p_limit, call.args.p_step_code])).toEqual([
      [5, undefined],
      [1, undefined],
    ]);
  });

  it("refuses an empty or too long question, without calling", async () => {
    const calls = answers();
    const invalid = { ok: false, error: "invalid" };
    expect(await searchKnowledge({ query: "   ", audience: "seller" })).toEqual(invalid);
    expect(await searchKnowledge({ query: "x".repeat(501), audience: "seller" })).toEqual(invalid);
    expect(calls.invoke).toHaveLength(0);
  });

  it("is unavailable when the embedding or the search fails", async () => {
    const unavailable = { ok: false, error: "unavailable" };
    const calls = answers({ invokeError: new Error("down") });
    expect(await searchKnowledge({ query: "notaire", audience: "seller" })).toEqual(unavailable);
    expect(calls.rpc).toHaveLength(0);
    answers({ rpcError: { code: "42501" } });
    expect(await searchKnowledge({ query: "notaire", audience: "seller" })).toEqual(unavailable);
  });
});

describe("search_knowledge, the tool", () => {
  const ctx = {
    profileId: "5eed0000-0000-4000-8000-00000000000a",
    context: "seller" as const,
    stepCode: "offers",
  };

  it("reads only, for every context, with a question of 1 to 500 characters", () => {
    expect(searchKnowledgeTool.name).toBe("search_knowledge");
    expect(searchKnowledgeTool.requiresConfirmation).toBe(false);
    expect(searchKnowledgeTool.contexts).toEqual(["seller", "buyer", "admin"]);
    expect(searchKnowledgeTool.input.safeParse({ query: "  " }).success).toBe(false);
    expect(searchKnowledgeTool.input.safeParse({ query: "x".repeat(501) }).success).toBe(false);
    expect(searchKnowledgeTool.input.safeParse({ query: "Faut-il un notaire ?" }).success).toBe(
      true,
    );
  });

  it("gives the cards to the model, with the audience and the step of the conversation", async () => {
    const calls = answers({ rows: [ROW] });
    expect(await searchKnowledgeTool.execute({ query: "Faut-il un notaire ?" }, ctx)).toEqual({
      found: true,
      cards: [{ question: "Dois-je avoir un notaire ?", answer: "Oui.", category: "notaire" }],
    });
    expect(calls.rpc[0].args).toMatchObject({ p_audience: "seller", p_step_code: "offers" });
  });

  it("says when there is no card, or when the search is unavailable", async () => {
    answers();
    expect(await searchKnowledgeTool.execute({ query: "notaire" }, ctx)).toEqual({
      found: false,
      reason: "no_card",
    });
    answers({ rpcError: { code: "XX000" } });
    expect(await searchKnowledgeTool.execute({ query: "notaire" }, ctx)).toEqual({
      found: false,
      reason: "unavailable",
    });
  });
});
