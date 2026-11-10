import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { DPE_KINDS, type DpeKind, type DpeRules } from "@/lib/validations/property";

/** The rules of the DPE and the motives of exemption proposed, in their order. */
export type DpeSettings = { rules: DpeRules; reasons: string[] };

/**
 * What a DPE needs, by kind, and the motives of exemption, as the base holds
 * them (dpe_rules, dpe_exemption_reasons, L1-66): the regulation changes
 * them without a deployment. Public data, read without the session; cached
 * for the request. null: the base did not answer (logged).
 */
export const getDpeSettings = cache(async (): Promise<DpeSettings | null> => {
  try {
    const supabase = createPublicClient();
    const [rules, reasons] = await Promise.all([
      supabase
        .from("dpe_rules")
        .select(
          "kind, valid_from, validity_years, costs_required, figures_required, excessive_classes",
        ),
      supabase
        .from("dpe_exemption_reasons")
        .select("label")
        .eq("active", true)
        .order("position", { ascending: true }),
    ]);
    if (rules.error) throw new Error(`dpe_rules: ${rules.error.code} ${rules.error.message}`);
    if (reasons.error) {
      throw new Error(`dpe_exemption_reasons: ${reasons.error.code} ${reasons.error.message}`);
    }
    const byKind: DpeRules = {};
    for (const row of rules.data) {
      const kind = DPE_KINDS.find((value): value is DpeKind => value === row.kind);
      if (!kind) continue;
      byKind[kind] = {
        validFrom: row.valid_from,
        validityYears: row.validity_years,
        costsRequired: row.costs_required,
        figuresRequired: row.figures_required,
        excessiveClasses: row.excessive_classes,
      };
    }
    return { rules: byKind, reasons: reasons.data.map((row) => row.label) };
  } catch (error) {
    console.error("[properties] DPE rules read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
});
