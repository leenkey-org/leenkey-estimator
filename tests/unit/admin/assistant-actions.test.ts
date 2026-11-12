import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// L1-30d: the actions of /admin/assistant and the summary of a case, for
// the team only (a server action is reachable from any browser): an account
// without the admin role is refused before anything is read or called.

const rpc = vi.fn();
const summarize = vi.fn();
vi.mock("@/core/auth/session", () => ({
  getProfile: async () => ({
    id: "5eed0000-0000-4000-8000-00000000000a",
    roles: ["seller", "buyer"],
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("@/core/ai/knowledge", () => ({ searchKnowledge: vi.fn() }));
vi.mock("@/leenkey/admin/cases/case-summary", () => ({ summarizeCase: summarize }));

describe("actions of the assistant of the back office", () => {
  it("refused to an account without the admin role", async () => {
    const { importKnowledgeFile, embedKnowledge, testKnowledgeSearch } =
      await import("@/leenkey/admin/assistant/actions");
    const { caseSummaryAction } = await import("@/leenkey/admin/cases/actions");
    await expect(
      importKnowledgeFile({
        fileName: "faq.md",
        content: "## Q ?\n<!-- audience: seller | category: Prix -->\nR.",
      }),
    ).resolves.toEqual({ ok: false, error: "auth" });
    await expect(embedKnowledge()).resolves.toEqual({ ok: false, error: "auth" });
    await expect(testKnowledgeSearch({ query: "prix", audience: "seller" })).resolves.toEqual({
      ok: false,
      error: "auth",
    });
    await expect(
      caseSummaryAction({ caseId: "5eed5000-0000-4000-8000-000000000001" }),
    ).resolves.toEqual({ ok: false, error: "auth" });
    expect(rpc).not.toHaveBeenCalled();
    expect(summarize).not.toHaveBeenCalled();
  });
});
