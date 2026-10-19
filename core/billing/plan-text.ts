// Text of a plan (table plans, description): its first line comes before the
// list of features, the following ones after it (supabase/seed/01_plans.sql).
// Pure, for the tests and the client components.

import type { Database } from "@/types/database";

/** A plan on sale, as the pages show it (core/billing/plans.ts reads them). */
export type PlanView = {
  code: Database["public"]["Enums"]["plan_code"];
  name: string;
  priceCents: number;
  /** Text of the plan: its first line before the features, the others after. */
  intro: string | null;
  outro: string | null;
  features: string[];
};

/** « Tout Autonomie, plus :\nLe propriétaire… » → before and after the list. */
export function splitDescription(description: string): {
  intro: string | null;
  outro: string | null;
} {
  const [first = "", ...rest] = description.split("\n").map((line) => line.trim());
  const after = rest.filter(Boolean).join(" ");
  return { intro: first || null, outro: after || null };
}
