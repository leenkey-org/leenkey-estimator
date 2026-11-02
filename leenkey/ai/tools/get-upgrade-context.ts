import "server-only";
import type { AiTool } from "@/core/ai/tools/types";
import { activePlans } from "@/core/billing/plans";
import { saleProgress } from "@/leenkey/properties/sale";
import { createClient } from "@/lib/supabase/server";
import { PROPERTY_NOT_FOUND, planSummary, sellerPropertyById } from "../seller-data";
import { propertyInput, propertyInputSchema, type PropertyInput } from "./shared";

// get_upgrade_context (SPEC-V2 sections 11 bis and 12): the plan of a
// property, what it includes (its features, its rights), and the other plans,
// so that the assistant knows what is included. The rights are read from
// plan_entitlements, never deduced from the name of the plan.

export const getUpgradeContextTool: AiTool<PropertyInput, unknown> = {
  name: "get_upgrade_context",
  description:
    "Read the plan of one property (name, price paid at subscription, what it includes, whether " +
    "a Leenkey advisor is included) and the other plans with their price and contents.",
  input: propertyInput,
  inputSchema: propertyInputSchema,
  requiresConfirmation: false,
  contexts: ["seller"],
  async execute({ propertyId }, ctx) {
    const found = await sellerPropertyById(ctx.profileId, propertyId);
    if (!found.ok) return { error: "unavailable" };
    if (!found.data) return { error: PROPERTY_NOT_FOUND };
    const supabase = await createClient();
    const [progress, plans] = await Promise.all([saleProgress(propertyId), activePlans()]);
    if (!progress.ok || !plans) return { error: "unavailable" };
    // The plan of the sale, among the plans on sale (typed by their table).
    const current = plans.find((candidate) => candidate.code === progress.data?.template) ?? null;
    const code = current?.code ?? null;
    const rights = code
      ? await supabase.from("plan_entitlements").select("feature").eq("plan", code)
      : { data: [], error: null };
    if (rights.error) return { error: "unavailable" };
    const plan = code ? planSummary(code, plans) : null;
    return {
      plan: plan
        ? {
            name: plan.name,
            priceEuros: plan.priceEuros,
            paid: plan.paid,
            includes: current?.features ?? [],
            rights: rights.data.map((row) => row.feature),
            advisorIncluded: rights.data.some((row) => row.feature === "advisor"),
          }
        : null,
      otherPlans: plans
        .filter((candidate) => candidate.code !== code)
        .map((candidate) => ({
          name: candidate.name,
          priceEuros: candidate.priceCents / 100,
          includes: candidate.features,
        })),
    };
  },
};
