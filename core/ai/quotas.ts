// Daily limits of messages to the assistant (SPEC-V2 section 12), per role,
// never in a column. Provisional values, to adjust after the acceptance on
// the real consumption; the assistant is part of the free plan: its limit
// must let a seller really sell. An account with several roles gets the
// highest limit of its roles. The count is profiles.ai_messages_today,
// restarted at midnight in Europe/Paris (SQL function ai_quota_consume).

export type QuotaRole = "seller" | "buyer" | "admin";

export const AI_DAILY_LIMITS = {
  buyer: 20,
  seller: 30,
  /** A seller with at least one property under a paid plan. */
  sellerPaid: 100,
  /** The admin: no limit. */
  admin: null,
} as const;

/** The limit of the day of an account; null: no limit. 0 when it has no role of the assistant. */
export function dailyLimit(
  roles: readonly string[],
  { hasPaidProperty }: { hasPaidProperty: boolean },
): number | null {
  if (roles.includes("admin")) return AI_DAILY_LIMITS.admin;
  const limits: number[] = [];
  if (roles.includes("seller")) {
    limits.push(hasPaidProperty ? AI_DAILY_LIMITS.sellerPaid : AI_DAILY_LIMITS.seller);
  }
  if (roles.includes("buyer")) limits.push(AI_DAILY_LIMITS.buyer);
  return limits.length === 0 ? 0 : Math.max(...limits);
}
