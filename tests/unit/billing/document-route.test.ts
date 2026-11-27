import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The download of an invoice or of a credit note (app/(forms)/vendeur/
// formule/document/route.ts, DECISIONS.md 2026-11-26): the session decides
// (what the RLS does not give is a 404, like a document that does not
// exist), the browser is sent to Stripe only, a failure leads back to the
// list, the downloads are counted per account, the team opening the
// document of a seller is written in the audit log.

const state = vi.hoisted(() => ({
  profile: null as null | { id: string; roles: string[] },
  // What the RLS gives to this session, per table.
  rows: {} as Record<string, unknown>,
  readError: null as { code: string } | null,
  allowed: true,
  counted: [] as string[],
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
  rpcError: null as { code: string } | null,
  mocked: false,
  invoice: null as null | { id: string; number: string | null; pdfUrl: string | null },
  creditNoteUrl: null as string | null,
  stripeDown: false,
  asked: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => state.profile }));
vi.mock("@/lib/rate-limit", () => ({
  allowAccount: async (bucket: string, account: string) => {
    state.counted.push(`${bucket}:${account}`);
    return state.allowed;
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({
        data: state.readError ? null : (state.rows[table] ?? null),
        error: state.readError,
      });
      return chain;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpc.push({ fn, args });
      return { data: null, error: state.rpcError };
    },
  }),
}));
vi.mock("@/core/billing/stripe", async (original) => {
  const actual = await original<typeof import("@/core/billing/stripe")>();
  return {
    isStripeUrl: actual.isStripeUrl,
    MOCK_PDF: actual.MOCK_PDF,
    stripeMocked: () => state.mocked,
    checkoutInvoice: async (sessionId: string) => {
      state.asked.push(sessionId);
      if (state.stripeDown) throw new Error("An error occurred with our connection to Stripe.");
      return state.invoice;
    },
    creditNotePdfUrl: async (id: string) => {
      state.asked.push(id);
      if (state.stripeDown) throw new Error("An error occurred with our connection to Stripe.");
      return state.creditNoteUrl;
    },
  };
});

const { GET } = await import("@/app/(forms)/vendeur/formule/document/route");

const SUBSCRIPTION = "00000000-0000-4000-a000-000000000001";
const NOTE = "00000000-0000-4000-a000-000000000002";
const PROPERTY = "5eed1000-0000-4000-8000-000000000009";
const get = (query: string) =>
  GET(new NextRequest(`https://leenkey.fr/vendeur/formule/document?${query}`));

beforeEach(() => {
  state.profile = { id: "seller-b", roles: ["seller"] };
  state.rows = {
    subscriptions: { property_id: PROPERTY, stripe_checkout_session_id: "cs_1" },
    credit_notes: {
      stripe_credit_note_id: "cn_1",
      pdf_url: "https://pay.stripe.com/credit_notes/kept/pdf",
      subscription: { property_id: PROPERTY },
    },
  };
  state.readError = null;
  state.allowed = true;
  state.counted = [];
  state.rpc = [];
  state.rpcError = null;
  state.mocked = false;
  state.invoice = { id: "in_1", number: "LK-0001", pdfUrl: "https://pay.stripe.com/invoice/x/pdf" };
  state.creditNoteUrl = "https://pay.stripe.com/credit_notes/fresh/pdf";
  state.stripeDown = false;
  state.asked = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /vendeur/formule/document", () => {
  it("signed out: to the sign-in page, and back here after", async () => {
    state.profile = null;
    const response = await get(`avoir=${NOTE}`);
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/connexion");
    expect(location.searchParams.get("next")).toBe(`/vendeur/formule/document?avoir=${NOTE}`);
    expect(state.asked).toEqual([]);
    expect(state.counted).toEqual([]);
  });

  it("neither or both, or not a uuid: a 404 before anything is read", async () => {
    for (const query of ["", "facture=cs_1", `facture=${SUBSCRIPTION}&avoir=${NOTE}`]) {
      expect((await get(query)).status).toBe(404);
    }
    expect(state.counted).toEqual([]);
  });

  it("the invoice of the seller: sent to the fresh address Stripe gives", async () => {
    const response = await get(`facture=${SUBSCRIPTION}`);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://pay.stripe.com/invoice/x/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(state.asked).toEqual(["cs_1"]);
    expect(state.counted).toEqual(["document:seller-b"]);
    // A seller opening their own document writes nothing in the audit log.
    expect(state.rpc).toEqual([]);
  });

  it("the credit note of the seller: the fresh address, not the one kept", async () => {
    const response = await get(`avoir=${NOTE}`);
    expect(response.headers.get("location")).toBe("https://pay.stripe.com/credit_notes/fresh/pdf");
    expect(state.asked).toEqual(["cn_1"]);
  });

  it("the real credit note of another seller: the RLS gives nothing, a 404, Stripe never asked", async () => {
    // What a session that does not own the plan reads of credit_notes: no row.
    state.rows = {};
    expect((await get(`avoir=${NOTE}`)).status).toBe(404);
    expect((await get(`facture=${SUBSCRIPTION}`)).status).toBe(404);
    expect(state.asked).toEqual([]);
  });

  it("a payment without Checkout has no invoice: a 404", async () => {
    state.rows = { subscriptions: { property_id: PROPERTY, stripe_checkout_session_id: null } };
    expect((await get(`facture=${SUBSCRIPTION}`)).status).toBe(404);
  });

  it("an address that is not Stripe's is never given to the browser", async () => {
    state.invoice = { id: "in_1", number: "LK-0001", pdfUrl: "https://evil.example/x.pdf" };
    const response = await get(`facture=${SUBSCRIPTION}`);
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin).toBe("https://leenkey.fr");
    expect(location.pathname).toBe("/vendeur/formule");
    expect(location.searchParams.get("document")).toBe("indisponible");
    expect(location.searchParams.get("bien")).toBe(PROPERTY);
    expect(location.hash).toBe("#factures");

    state.creditNoteUrl = "https://stripe.com.evil.example/x.pdf";
    const note = await get(`avoir=${NOTE}`);
    expect(new URL(note.headers.get("location") ?? "").origin).toBe("https://leenkey.fr");
  });

  it("no PDF yet: back to the list, which says so", async () => {
    state.invoice = { id: "in_1", number: null, pdfUrl: null };
    const response = await get(`facture=${SUBSCRIPTION}`);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `https://leenkey.fr/vendeur/formule?bien=${PROPERTY}&document=indisponible#factures`,
    );
  });

  it("Stripe down: back to the list for an invoice (logged, never an empty page)", async () => {
    state.stripeDown = true;
    const response = await get(`facture=${SUBSCRIPTION}`);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `https://leenkey.fr/vendeur/formule?bien=${PROPERTY}&document=indisponible#factures`,
    );
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("document not served");
    expect(logged).not.toContain("https://");
  });

  it("Stripe down: the address kept when the credit note was created still opens it", async () => {
    state.stripeDown = true;
    const response = await get(`avoir=${NOTE}`);
    expect(response.headers.get("location")).toBe("https://pay.stripe.com/credit_notes/kept/pdf");
  });

  it("the base down: back to the list, without a property", async () => {
    state.readError = { code: "XX000" };
    const response = await get(`facture=${SUBSCRIPTION}`);
    expect(response.headers.get("location")).toBe(
      "https://leenkey.fr/vendeur/formule?document=indisponible#factures",
    );
  });

  it("too many downloads for the account: 429, nothing read", async () => {
    state.allowed = false;
    const response = await get(`facture=${SUBSCRIPTION}`);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    expect(state.asked).toEqual([]);
  });

  it("the team: the opening is written before the document is served, or nothing is served", async () => {
    state.profile = { id: "admin", roles: ["admin"] };
    expect((await get(`avoir=${NOTE}`)).status).toBe(303);
    expect(state.rpc).toEqual([
      { fn: "billing_document_opened", args: { p_kind: "avoir", p_id: NOTE } },
    ]);
    state.rpcError = { code: "XX000" };
    state.asked = [];
    expect((await get(`facture=${SUBSCRIPTION}`)).status).toBe(404);
    expect(state.asked).toEqual([]);
  });

  it("STRIPE_MOCK: the mocked PDF served here, for an invoice and a credit note", async () => {
    state.mocked = true;
    for (const query of [`facture=${SUBSCRIPTION}`, `avoir=${NOTE}`]) {
      const response = await get(query);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(
        Buffer.from(await response.arrayBuffer())
          .subarray(0, 5)
          .toString("latin1"),
      ).toBe("%PDF-");
    }
    expect(state.asked).toEqual([]);
  });
});
