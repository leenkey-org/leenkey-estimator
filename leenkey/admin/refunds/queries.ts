import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import { creditNoteState, refundStatus, sortRefunds, waitsForRefund } from "./status";

// Reads of /admin/remboursements (DECISIONS.md 2026-11-25), with the admin's
// session: admin_refunds() checks is_admin() itself (it reads stripe_events,
// which no client reads); requireAdmin() too (a 404 for anyone else).

type PlanCode = Database["public"]["Enums"]["plan_code"];

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type AdminCreditNote = {
  number: string;
  amountCents: number;
  pdfUrl: string | null;
  issuedAt: string;
};

export type AdminRefundRow = {
  subscriptionId: string;
  propertyId: string;
  /** « LK-0009 », else the town of a property without a listing. */
  reference: string | null;
  city: string | null;
  ownerId: string;
  sellerName: string | null;
  plan: PlanCode;
  amountPaidCents: number;
  activatedAt: string;
  requestedAt: string | null;
  refundedAt: string | null;
  refundedCents: number;
  lastRefundAt: string | null;
  paymentIntentId: string | null;
  /** The plan that replaced this one (a passage renounced with it), if any. */
  replacingPlan: PlanCode | null;
  creditedCents: number;
  creditNotes: AdminCreditNote[];
};

export type AdminRefundCounts = {
  /** Withdrawals not, or not fully, refunded. */
  toRefund: number;
  /** Of them, past the 14 days. */
  late: number;
  /** Refunds without their credit note. */
  creditNotesMissing: number;
  /** The oldest request still owed, for « À traiter ». */
  oldestRequestedAt: string | null;
  /** The oldest refund without its credit note. */
  oldestMissingAt: string | null;
};

function creditNotesOf(value: Json): AdminCreditNote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { number, amount_cents, pdf_url, issued_at } = item;
    if (typeof number !== "string" || typeof amount_cents !== "number") return [];
    return [
      {
        number,
        amountCents: amount_cents,
        pdfUrl: typeof pdf_url === "string" && pdf_url.startsWith("https://") ? pdf_url : null,
        issuedAt: typeof issued_at === "string" ? issued_at : "",
      },
    ];
  });
}

/** Read once per request: « À traiter » and the page share it. */
export const adminRefunds = cache(async (): Promise<QueryResult<AdminRefundRow[]>> => {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_refunds");
    if (error) throw new Error(`admin_refunds: ${error.code} ${error.message}`);
    // Generated types declare the columns of a function result as never null.
    const nullable = <T>(value: T) => (value ?? null) as T | null;
    const rows: AdminRefundRow[] = data.map((row) => ({
      subscriptionId: row.subscription_id,
      propertyId: row.property_id,
      reference: nullable(row.reference),
      city: nullable(row.city),
      ownerId: row.owner_id,
      sellerName:
        [nullable(row.first_name), nullable(row.last_name)].filter(Boolean).join(" ") || null,
      plan: row.plan,
      amountPaidCents: row.amount_paid_cents,
      activatedAt: row.activated_at,
      requestedAt: nullable(row.requested_at),
      refundedAt: nullable(row.refunded_at),
      refundedCents: row.refunded_cents ?? 0,
      lastRefundAt: nullable(row.last_refund_at),
      paymentIntentId: nullable(row.payment_intent_id),
      replacingPlan: nullable(row.replacing_plan),
      creditedCents: row.credited_cents ?? 0,
      creditNotes: creditNotesOf(row.credit_notes),
    }));
    return { ok: true, data: sortRefunds(rows) };
  } catch (error) {
    console.error("[admin] refunds failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
});

/** The counts of the sidebar, of the summary and of « À traiter ». */
export function refundCounts(rows: readonly AdminRefundRow[], now: Date = new Date()) {
  const owed = rows.filter((row) => waitsForRefund(row, now));
  const missing = rows.filter((row) => creditNoteState(row) === "missing");
  const oldest = (values: (string | null)[]) =>
    values.filter((value): value is string => Boolean(value)).sort()[0] ?? null;
  return {
    toRefund: owed.length,
    late: owed.filter((row) => refundStatus(row, now) === "late").length,
    creditNotesMissing: missing.length,
    oldestRequestedAt: oldest(owed.map((row) => row.requestedAt)),
    oldestMissingAt: oldest(missing.map((row) => row.lastRefundAt ?? row.refundedAt)),
  } satisfies AdminRefundCounts;
}
