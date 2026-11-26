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
  emails: { sent: 1, failed: 0 },
  failRpc: null as string | null,
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
    return state.emails;
  },
  NO_REFUND_EMAILS: { sent: 0, failed: 0 },
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
    if (state.failRpc === fn) return { data: null, error: { code: "XX000" } };
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
      ours: true,
    },
  ],
  voidIds: ["cn_void"],
  created: 1,
  pending: 0,
};

// Imported once, outside the time of a test (it brings the whole back office).
const { retryCreditNote, resendRefundEmail } = await import("@/leenkey/admin/actions");

beforeEach(() => {
  state.ensure = async () => okResult;
  state.rpcError = null;
  state.rpc = [];
  state.deleted = [];
  state.profile = { id: "a1", roles: ["admin"] };
  state.withdrawnAt = null;
  state.memos = [];
  state.emailed = [];
  state.emails = { sent: 1, failed: 0 };
  state.failRpc = null;
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
      // What happened to the confirmation of the refund, told to the caller.
      emails: { sent: 1, failed: 0 },
    });
    // Created by this code: nothing to mark as emailed by Stripe.
    expect(state.rpc.map((call) => call.fn)).toEqual(["credit_notes_record"]);
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

  // A credit note made by hand in the Stripe dashboard (Stripe emails it):
  // recorded, marked, never emailed a second time by Leenkey.
  it("marks the credit notes this code did not create as emailed by Stripe, before sending", async () => {
    const hand = { ...okResult.creditNotes[0], id: "cn_hand", number: "LK-CN-HAND", ours: false };
    state.ensure = async () => ({ ...okResult, creditNotes: [hand, okResult.creditNotes[0]] });
    const { recordCreditNotes } = await import("@/leenkey/billing/credit-notes");
    await recordCreditNotes(supabase as never, "pi_1");
    expect(state.rpc.map((call) => call.fn)).toEqual([
      "credit_notes_record",
      "credit_notes_emailed_elsewhere",
    ]);
    expect(state.rpc[1]?.args).toEqual({ p_stripe_credit_note_ids: ["cn_hand"] });
    expect(state.emailed).toEqual(["s1"]);
  });

  it("when they cannot be marked, no email at all in this pass (never twice to the seller)", async () => {
    const hand = { ...okResult.creditNotes[0], id: "cn_hand", ours: false };
    state.ensure = async () => ({ ...okResult, creditNotes: [hand] });
    state.failRpc = "credit_notes_emailed_elsewhere";
    const { recordCreditNotes } = await import("@/leenkey/billing/credit-notes");
    expect(await recordCreditNotes(supabase as never, "pi_1")).toMatchObject({
      status: "recorded",
      emails: { sent: 0, failed: 0 },
    });
    expect(state.emailed).toEqual([]);
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
    ).toEqual({ ok: true, data: { created: 1, emails: { sent: 1, failed: 0 } } });
    expect(state.rpc[0]?.args).toMatchObject({ p_actor: "a1" });
  });

  it("tells when the email of the credit note did not leave", async () => {
    state.emails = { sent: 0, failed: 1 };
    expect(
      await retryCreditNote({ subscriptionId: "00000000-0000-4000-a000-000000000001" }),
    ).toEqual({ ok: true, data: { created: 1, emails: { sent: 0, failed: 1 } } });
  });
});

describe("resendRefundEmail", () => {
  const id = "00000000-0000-4000-a000-000000000001";

  it("an account without the admin role: forbidden, nothing sent", async () => {
    state.profile = { id: "s1", roles: ["seller"] };
    expect(await resendRefundEmail({ subscriptionId: id })).toEqual({
      ok: false,
      error: "forbidden",
    });
    state.profile = null;
    expect(await resendRefundEmail({ subscriptionId: id })).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(state.emailed).toEqual([]);
    expect(state.rpc).toEqual([]);
  });

  it("a bad id: invalid", async () => {
    expect(await resendRefundEmail({ subscriptionId: "nope" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(state.emailed).toEqual([]);
  });

  it("an admin: the emails still to send leave, and who asked is written", async () => {
    state.emails = { sent: 2, failed: 1 };
    expect(await resendRefundEmail({ subscriptionId: id })).toEqual({
      ok: true,
      data: { sent: 2, failed: 1 },
    });
    expect(state.emailed).toEqual(["s1"]);
    expect(state.rpc).toEqual([
      { fn: "refund_email_resent", args: { p_subscription_id: "s1", p_sent: 2, p_failed: 1 } },
    ]);
  });

  it("the audit log failing does not hide what left", async () => {
    state.failRpc = "refund_email_resent";
    expect(await resendRefundEmail({ subscriptionId: id })).toEqual({
      ok: true,
      data: { sent: 1, failed: 0 },
    });
  });
});
