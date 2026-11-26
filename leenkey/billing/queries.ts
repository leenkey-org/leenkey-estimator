import "server-only";
import { allPlans, type ActivePlan } from "@/core/billing/plans";
import { chooseProperty } from "@/leenkey/properties/dashboard";
import { sellerProperties } from "@/leenkey/properties/queries";
import { propertyName } from "@/leenkey/properties/sheet";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { sellerPayments, type SellerPayment } from "./payments";
import type { WithdrawalScope } from "./withdrawal";

// Reads of /vendeur/formule (L1-26, SPEC-V2 8.8), with the seller's session:
// the RLS gives them their properties and their subscriptions; the plan in
// force is property_current_plan, as the rights read it (an ended plan is
// already back to Autonomie, before the daily job of L1-40 moves the sale; a
// plan renounced too, from the request on, DECISIONS.md 2026-11-26).

type PlanCode = Database["public"]["Enums"]["plan_code"];
type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type PlanPage = {
  property: { id: string; name: string; reference: string | null; status: ListingStatus | null };
  /** « Prénom Nom » of the seller: who renounces (L1-40, article D221-5). */
  sellerName: string | null;
  /** The other properties of the seller, to choose the plan of another one. */
  others: { id: string; name: string }[];
  /** The plans on sale, and the one in force even when withdrawn from sale. */
  plans: ActivePlan[];
  /** The price of every plan, on sale or not: what a passage costs. */
  prices: { code: PlanCode; name: string; priceCents: number }[];
  current: PlanCode;
  /** The paid plan in force: since when, until when, immediate start asked, its withdrawal (L1-40). */
  active: {
    id: string;
    plan: PlanCode;
    activatedAt: string;
    endsAt: string | null;
    earlyStart: boolean;
    amountPaidCents: number;
    /** The plan this one replaced (a passage): renounced with it, or gone back to. */
    replaced: { plan: PlanCode; activatedAt: string; amountPaidCents: number } | null;
  } | null;
  /**
   * « Mes factures et paiements » (DECISIONS.md 2026-11-26): every payment
   * of the seller, for all their properties, with its invoice and the
   * credit notes of its refunds; null when they could not be read (the
   * plans are shown all the same).
   */
  payments: SellerPayment[] | null;
  /**
   * The withdrawals recorded and not refunded yet, the oldest first (one per
   * request: the plans renounced together share its date).
   */
  withdrawals: {
    requestedAt: string;
    scope: WithdrawalScope;
    /** What is left to refund of the plans it renounced. */
    dueCents: number;
    /** The plan the seller went back to (« upgrade »); null: the free plan. */
    backTo: PlanCode | null;
  }[];
};

type Client = Awaited<ReturnType<typeof createClient>>;

/** The payments of a seller, read with their session; null when the read failed. */
async function paymentsOf(
  supabase: Client,
  profileId: string,
  planNames: Partial<Record<PlanCode, string>>,
  propertyNames: Record<string, string>,
): Promise<SellerPayment[] | null> {
  // Their own only, even for an account that is also admin (the RLS gives the team every row).
  const subscriptions = await supabase
    .from("subscriptions")
    .select(
      "id, property_id, plan, amount_paid_cents, activated_at, refunded_at, stripe_checkout_session_id",
    )
    .eq("owner_id", profileId)
    .gt("amount_paid_cents", 0)
    .order("activated_at", { ascending: false })
    .limit(200);
  if (subscriptions.error) {
    console.error("[billing] payments read failed", {
      user_id: profileId,
      code: subscriptions.error.code,
    });
    return null;
  }
  if (subscriptions.data.length === 0) return [];
  const creditNotes = await supabase
    .from("credit_notes")
    .select("id, subscription_id, number, amount_cents, pdf_url, issued_at")
    .in(
      "subscription_id",
      subscriptions.data.map((row) => row.id),
    );
  if (creditNotes.error) {
    console.error("[billing] payments read failed", {
      user_id: profileId,
      code: creditNotes.error.code,
    });
    return null;
  }
  return sellerPayments(subscriptions.data, creditNotes.data, planNames, propertyNames);
}

/** The plans of a property of the seller: the one asked (?bien=), else the one of « Ma vente ». */
export async function planPage(
  profileId: string,
  requested: string | null,
): Promise<QueryResult<PlanPage | null>> {
  const [properties, plans] = await Promise.all([sellerProperties(profileId), allPlans()]);
  if (!properties.ok || !plans) return { ok: false, error: "unavailable" };
  const property = chooseProperty(properties.data, requested);
  if (!property) return { ok: true, data: null };
  try {
    const supabase = await createClient();
    const [progress, subscription, seller, payments, renounced, refunds] = await Promise.all([
      supabase.rpc("property_current_plan", { p: property.id }),
      supabase
        .from("subscriptions")
        .select("id, plan, activated_at, ends_at, early_start_requested_at, amount_paid_cents")
        .eq("property_id", property.id)
        .is("replaced_by", null)
        .is("refunded_at", null)
        .is("withdrawal_requested_at", null)
        .gt("ends_at", new Date().toISOString())
        .order("activated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("first_name, last_name").eq("id", profileId).maybeSingle(),
      paymentsOf(
        supabase,
        profileId,
        Object.fromEntries(plans.map((plan) => [plan.code, plan.name])),
        Object.fromEntries(properties.data.map((item) => [item.id, propertyName(item)])),
      ),
      // The plans renounced, still to refund; the plan a passage went back to.
      supabase
        .from("subscriptions")
        .select("amount_paid_cents, withdrawal_requested_at, withdrawal_reverts_to")
        .eq("property_id", property.id)
        .not("withdrawal_requested_at", "is", null)
        .is("refunded_at", null)
        .gt("amount_paid_cents", 0)
        .order("withdrawal_requested_at", { ascending: true }),
      // What Stripe already refunded of each request (a partial refund): the
      // page says what is left, never the whole amount again.
      supabase.rpc("withdrawal_refunds", { p_property: property.id }),
    ]);
    if (progress.error) throw new Error(`property_current_plan: ${progress.error.code}`);
    if (subscription.error) throw new Error(`subscriptions: ${subscription.error.code}`);
    if (renounced.error) throw new Error(`subscriptions: ${renounced.error.code}`);
    if (refunds.error) throw new Error(`withdrawal_refunds: ${refunds.error.code}`);
    const leftOf = (requestedAt: string) => {
      const request = refunds.data.find(
        (row) => Date.parse(row.requested_at) === Date.parse(requestedAt),
      );
      return request ? Math.max(0, request.due_cents - request.refunded_cents) : null;
    };
    const current = progress.data ?? "autonomie";
    const active = subscription.data;
    const withdrawals = new Map<string, PlanPage["withdrawals"][number]>();
    for (const row of renounced.data) {
      const requestedAt = row.withdrawal_requested_at;
      if (!requestedAt) continue;
      const known = withdrawals.get(requestedAt);
      // The plan kept is the one in force, unless renounced or refunded in turn since.
      const kept =
        row.withdrawal_reverts_to && active?.id === row.withdrawal_reverts_to ? active.plan : null;
      withdrawals.set(requestedAt, {
        requestedAt,
        scope: row.withdrawal_reverts_to ? "upgrade" : (known?.scope ?? "full"),
        dueCents: (known?.dueCents ?? 0) + row.amount_paid_cents,
        backTo: kept ?? known?.backTo ?? null,
      });
    }
    // A passage: the plan replaced, not renounced nor refunded, paid.
    const replaced = active
      ? await supabase
          .from("subscriptions")
          .select("plan, activated_at, amount_paid_cents")
          .eq("replaced_by", active.id)
          .is("withdrawal_requested_at", null)
          .is("refunded_at", null)
          .gt("amount_paid_cents", 0)
          .order("activated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : null;
    if (replaced?.error) throw new Error(`subscriptions: ${replaced.error.code}`);
    return {
      ok: true,
      data: {
        property: {
          id: property.id,
          name: propertyName(property),
          reference: property.listing?.reference ?? null,
          status: property.listingStatus,
        },
        sellerName:
          [seller.data?.first_name, seller.data?.last_name].filter(Boolean).join(" ") || null,
        others: properties.data
          .filter((other) => other.id !== property.id && other.listingStatus !== "sold")
          .map((other) => ({ id: other.id, name: propertyName(other) })),
        plans: plans
          .filter((plan) => plan.active || plan.code === current)
          .map(({ active: _active, ...plan }) => plan),
        prices: plans.map((plan) => ({
          code: plan.code,
          name: plan.name,
          priceCents: plan.priceCents,
        })),
        current,
        active:
          active && active.plan === current
            ? {
                id: active.id,
                plan: active.plan,
                activatedAt: active.activated_at,
                endsAt: active.ends_at,
                earlyStart: active.early_start_requested_at !== null,
                amountPaidCents: active.amount_paid_cents,
                replaced: replaced?.data
                  ? {
                      plan: replaced.data.plan,
                      activatedAt: replaced.data.activated_at,
                      amountPaidCents: replaced.data.amount_paid_cents,
                    }
                  : null,
              }
            : null,
        payments,
        withdrawals: [...withdrawals.values()].map((withdrawal) => ({
          ...withdrawal,
          dueCents: leftOf(withdrawal.requestedAt) ?? withdrawal.dueCents,
        })),
      },
    };
  } catch (error) {
    console.error("[billing] plan page read failed", {
      user_id: profileId,
      entity_id: property.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
