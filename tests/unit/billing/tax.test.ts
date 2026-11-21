import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { checkoutLineItem } = await import("@/core/billing/stripe");

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
