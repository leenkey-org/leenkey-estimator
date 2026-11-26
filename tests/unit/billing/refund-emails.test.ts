import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The emails of a paid plan with their documents (Cédric, 2026-11-26;
// DECISIONS.md): the confirmation of the order with its invoice, the
// confirmation of a refund with its credit note, as Resend receives them
// (to the test inbox outside production), the link when the PDF could not
// be fetched, and the refund email once per credit note.

vi.mock("server-only", () => ({}));
// pendingRefundEmails reads with the session of the caller.
const session = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  error: null as { code: string } | null,
  asked: [] as string[],
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const chain: Record<string, unknown> = {};
    chain.from = () => chain;
    chain.select = () => chain;
    chain.is = () => chain;
    chain.in = (_column: string, ids: string[]) => {
      session.asked = ids;
      return chain;
    };
    chain.order = async () => ({ data: session.error ? null : session.rows, error: session.error });
    return chain;
  },
}));

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
  issuedAt: "2026-11-10T10:00:00Z",
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

describe("emailPlanActivated, an order with nothing to pay", () => {
  it("promises no invoice (a code of 100 %): no sentence, no link, no attachment", async () => {
    const { emailPlanActivated } = await import("@/leenkey/billing/emails");
    const invoice = { filename: "facture-leenkey-LK-0001.pdf", content: "JVBERi0xLjc=" };
    for (const attached of [null, invoice]) {
      fetchMock.mockClear();
      expect(await emailPlanActivated({ ...order, amountCents: 0 }, attached)).toBe("test");
      const { body } = sent();
      expect(body).not.toHaveProperty("attachments");
      expect(body.text).not.toContain("facture");
      expect(body.text).not.toContain("#factures");
    }
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
    // The key says the PDF is attached: the same email asked again leaves once.
    expect(headers["Idempotency-Key"]).toBe("plan-refunded-cn_1-pdf");
    expect(body.text).toContain("Bonjour Bruno,");
    expect(body.text).toMatch(
      /Nous vous avons remboursé 990\s€ pour votre formule Accompagné \(bien LK-0009\), par le moyen/,
    );
    expect(body.text).toContain("TVA non applicable, article 293 B du CGI.");
    expect(body.text).toContain(
      "Ce remboursement fait suite à l'exercice de votre droit de rétractation, le 5 novembre 2026.",
    );
    expect(body.text).toContain(
      "Votre annonce, vos documents, vos messages et l'avancement de votre vente restent en place",
    );
    // The date is the one of the credit note, said as such (not the day of the refund).
    expect(body.text).toContain(
      "Votre avoir LK-0001-CN-01, émis le 10 novembre 2026, est joint à cet email.",
    );
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
    const { body, headers } = sent();
    expect(body).not.toHaveProperty("attachments");
    // Another body than with the PDF: another key, never refused for the first one.
    expect(headers["Idempotency-Key"]).toBe("plan-refunded-cn_1-link");
    expect(body.text).toMatch(/remboursé 510\s€/);
    expect(body.text).toContain(
      "Votre avoir LK-0001-CN-01, émis le 10 novembre 2026, est à télécharger dans votre espace",
    );
    expect(body.text).toContain(
      "https://leenkey-v2.vercel.app/vendeur/formule?bien=5eed1000-0000-4000-8000-000000000009#factures",
    );
    expect(body.text).not.toContain("rétractation");
    expect(body.text).not.toContain("est joint à cet email");
  });

  it("a property without a reference nor a town: no empty brackets, no subject ending in a dot", async () => {
    const { emailPlanRefunded } = await import("@/leenkey/billing/emails");
    await emailPlanRefunded({ ...refund, property: "" }, null);
    const { body } = sent();
    expect(body.subject).toBe("[PREPROD] Confirmation de votre remboursement · formule Accompagné");
    expect(body.text).toMatch(/remboursé 990\s€ pour votre formule Accompagné, par le moyen/);
    expect(body.text).not.toContain("(bien");
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
  /** In ms, on the clock of the fake base. */
  refund_email_claimed_at: number | null;
};

const TEN_MINUTES = 10 * 60 * 1000;

function database(notes: NoteRow[], options: { email?: string | null } = {}) {
  const rpc: { fn: string; id: string }[] = [];
  const clock = { now: 1_000_000_000 };
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
      // As the three SQL functions (supabase/tests/rls_billing_documents.sql).
      if (fn === "credit_note_email_claim") {
        const free =
          row &&
          row.refund_emailed_at === null &&
          (row.refund_email_claimed_at === null ||
            row.refund_email_claimed_at < clock.now - TEN_MINUTES);
        if (!row || !free) return { data: false, error: null };
        row.refund_email_claimed_at = clock.now;
        return { data: true, error: null };
      }
      if (fn === "credit_note_email_sent" && row) row.refund_emailed_at = "now";
      if (fn === "credit_note_email_release" && row && row.refund_emailed_at === null) {
        row.refund_email_claimed_at = null;
      }
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
  return { supabase, rpc, clock };
}

const row = (overrides: Partial<NoteRow> = {}): NoteRow => ({
  id: "n1",
  stripe_credit_note_id: "cn_1",
  number: "LK-0001-CN-01",
  amount_cents: 99000,
  pdf_url: null,
  issued_at: "2026-11-10T10:00:00Z",
  refund_emailed_at: null,
  refund_email_claimed_at: null,
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
    expect(sent(1).headers["Idempotency-Key"]).toBe("plan-refunded-cn_2-link");
    // No address of the PDF: the link, never a lost email.
    expect(sent(0).body).not.toHaveProperty("attachments");
    expect(sent(0).body.text).toContain("#factures");
    // Taken, handed to the mail service, then marked sent: in that order.
    expect(rpc.map((call) => `${call.fn}:${call.id}`)).toEqual([
      "credit_note_email_claim:n1",
      "credit_note_email_sent:n1",
      "credit_note_email_claim:n2",
      "credit_note_email_sent:n2",
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
    expect(notes[0]?.refund_email_claimed_at).toBeNull();
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 1, failed: 0 });
    expect(notes[0]?.refund_emailed_at).toBe("now");
  });

  it("a sender that died after taking it: nothing for 10 minutes, then the email leaves", async () => {
    const { emailCreditNotes } = await import("@/leenkey/billing/refund-emails");
    const notes = [row()];
    const { supabase, clock } = database(notes);
    // Taken, then nothing: neither sent nor released.
    notes[0]!.refund_email_claimed_at = clock.now;
    clock.now += 9 * 60 * 1000;
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    clock.now += 2 * 60 * 1000;
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(notes[0]?.refund_emailed_at).toBe("now");
  });

  it("left but not marked (the base failed after the mail service): the same key at the next pass", async () => {
    const { emailCreditNotes } = await import("@/leenkey/billing/refund-emails");
    const notes = [row()];
    const { supabase, clock } = database(notes);
    const real = supabase.rpc;
    let broken = true;
    supabase.rpc = async (fn, args) => {
      if (fn === "credit_note_email_sent" && broken) {
        return { data: null, error: { code: "XX000" } } as never;
      }
      return real(fn, args);
    };
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 1, failed: 0 });
    broken = false;
    clock.now += 11 * 60 * 1000;
    expect(await emailCreditNotes(supabase as never, "s1")).toEqual({ sent: 1, failed: 0 });
    // Asked twice of the mail service under one key: it sends once.
    expect(sent(0).headers["Idempotency-Key"]).toBe("plan-refunded-cn_1-link");
    expect(sent(1).headers["Idempotency-Key"]).toBe(sent(0).headers["Idempotency-Key"]);
    expect(JSON.stringify(sent(1).body)).toBe(JSON.stringify(sent(0).body));
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

describe("pendingRefundEmails", () => {
  beforeEach(() => {
    session.rows = [];
    session.error = null;
    session.asked = [];
  });

  it("the credit notes of these plans whose email is still to send", async () => {
    session.rows = [
      {
        id: "n1",
        subscription_id: "s1",
        number: "LK-0001-CN-01",
        amount_cents: 51000,
        issued_at: "2026-11-10T10:00:00Z",
      },
    ];
    const { pendingRefundEmails } = await import("@/leenkey/billing/refund-emails");
    expect(await pendingRefundEmails(["s1", "s2"])).toEqual([
      {
        subscriptionId: "s1",
        creditNoteId: "n1",
        number: "LK-0001-CN-01",
        amountCents: 51000,
        issuedAt: "2026-11-10T10:00:00Z",
      },
    ]);
    expect(session.asked).toEqual(["s1", "s2"]);
  });

  it("no plan: nothing asked; a read that failed: null", async () => {
    const { pendingRefundEmails } = await import("@/leenkey/billing/refund-emails");
    expect(await pendingRefundEmails([])).toEqual([]);
    session.error = { code: "XX000" };
    expect(await pendingRefundEmails(["s1"])).toBeNull();
  });
});
