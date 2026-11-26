import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The emails of a paid plan with their documents (Cédric, 2026-11-26;
// DECISIONS.md): the confirmation of the order with its invoice, the
// confirmation of a refund with its credit note, as Resend receives them
// (to the test inbox outside production), the link when the PDF could not
// be fetched, and the refund email once per credit note.

vi.mock("server-only", () => ({}));

const fetchMock = vi.fn();
const PDF = { filename: "avoir-leenkey-LK-0001-CN-01.pdf", content: "JVBERi0xLjc=" };

type Sent = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: string }[];
};

function sent(index = 0): { body: Sent; headers: Record<string, string> } {
  const [, init] = fetchMock.mock.calls[index] as [
    string,
    { body: string; headers: Record<string, string> },
  ];
  return { body: JSON.parse(init.body) as Sent, headers: init.headers };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_ENV", "staging");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://leenkey-v2.vercel.app");
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_TEST_INBOX", "boite@exemple.test");
  vi.stubEnv("STRIPE_MOCK", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const order = {
  sellerEmail: "bruno@exemple.test",
  sellerFirstName: "Bruno",
  sellerName: "Bruno Lefèvre",
  planName: "Accompagné",
  upgrade: false,
  property: "LK-0009",
  propertyId: "5eed1000-0000-4000-8000-000000000009",
  amountCents: 99000,
  earlyStart: false,
  activatedAt: new Date("2026-11-02T10:00:00Z"),
  endsAt: new Date("2027-11-02T10:00:00Z"),
  features: ["Un conseiller Leenkey dédié"],
  cguVersion: "2026-06-28",
  cgvVersion: "2026-11-25",
  held: false,
  check: [],
};

const refund = {
  sellerEmail: "bruno@exemple.test",
  sellerFirstName: "Bruno",
  planName: "Accompagné",
  property: "LK-0009",
  propertyId: "5eed1000-0000-4000-8000-000000000009",
  amountCents: 99000,
  refundedAt: "2026-11-10T10:00:00Z",
  withdrawnAt: "2026-11-05T13:05:00Z" as string | null,
  creditNote: { stripeId: "cn_1", number: "LK-0001-CN-01" },
};

describe("emailPlanActivated", () => {
  it("leaves with the invoice attached, and says so", async () => {
    const { emailPlanActivated } = await import("@/leenkey/billing/emails");
    const invoice = { filename: "facture-leenkey-LK-0001.pdf", content: "JVBERi0xLjc=" };
    expect(await emailPlanActivated(order, invoice)).toBe("test");
    const { body } = sent();
    expect(body.to).toEqual(["boite@exemple.test"]);
    expect(body.subject).toBe(
      "[PREPROD] Confirmation de votre souscription Leenkey · Accompagné · LK-0009",
    );
    expect(body.attachments).toEqual([invoice]);
    expect(body.text).toContain("Votre facture acquittée est jointe à cet email.");
    expect(body.text).toContain("« Mes factures et paiements »");
    expect(body.text).not.toContain("télécharger ma facture");
    expect(body.text).not.toContain("Le reçu et la facture");
  });

  it("without the PDF: no attachment, a link to « Mes factures et paiements »", async () => {
    const { emailPlanActivated } = await import("@/leenkey/billing/emails");
    expect(await emailPlanActivated(order, null)).toBe("test");
    const { body } = sent();
    expect(body).not.toHaveProperty("attachments");
    expect(body.text).toContain("Votre facture acquittée est à télécharger dans votre espace");
    expect(body.text).toContain(
      "https://leenkey-v2.vercel.app/vendeur/formule?bien=5eed1000-0000-4000-8000-000000000009#factures",
    );
    expect(body.text).not.toContain("est jointe à cet email");
  });
});

describe("emailPlanRefunded", () => {
  it("says the amount, the plan, what the seller keeps, with the credit note attached", async () => {
    const { emailPlanRefunded } = await import("@/leenkey/billing/emails");
    expect(await emailPlanRefunded(refund, PDF)).toBe("test");
    const { body, headers } = sent();
    expect(body.to).toEqual(["boite@exemple.test"]);
    expect(body.subject).toBe(
      "[PREPROD] Confirmation de votre remboursement · formule Accompagné · LK-0009",
    );
    expect(body.attachments).toEqual([PDF]);
    expect(headers["Idempotency-Key"]).toBe("plan-refunded-cn_1");
    expect(body.text).toContain("Bonjour Bruno,");
    expect(body.text).toMatch(
      /Nous vous avons remboursé 990\s€ le 10 novembre 2026 pour votre formule Accompagné \(bien LK-0009\)/,
    );
    expect(body.text).toContain("TVA non applicable, article 293 B du CGI.");
    expect(body.text).toContain(
      "Ce remboursement fait suite à l'exercice de votre droit de rétractation, le 5 novembre 2026.",
    );
    expect(body.text).toContain(
      "Votre annonce, vos documents, vos messages et l'avancement de votre vente restent en place",
    );
    expect(body.text).toContain("Votre avoir LK-0001-CN-01 est joint à cet email.");
    expect(body.text).not.toContain("télécharger mon avoir");
    // Editorial rules (CLAUDE.md section 16).
    expect(body.text).not.toMatch(/\bon\b/i);
    expect(body.text).not.toContain("TTC");
    expect(body.html).toContain("#020D21");
  });

  it("without the PDF: no attachment, a link; without a withdrawal: no word of it", async () => {
    const { emailPlanRefunded } = await import("@/leenkey/billing/emails");
    expect(
      await emailPlanRefunded({ ...refund, withdrawnAt: null, amountCents: 51000 }, null),
    ).toBe("test");
    const { body } = sent();
    expect(body).not.toHaveProperty("attachments");
    expect(body.text).toMatch(/remboursé 510\s€/);
    expect(body.text).toContain("Votre avoir LK-0001-CN-01 est à télécharger dans votre espace");
    expect(body.text).toContain(
      "https://leenkey-v2.vercel.app/vendeur/formule?bien=5eed1000-0000-4000-8000-000000000009#factures",
    );
    expect(body.text).not.toContain("rétractation");
    expect(body.text).not.toContain("est joint à cet email");
  });

  it("no address, or Resend refusing: failed, never thrown", async () => {
    const { emailPlanRefunded } = await import("@/leenkey/billing/emails");
    expect(await emailPlanRefunded({ ...refund, sellerEmail: null }, PDF)).toBe("failed");
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await emailPlanRefunded(refund, PDF)).toBe("failed");
  });
});

// --- emailCreditNotes: once per credit note ------------------------------------

type NoteRow = {
  id: string;
  stripe_credit_note_id: string;
  number: string;
  amount_cents: number;
  pdf_url: string | null;
  issued_at: string;
  refund_emailed_at: string | null;
};

function database(notes: NoteRow[], options: { email?: string | null } = {}) {
  const rpc: { fn: string; id: string }[] = [];
  const tables: Record<string, unknown> = {
    subscriptions: {
      id: "s1",
      owner_id: "u1",
      property_id: "p1",
      plan: "accompagne",
      withdrawal_requested_at: "2026-11-05T13:05:00Z",
    },
    plans: { name: "Accompagné" },
    listings: { reference: "LK-0009" },
    properties: { city: "Savigny-sur-Orge" },
    profiles: { first_name: "Bruno" },
  };
  const supabase = {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const name of ["select", "eq", "is"]) chain[name] = () => chain;
      // credit_notes: those still to email.
      chain.order = async () => ({
        data: notes.filter((item) => item.refund_emailed_at === null),
        error: null,
      });
      chain.maybeSingle = async () => ({ data: tables[table] ?? null, error: null });
      return chain;
    },
    rpc: async (fn: string, args: { p_credit_note_id: string }) => {
      rpc.push({ fn, id: args.p_credit_note_id });
      const row = notes.find((item) => item.id === args.p_credit_note_id);
      if (fn === "credit_note_email_claim") {
        if (!row || row.refund_emailed_at !== null) return { data: false, error: null };
        row.refund_emailed_at = "now";
        return { data: true, error: null };
      }
      if (row) row.refund_emailed_at = null;
      return { data: null, error: null };
    },
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: options.email === null ? null : { email: options.email ?? "bruno@exemple.test" },
          },
          error: null,
        }),
      },
    },
  };
  return { supabase, rpc };
}

const row = (overrides: Partial<NoteRow> = {}): NoteRow => ({
  id: "n1",
  stripe_credit_note_id: "cn_1",
  number: "LK-0001-CN-01",
  amount_cents: 99000,
  pdf_url: null,
  issued_at: "2026-11-10T10:00:00Z",
  refund_emailed_at: null,
  ...overrides,
});

describe("emailCreditNotes", () => {
  it("one email per credit note, each with its amount; a second pass sends nothing", async () => {
    const { emailCreditNotes } = await import("@/leenkey/billing/refund-emails");
    const notes = [
      row({ amount_cents: 51000 }),
      row({ id: "n2", stripe_credit_note_id: "cn_2", number: "LK-0001-CN-02" }),
    ];
    const { supabase, rpc } = database(notes);
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 2, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sent(0).body.text).toMatch(/remboursé 510\s€/);
    expect(sent(0).body.text).toContain("Votre avoir LK-0001-CN-01");
    expect(sent(1).body.text).toMatch(/remboursé 990\s€/);
    expect(sent(1).headers["Idempotency-Key"]).toBe("plan-refunded-cn_2");
    // No address of the PDF: the link, never a lost email.
    expect(sent(0).body).not.toHaveProperty("attachments");
    expect(sent(0).body.text).toContain("#factures");
    expect(rpc.map((call) => call.fn)).toEqual([
      "credit_note_email_claim",
      "credit_note_email_claim",
    ]);
    // The webhook delivered again, « Créer l'avoir » clicked again.
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 0, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("taken by another delivery meanwhile: nothing sent", async () => {
    const { emailCreditNotes } = await import("@/leenkey/billing/refund-emails");
    const { supabase } = database([row()]);
    const claim = supabase.rpc;
    supabase.rpc = async (fn, args) => {
      if (fn === "credit_note_email_claim") return { data: false, error: null };
      return claim(fn, args);
    };
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an email that could not leave is given back, and leaves at the next pass", async () => {
    const { emailCreditNotes } = await import("@/leenkey/billing/refund-emails");
    const notes = [row()];
    const { supabase, rpc } = database(notes);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 0, failed: 1 });
    expect(rpc.map((call) => call.fn)).toEqual([
      "credit_note_email_claim",
      "credit_note_email_release",
    ]);
    expect(notes[0]?.refund_emailed_at).toBeNull();
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 1, failed: 0 });
  });

  it("the PDF of the credit note attached when Stripe serves it", async () => {
    const { emailCreditNotes } = await import("@/leenkey/billing/refund-emails");
    const pdf = Buffer.from("%PDF-1.7\n%%EOF\n", "latin1");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
    });
    const { supabase } = database([row({ pdf_url: "https://pay.stripe.com/credit_notes/x/pdf" })]);
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 1, failed: 0 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://pay.stripe.com/credit_notes/x/pdf");
    expect(sent(1).body.attachments).toEqual([
      { filename: "avoir-leenkey-LK-0001-CN-01.pdf", content: pdf.toString("base64") },
    ]);
    expect(sent(1).body.text).toContain("est joint à cet email");
  });

  it("STRIPE_MOCK: the mocked PDF attached, no call to Stripe", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENV", "local");
    vi.stubEnv("STRIPE_MOCK", "1");
    const { MOCK_PDF } = await import("@/core/billing/stripe");
    const { emailCreditNotes } = await import("@/leenkey/billing/refund-emails");
    const { supabase } = database([
      row({ stripe_credit_note_id: "cn_mock_pi1", number: "MOCK-0001" }),
    ]);
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 1, failed: 0 });
    // The one call is Resend's.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sent().body.subject).toMatch(/^\[LOCAL\] Confirmation de votre remboursement/);
    expect(sent().body.attachments).toEqual([
      { filename: "avoir-leenkey-MOCK-0001.pdf", content: MOCK_PDF.toString("base64") },
    ]);
  });

  it("an account without an address, or a database error: nothing sent, never thrown", async () => {
    const { emailCreditNotes } = await import("@/leenkey/billing/refund-emails");
    const gone = database([row()], { email: null });
    expect(await emailCreditNotes(gone.supabase as never, "s1")).toEqual({ sent: 0, failed: 0 });
    expect(gone.rpc).toEqual([]);
    const broken = {
      from: () => {
        throw new Error("down");
      },
    };
    expect(await emailCreditNotes(broken as never, "s1")).toEqual({ sent: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
