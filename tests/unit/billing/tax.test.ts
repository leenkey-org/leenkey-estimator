import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { checkoutLineItem, invoiceCreation } = await import("@/core/billing/stripe");

// VAT on the orders (Cédric, 2026-11-19; DECISIONS.md 2026-11-21): the price
// stays all taxes included, the inclusive tax rate of Stripe shows the VAT on
// the receipt and the invoice.
describe("the line of an order", () => {
  it("carries the tax rate when STRIPE_TAX_RATE is set", () => {
    expect(checkoutLineItem("price_1", "txr_123")).toEqual({
      price: "price_1",
      quantity: 1,
      tax_rates: ["txr_123"],
    });
    expect(checkoutLineItem("price_1", " txr_123 ")).toEqual({
      price: "price_1",
      quantity: 1,
      tax_rates: ["txr_123"],
    });
  });

  it("has no tax line without it", () => {
    expect(checkoutLineItem("price_1", undefined)).toEqual({ price: "price_1", quantity: 1 });
    expect(checkoutLineItem("price_1", "  ")).toEqual({ price: "price_1", quantity: 1 });
  });
});

// The VAT exemption (DECISIONS 2026-11-25): its notice at the bottom of the
// invoice, never next to a tax line.
describe("invoiceCreation", () => {
  const notice = "TVA non applicable, article 293 B du CGI.";
  it("prints the notice without a tax rate", () => {
    expect(invoiceCreation(notice, undefined)).toEqual({
      enabled: true,
      invoice_data: { footer: notice },
    });
    expect(invoiceCreation(notice, " ")).toEqual({
      enabled: true,
      invoice_data: { footer: notice },
    });
  });
  it("never prints it with a tax rate, nor without a notice", () => {
    expect(invoiceCreation(notice, "txr_123")).toEqual({ enabled: true });
    expect(invoiceCreation(undefined, undefined)).toEqual({ enabled: true });
  });

  // « Facture acquittée » (Cédric, 2026-11-26): a line of the header of the
  // invoice, with or without a tax rate.
  it("prints the lines of the header, next to the notice or alone", () => {
    const paid = [{ name: "Paiement", value: "Facture acquittée" }];
    expect(invoiceCreation(notice, undefined, paid)).toEqual({
      enabled: true,
      invoice_data: { footer: notice, custom_fields: paid },
    });
    expect(invoiceCreation(notice, "txr_123", paid)).toEqual({
      enabled: true,
      invoice_data: { custom_fields: paid },
    });
    expect(invoiceCreation(undefined, undefined, [])).toEqual({ enabled: true });
  });
});
