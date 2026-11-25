import { appEnv, type AppEnv } from "@/lib/env";

// Ordering a paid plan (SPEC-V2 section 11, decision of 2026-10-15). In
// production, the paid plans can be ordered only once the final CGV and the
// consumer mediator are there (DECISIONS Q32 and Q34, SPEC P-05b), and the
// Stripe key of production is set; in local and preprod they can, on Stripe
// test.

export type Mediator = { name: string; address: string; url: string; phone: string };

/**
 * The consumer mediator Leenkey joined (Q32, DECISIONS.md 2026-11-24): CM2C,
 * membership until 24 November 2029.
 */
export const MEDIATOR: Mediator = {
  name: "Centre de la Médiation de la Consommation de Conciliateurs de Justice (CM2C)",
  address: "49 rue de Ponthieu, 75008 Paris",
  url: "https://www.cm2c.net/",
  phone: "01 89 47 00 14",
};

export const SALES_TERMS = {
  /** Published version (date) of the CGV accepted at checkout (/cgv, lib/i18n/legal-policies.ts). */
  cgvVersion: "2026-11-25",
  /** The CGV for the launch are published (DECISIONS.md 2026-11-09, Q34). */
  cgvFinal: true,
  /** The consumer mediator Leenkey joined (Q32). */
  mediator: MEDIATOR as Mediator | null,
} as const;

/**
 * In production, also the secret key of Stripe: without it a paid plan would
 * be offered and then refused at the payment (the page and the assistant say
 * instead that the plans are not open yet). Read on the server only.
 */
export function paidPlansOrderable(
  env: AppEnv = appEnv(),
  stripeKey: boolean = Boolean(process.env.STRIPE_SECRET_KEY),
): boolean {
  if (env !== "production") return true;
  return SALES_TERMS.cgvFinal && SALES_TERMS.mediator !== null && stripeKey;
}

/**
 * Leenkey is under the VAT exemption of small businesses (franchise en base,
 * article 293 B of the CGI; Younes, 2026-11-25): no VAT is charged, and the
 * invoices and receipts say so (article 242 nonies A of annex II of the
 * CGI). Any VAT written on an invoice would be due (article 283-3).
 */
export const VAT_EXEMPTION_NOTICE = "TVA non applicable, article 293 B du CGI.";
