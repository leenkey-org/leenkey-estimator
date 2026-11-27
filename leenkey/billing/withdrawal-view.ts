import { refundDeadline } from "@/leenkey/admin/refunds/status";
import { formatAmount } from "@/lib/format";
import { frBilling } from "@/lib/i18n/sections/billing";
import type { Database } from "@/types/database";
import type { PlanPage } from "./queries";
import {
  legalDate,
  stoppedFeatures,
  withdrawalOptions,
  type WithdrawalOption,
  type WithdrawalScope,
} from "./withdrawal";

// What « Droit de rétractation » shows on /vendeur/formule (DECISIONS.md
// 2026-11-26), as plain values for the panel: what the seller may still
// renounce (after a passage, the passage alone or everything), what stops at
// once for each choice, named from the rights of the plans (plan_entitlements,
// never a plan name), and the requests recorded that wait for their refund.

type PlanCode = Database["public"]["Enums"]["plan_code"];
type PlanFeature = Database["public"]["Enums"]["plan_feature"];

export type PlanFeatures = ReadonlyMap<PlanCode, ReadonlySet<PlanFeature>>;

/** The rights of the plans, in the order and the words of the comparison table. */
const FEATURE_LABELS: readonly { feature: PlanFeature; label: string }[] =
  frBilling.comparison.rows.flatMap((row) =>
    "feature" in row ? [{ feature: row.feature, label: row.label }] : [],
  );

/** The paid services that stop when `from` is renounced and `backTo` kept (null: nothing paid). */
export function stoppedServices(
  features: PlanFeatures | null,
  from: PlanCode,
  backTo: PlanCode | null,
): string[] {
  const stopped = stoppedFeatures(
    features,
    from,
    backTo,
    FEATURE_LABELS.map((row) => row.feature),
  );
  return FEATURE_LABELS.filter((row) => stopped.includes(row.feature)).map((row) => row.label);
}

export type WithdrawalChoice = {
  scope: WithdrawalScope;
  /** « 510 € » */
  refund: string;
  /** « 9 décembre 2026 », the last day of this choice. */
  lastDay: string;
  /** The plan kept (« upgrade »), else the free plan. */
  keptName: string;
  /** The paid services that stop at once. */
  stops: string[];
  /** The plan a passage replaced, renounced with it (« full » after a passage). */
  includes: { planName: string; orderedOn: string } | null;
};

export type WithdrawalRecorded = {
  /** An ISO date: the key of the request. */
  requestedAt: string;
  scope: WithdrawalScope;
  /** « 510 € », what is left to refund. */
  amount: string;
  /** « 10 décembre 2026 », the request plus 14 days. */
  deadline: string;
  /** The plan the seller went back to, else the free plan. */
  keptName: string;
};

export type WithdrawalView = {
  /** The plan in force and its choices; null when nothing may be renounced now. */
  current: {
    subscriptionId: string;
    planName: string;
    /** « 8 novembre 2026 » */
    orderedOn: string;
    earlyStart: boolean;
    choices: WithdrawalChoice[];
  } | null;
  recorded: WithdrawalRecorded[];
};

export function withdrawalView(
  data: Pick<PlanPage, "active" | "withdrawals" | "prices">,
  features: PlanFeatures | null,
  now: Date = new Date(),
): WithdrawalView {
  const planName = (code: PlanCode) => data.prices.find((plan) => plan.code === code)?.name ?? code;
  const freeName = data.prices.find((plan) => plan.priceCents <= 0)?.name ?? "";
  const active = data.active;
  const options: WithdrawalOption[] = active ? withdrawalOptions(active, active.replaced, now) : [];
  return {
    current:
      active && options.length > 0
        ? {
            subscriptionId: active.id,
            planName: planName(active.plan),
            orderedOn: legalDate(active.activatedAt),
            earlyStart: active.earlyStart,
            choices: options.map((option) => ({
              scope: option.scope,
              refund: formatAmount(option.refundCents),
              lastDay: legalDate(option.lastDay),
              keptName: option.backTo ? planName(option.backTo) : freeName,
              stops: stoppedServices(features, active.plan, option.backTo),
              includes:
                option.scope === "full" && active.replaced
                  ? {
                      planName: planName(active.replaced.plan),
                      orderedOn: legalDate(active.replaced.activatedAt),
                    }
                  : null,
            })),
          }
        : null,
    recorded: data.withdrawals.map((withdrawal) => ({
      requestedAt: withdrawal.requestedAt,
      scope: withdrawal.backTo ? "upgrade" : "full",
      amount: formatAmount(withdrawal.dueCents),
      deadline: legalDate(refundDeadline(withdrawal.requestedAt)),
      keptName: withdrawal.backTo ? planName(withdrawal.backTo) : freeName,
    })),
  };
}
