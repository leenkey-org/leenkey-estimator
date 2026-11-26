import { beforeEach, describe, expect, it, vi } from "vitest";

// What Leenkey keeps of the credit notes (leenkey/billing/credit-notes.ts)
// and « Créer l'avoir » of the back office (retryCreditNote,
// leenkey/admin/actions.ts), DECISIONS.md 2026-11-25: a failure of Stripe
// or of the database is told, never thrown (the refund stays recorded);
// only an admin asks again, for a subscription id.

const state = vi.hoisted(() => ({
  ensure: null as null | (() => Promise<unknown>),
  rpcError: null as { code: string } | null,
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
  deleted: [] as string[],
  profile: null as null | { id: string; roles: string[] },
  withdrawnAt: null as string | null,
  memos: [] as (string | undefined)[],
  emailed: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/core/billing/stripe", () => ({
  ensureCreditNotes: (input: { memo?: string }) => {
    state.memos.push(input.memo);
    return state.ensure?.();
  },
}));
vi.mock("@/leenkey/billing/refund-emails", () => ({
  emailCreditNotes: async (_supabase: unknown, subscriptionId: string) => {
    state.emailed.push(subscriptionId);
    return { sent: 1, failed: 0 };
  },
}));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => state.profile }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => supabase }));

const supabase = {
  from: (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({
        data:
          table === "subscriptions"
            ? {
                id: "s1",
                stripe_checkout_session_id: "cs_1",
                stripe_payment_intent_id: "pi_1",
                withdrawal_requested_at: state.withdrawnAt,
              }
            : null,
        error: null,
      }),
      delete: () => ({
        in: async (_column: string, ids: string[]) => {
          state.deleted.push(...ids);
          return { error: null };
        },
      }),
    };
    return chain;
  },
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpc.push({ fn, args });
    return { data: { status: "recorded" }, error: state.rpcError };
  },
};

const okResult = {
  status: "ok",
  creditNotes: [
    {
      id: "cn_1",
      number: "LK-CN-01",
      amountCents: 99000,
      pdfUrl: null,
      issuedAt: "2026-11-25T10:00:00.000Z",
      refundIds: ["re_1"],
    },
  ],
  voidIds: ["cn_void"],
  created: 1,
  pending: 0,
};

// Imported once, outside the time of a test (it brings the whole back office).
const { retryCreditNote } = await import("@/leenkey/admin/actions");

beforeEach(() => {
  state.ensure = async () => okResult;
  state.rpcError = null;
  state.rpc = [];
  state.deleted = [];
  state.profile = { id: "a1", roles: ["admin"] };
  state.withdrawnAt = null;
  state.memos = [];
  state.emailed = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("recordCreditNotes", () => {
  it("records the credit notes of the invoice and forgets the voided ones", async () => {
    const { recordCreditNotes } = await import("@/leenkey/billing/credit-notes");
    expect(await recordCreditNotes(supabase as never, "pi_1")).toEqual({
      status: "recorded",
      created: 1,
      total: 1,
      pending: 0,
    });
    expect(state.rpc[0]).toMatchObject({
      fn: "credit_notes_record",
      args: { p_payment_intent_id: "pi_1", p_notes: [{ id: "cn_1", amount_cents: 99000 }] },
    });
    expect(state.deleted).toEqual(["cn_void"]);
    // Then the confirmation of the refund to the seller, for that plan.
    expect(state.emailed).toEqual(["s1"]);
  });

  // Cédric, 2026-11-26: the wording of the credit note, and the VAT notice.
  it("the memo says why: a withdrawal, or a plain refund, with the VAT exemption", async () => {
    const { recordCreditNotes, creditNoteMemo } = await import("@/leenkey/billing/credit-notes");
    await recordCreditNotes(supabase as never, "pi_1");
    state.withdrawnAt = "2026-11-20T10:00:00Z";
    await recordCreditNotes(supabase as never, "pi_1");
    expect(state.memos).toEqual([
      "Remboursement. TVA non applicable, article 293 B du CGI.",
      "Remboursement suite à l'exercice du droit de rétractation. TVA non applicable, article 293 B du CGI.",
    ]);
    // The same facts, the same memo: the idempotent creation never changes.
    expect(creditNoteMemo(true)).toBe(creditNoteMemo(true));
    expect(creditNoteMemo(true)).not.toBe(creditNoteMemo(false));
  });

  it("a Stripe error: failed, never thrown", async () => {
    state.ensure = async () => {
      throw new Error("Stripe is down");
    };
    const { recordCreditNotes } = await import("@/leenkey/billing/credit-notes");
    expect(await recordCreditNotes(supabase as never, "pi_1")).toEqual({ status: "failed" });
    expect(state.rpc).toEqual([]);
    expect(state.emailed).toEqual([]);
  });

  it("a database error: failed, never thrown", async () => {
    state.rpcError = { code: "XX000" };
    const { recordCreditNotes } = await import("@/leenkey/billing/credit-notes");
    expect(await recordCreditNotes(supabase as never, "pi_1")).toEqual({ status: "failed" });
  });
});

describe("retryCreditNote", () => {
  it("an account without the admin role: forbidden, nothing asked of Stripe", async () => {
    state.profile = { id: "s1", roles: ["seller"] };
    let asked = false;
    state.ensure = async () => {
      asked = true;
      return okResult;
    };
    expect(
      await retryCreditNote({ subscriptionId: "00000000-0000-4000-a000-000000000001" }),
    ).toEqual({ ok: false, error: "forbidden" });
    state.profile = null;
    expect(
      await retryCreditNote({ subscriptionId: "00000000-0000-4000-a000-000000000001" }),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(asked).toBe(false);
  });

  it("a bad id: invalid", async () => {
    expect(await retryCreditNote({ subscriptionId: "not-a-uuid" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await retryCreditNote(null)).toEqual({ ok: false, error: "invalid" });
  });

  it("an admin: the credit note asked again, with who asked", async () => {
    expect(
      await retryCreditNote({ subscriptionId: "00000000-0000-4000-a000-000000000001" }),
    ).toEqual({ ok: true, data: { created: 1 } });
    expect(state.rpc[0]?.args).toMatchObject({ p_actor: "a1" });
  });
});
