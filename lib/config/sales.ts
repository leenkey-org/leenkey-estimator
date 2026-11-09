import { appEnv, type AppEnv } from "@/lib/env";

// Ordering a paid plan (SPEC-V2 section 11, decision of 2026-10-15). In
// production, the paid plans can be ordered only once the final CGV and the
// consumer mediator are there (DECISIONS Q32 and Q34, SPEC P-05b); in local
// and preprod they can, on Stripe test.

export type Mediator = { name: string; address: string; url: string };

export const SALES_TERMS = {
  /** Published version (date) of the CGV accepted at checkout (/cgv, lib/i18n/legal-policies.ts). */
  cgvVersion: "2026-11-09",
  /** The CGV for the launch are published (DECISIONS.md 2026-11-09, Q34). */
  cgvFinal: true,
  /** The consumer mediator Leenkey joined (Q32), null until then. */
  mediator: null as Mediator | null,
} as const;

export function paidPlansOrderable(env: AppEnv = appEnv()): boolean {
  if (env !== "production") return true;
  return SALES_TERMS.cgvFinal && SALES_TERMS.mediator !== null;
}
