import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The documents of a paid plan (Cédric, 2026-11-26; DECISIONS.md): what is
// asked of Stripe when an order is created (the billing address, « Facture
// acquittée », the VAT notice), the invoice of a session read back, its PDF
// fetched to be attached to an email (never thrown, a link otherwise), and
// the mock, which gives the same bytes without a call.

type Invoice = { id: string; number: string | null; invoice_pdf?: string | null };

const sdk = vi.hoisted(() => ({
  sessions: [] as { params: Record<string, unknown>; options: Record<string, unknown> }[],
  retrieved: [] as { id: string; params: unknown }[],
  // What the session holds at each reading: the invoice comes late.
  invoices: [] as (Invoice | string | null)[],
  fail: false,
  hang: false,
}));

vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({
  default: class {
    checkout = {
      sessions: {
        create: async (params: Record<string, unknown>, options: Record<string, unknown>) => {
          sdk.sessions.push({ params, options });
          return { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" };
        },
        retrieve: async (id: string, params: unknown) => {
          if (sdk.fail) throw new Error("Stripe is down");
          if (sdk.hang) return new Promise(() => {});
          sdk.retrieved.push({ id, params });
          const invoice = sdk.invoices.length > 1 ? sdk.invoices.shift() : sdk.invoices[0];
          return { id, invoice: invoice ?? null };
        },
      },
    };
    creditNotes = {
      retrieve: async (id: string) => ({
        id,
        pdf: `https://pay.stripe.com/credit_notes/${id}/pdf`,
      }),
    };
  },
}));

const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "latin1");
const fetchMock = vi.fn();

function answer(body: Buffer | string, init: { status?: number; length?: string } = {}) {
  const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: new Headers(init.length ? { "content-length": init.length } : {}),
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

beforeEach(() => {
  sdk.sessions = [];
  sdk.retrieved = [];
  sdk.invoices = [];
  sdk.fail = false;
  sdk.hang = false;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_ENV", "staging");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://leenkey-v2.vercel.app");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unit");
  vi.stubEnv("STRIPE_MOCK", "");
  vi.stubEnv("STRIPE_TAX_RATE", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("createCheckoutSession", () => {
  it("asks the billing address and prints « Facture acquittée » and the VAT notice on the invoice", async () => {
    const { createCheckoutSession } = await import("@/core/billing/stripe");
    const { INVOICE_PAID_FIELD, VAT_EXEMPTION_NOTICE } = await import("@/lib/config/sales");
    await createCheckoutSession({
      priceId: "price_1",
      customerEmail: "bruno@exemple.test",
      metadata: { plan: "accompagne" },
      clientReferenceId: "p1",
      successUrl: "https://leenkey-v2.vercel.app/ok",
      cancelUrl: "https://leenkey-v2.vercel.app/ko",
      idempotencyKey: "key-1",
      invoiceFooter: VAT_EXEMPTION_NOTICE,
      invoiceCustomFields: [INVOICE_PAID_FIELD],
    });
    expect(sdk.sessions).toHaveLength(1);
    expect(sdk.sessions[0]?.params).toMatchObject({
      mode: "payment",
      customer_email: "bruno@exemple.test",
      billing_address_collection: "required",
      invoice_creation: {
        enabled: true,
        invoice_data: {
          footer: "TVA non applicable, article 293 B du CGI.",
          custom_fields: [{ name: "Paiement", value: "Facture acquittée" }],
        },
      },
    });
    expect(sdk.sessions[0]?.options).toEqual({ idempotencyKey: "key-1" });
    // The limits of Stripe for a line of the header of an invoice.
    expect(INVOICE_PAID_FIELD.name.length).toBeLessThanOrEqual(40);
    expect(INVOICE_PAID_FIELD.value.length).toBeLessThanOrEqual(140);
  });
});

describe("checkoutInvoice", () => {
  it("reads the invoice of the session, expanded, with the address of its PDF", async () => {
    sdk.invoices = [{ id: "in_1", number: "LK-0001", invoice_pdf: "https://pay.stripe.com/i/pdf" }];
    const { checkoutInvoice } = await import("@/core/billing/stripe");
    expect(await checkoutInvoice("cs_1")).toEqual({
      id: "in_1",
      number: "LK-0001",
      pdfUrl: "https://pay.stripe.com/i/pdf",
    });
    expect(sdk.retrieved).toEqual([{ id: "cs_1", params: { expand: ["invoice"] } }]);
  });

  it("no invoice yet, or not finalized: nothing to download", async () => {
    const { checkoutInvoice } = await import("@/core/billing/stripe");
    sdk.invoices = [null];
    expect(await checkoutInvoice("cs_1")).toBeNull();
    sdk.invoices = [{ id: "in_1", number: null, invoice_pdf: null }];
    expect(await checkoutInvoice("cs_1")).toEqual({ id: "in_1", number: null, pdfUrl: null });
  });
});

describe("isStripeUrl", () => {
  it("https on stripe.com or a subdomain of it, nothing else", async () => {
    const { isStripeUrl } = await import("@/core/billing/stripe");
    for (const url of [
      "https://pay.stripe.com/invoice/acct_1/test_x/pdf?s=ap",
      "https://files.stripe.com/v1/files/file_1/contents",
      "https://stripe.com/x",
    ]) {
      expect(isStripeUrl(url)).toBe(true);
    }
    for (const url of [
      "https://evil.example/x.pdf",
      "https://stripe.com.evil.example/x.pdf",
      "https://evilstripe.com/x.pdf",
      "https://pay.stripe.com@evil.example/x.pdf",
      "http://pay.stripe.com/x.pdf",
      "javascript:alert(1)",
      "not an address",
      "",
      null,
      undefined,
    ]) {
      expect(isStripeUrl(url)).toBe(false);
    }
  });
});

describe("downloadPdf", () => {
  it("gives the bytes of a PDF", async () => {
    fetchMock.mockResolvedValue(answer(PDF));
    const { downloadPdf } = await import("@/core/billing/stripe");
    const bytes = await downloadPdf("https://pay.stripe.com/i/pdf");
    expect(bytes?.equals(PDF)).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://pay.stripe.com/i/pdf");
  });

  it("never asks another host than Stripe, nor follows a redirect out of it", async () => {
    const { downloadPdf } = await import("@/core/billing/stripe");
    expect(await downloadPdf("https://evil.example/x.pdf")).toBeNull();
    expect(await downloadPdf("http://pay.stripe.com/i/pdf")).toBeNull();
    expect(await downloadPdf(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    // A real PDF, but served from elsewhere after redirects: refused.
    fetchMock.mockResolvedValueOnce({ ...answer(PDF), url: "https://evil.example/x.pdf" });
    expect(await downloadPdf("https://pay.stripe.com/i/pdf")).toBeNull();
    fetchMock.mockResolvedValueOnce({ ...answer(PDF), url: "https://files.stripe.com/f/x" });
    expect((await downloadPdf("https://pay.stripe.com/i/pdf"))?.equals(PDF)).toBe(true);
  });

  it("refused, not a PDF, too large, unreachable: null, never thrown", async () => {
    const { downloadPdf, PDF_MAX_BYTES } = await import("@/core/billing/stripe");
    fetchMock.mockResolvedValueOnce(answer("gone", { status: 404 }));
    expect(await downloadPdf("https://pay.stripe.com/i/pdf")).toBeNull();
    fetchMock.mockResolvedValueOnce(answer("<html>Sign in</html>"));
    expect(await downloadPdf("https://pay.stripe.com/i/pdf")).toBeNull();
    fetchMock.mockResolvedValueOnce(answer(PDF, { length: String(PDF_MAX_BYTES + 1) }));
    expect(await downloadPdf("https://pay.stripe.com/i/pdf")).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect(await downloadPdf("https://pay.stripe.com/i/pdf")).toBeNull();
  });

  it("a body without a declared length is read piece by piece and dropped once too large", async () => {
    const { downloadPdf, PDF_MAX_BYTES } = await import("@/core/billing/stripe");
    const piece = new Uint8Array(1024 * 1024).fill(0x20);
    piece.set(Buffer.from("%PDF-", "latin1"));
    let pulled = 0;
    let cancelled = false;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(piece);
      },
      cancel() {
        cancelled = true;
      },
    });
    fetchMock.mockResolvedValueOnce(new Response(endless));
    expect(await downloadPdf("https://pay.stripe.com/i/pdf")).toBeNull();
    // Stopped just over the cap, never read to the end (there is none).
    expect(pulled).toBeLessThanOrEqual(PDF_MAX_BYTES / piece.byteLength + 3);
    expect(cancelled).toBe(true);
    // A small streamed PDF passes.
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array(PDF)));
    expect((await downloadPdf("https://pay.stripe.com/i/pdf"))?.equals(PDF)).toBe(true);
  });

  it("STRIPE_MOCK: always the same bytes, no call leaves", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENV", "local");
    vi.stubEnv("STRIPE_MOCK", "1");
    const { checkoutInvoice, creditNotePdfUrl, downloadPdf, isStripeUrl, MOCK_PDF } =
      await import("@/core/billing/stripe");
    const invoice = await checkoutInvoice("cs_mock_abc");
    expect(invoice).toEqual({
      id: "in_mock_csmockabc",
      number: "MOCK-F-0001",
      pdfUrl: "https://pay.stripe.com/mock/invoices/in_mock_csmockabc/pdf",
    });
    // Mocked addresses pass the same checks as real ones, and are never fetched.
    expect(isStripeUrl(invoice?.pdfUrl)).toBe(true);
    expect(isStripeUrl(await creditNotePdfUrl("cn_mock_1"))).toBe(true);
    const bytes = await downloadPdf(invoice?.pdfUrl ?? null);
    expect(bytes?.equals(MOCK_PDF)).toBe(true);
    expect(MOCK_PDF.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sdk.retrieved).toEqual([]);
  });
});

describe("orderInvoiceAttachment", () => {
  afterEach(() => vi.useRealTimers());

  it("attaches the invoice under its number, in base64", async () => {
    sdk.invoices = [
      { id: "in_1", number: "LK/0001 A", invoice_pdf: "https://pay.stripe.com/i/pdf" },
    ];
    fetchMock.mockResolvedValue(answer(PDF));
    const { orderInvoiceAttachment } = await import("@/leenkey/billing/documents");
    expect(await orderInvoiceAttachment("cs_1", { pauseMs: 0 })).toEqual({
      filename: "facture-leenkey-LK0001A.pdf",
      content: PDF.toString("base64"),
    });
    expect(sdk.retrieved).toHaveLength(1);
  });

  it("waits for an invoice Stripe has not finalized yet", async () => {
    sdk.invoices = [
      null,
      { id: "in_1", number: null, invoice_pdf: null },
      { id: "in_1", number: "LK-0001", invoice_pdf: "https://pay.stripe.com/i/pdf" },
    ];
    fetchMock.mockResolvedValue(answer(PDF));
    const { orderInvoiceAttachment } = await import("@/leenkey/billing/documents");
    const attachment = await orderInvoiceAttachment("cs_1", { pauseMs: 1 });
    expect(attachment?.filename).toBe("facture-leenkey-LK-0001.pdf");
    expect(sdk.retrieved).toHaveLength(3);
  });

  it("a PDF that does not download is not asked a second time", async () => {
    sdk.invoices = [{ id: "in_1", number: "LK-0001", invoice_pdf: "https://pay.stripe.com/i/pdf" }];
    fetchMock.mockResolvedValue(answer("gone", { status: 500 }));
    const { orderInvoiceAttachment } = await import("@/leenkey/billing/documents");
    expect(await orderInvoiceAttachment("cs_1", { pauseMs: 1 })).toBeNull();
    expect(sdk.retrieved).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("no invoice in the budget: asked every second, then null (the email carries a link)", async () => {
    vi.useFakeTimers();
    sdk.invoices = [null];
    const { orderInvoiceAttachment, INVOICE_BUDGET_MS } =
      await import("@/leenkey/billing/documents");
    let result: unknown = "pending";
    void orderInvoiceAttachment("cs_1").then((value) => {
      result = value;
    });
    await vi.advanceTimersByTimeAsync(INVOICE_BUDGET_MS - 1_500);
    expect(result).toBe("pending");
    await vi.advanceTimersByTimeAsync(1_500);
    expect(result).toBeNull();
    // At 0, 1, 2, 3, 4 and 5 s; none once a pause would end at the deadline.
    expect(sdk.retrieved).toHaveLength(6);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Stripe that never answers: null when the budget ends, never later", async () => {
    vi.useFakeTimers();
    sdk.hang = true;
    const { orderInvoiceAttachment, INVOICE_BUDGET_MS } =
      await import("@/leenkey/billing/documents");
    let result: unknown = "pending";
    void orderInvoiceAttachment("cs_1").then((value) => {
      result = value;
    });
    await vi.advanceTimersByTimeAsync(INVOICE_BUDGET_MS - 1);
    expect(result).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(result).toBeNull();
    expect(INVOICE_BUDGET_MS).toBeLessThanOrEqual(6_000);
  });

  it("a download that hangs: null when the budget ends", async () => {
    vi.useFakeTimers();
    sdk.invoices = [{ id: "in_1", number: "LK-0001", invoice_pdf: "https://pay.stripe.com/i/pdf" }];
    fetchMock.mockReturnValue(new Promise(() => {}));
    const { orderInvoiceAttachment, INVOICE_BUDGET_MS } =
      await import("@/leenkey/billing/documents");
    let result: unknown = "pending";
    void orderInvoiceAttachment("cs_1").then((value) => {
      result = value;
    });
    await vi.advanceTimersByTimeAsync(INVOICE_BUDGET_MS);
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("Stripe down: null, never thrown", async () => {
    const { orderInvoiceAttachment } = await import("@/leenkey/billing/documents");
    sdk.fail = true;
    expect(await orderInvoiceAttachment("cs_1", { pauseMs: 1 })).toBeNull();
  });

  it("STRIPE_MOCK: the mocked invoice, at once", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENV", "local");
    vi.stubEnv("STRIPE_MOCK", "1");
    const { MOCK_PDF } = await import("@/core/billing/stripe");
    const { orderInvoiceAttachment } = await import("@/leenkey/billing/documents");
    expect(await orderInvoiceAttachment("cs_mock_abc")).toEqual({
      filename: "facture-leenkey-MOCK-F-0001.pdf",
      content: MOCK_PDF.toString("base64"),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("creditNoteAttachment", () => {
  it("attaches the credit note, or nothing when its PDF does not come", async () => {
    const { creditNoteAttachment } = await import("@/leenkey/billing/documents");
    fetchMock.mockResolvedValueOnce(answer(PDF));
    expect(
      await creditNoteAttachment({ number: "LK-0001-CN-01", pdfUrl: "https://pay.stripe.com/c" }),
    ).toEqual({ filename: "avoir-leenkey-LK-0001-CN-01.pdf", content: PDF.toString("base64") });
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect(
      await creditNoteAttachment({ number: "LK-0001-CN-01", pdfUrl: "https://pay.stripe.com/c" }),
    ).toBeNull();
    expect(await creditNoteAttachment({ number: "LK-0001-CN-01", pdfUrl: null })).toBeNull();
  });
});

describe("paymentsUrl", () => {
  it("leads to « Mes factures et paiements » of the property", async () => {
    const { paymentsUrl } = await import("@/leenkey/billing/documents");
    expect(paymentsUrl("p1")).toBe(
      "https://leenkey-v2.vercel.app/vendeur/formule?bien=p1#factures",
    );
  });
});
