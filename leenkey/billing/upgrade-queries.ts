import "server-only";
import { allPlans } from "@/core/billing/plans";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { propertyOffers } from "@/leenkey/offers/seller";
import { paidPlansOrderable } from "@/lib/config/sales";
import { formatPrice } from "@/lib/format";
import { frUpgrade } from "@/lib/i18n/sections/upgrade";
import { createClient } from "@/lib/supabase/server";
import {
  chooseUpgradePrompt,
  type UpgradeFacts,
  type UpgradeOffer,
  type UpgradePlace,
  type UpgradeTrigger,
} from "./upgrade-prompts";

// The upgrade prompt of a page (L2-09, SPEC-V2 11 bis), read with the
// session of the seller (RLS: their property, its listing, its offers, its
// prompts). Any failure reads no prompt: a proposal never blocks a page.

const t = frUpgrade;

export type UpgradePromptView = {
  propertyId: string;
  trigger: UpgradeTrigger;
  subjectId: string | null;
  title: string;
  text: string;
  action: { label: string; href: string };
};

export async function propertyUpgradePrompt(
  propertyId: string,
  place: UpgradePlace,
  now: Date = new Date(),
): Promise<UpgradePromptView | null> {
  if (!paidPlansOrderable()) return null;
  try {
    const supabase = await createClient();
    const withOffers = place.kind === "dashboard" || place.kind === "offer";
    const [plans, current, listing, sale, contacts, dismissed, offers] = await Promise.all([
      allPlans(),
      supabase.rpc("property_current_plan", { p: propertyId }),
      supabase
        .from("listings")
        .select("status, published_at")
        .eq("property_id", propertyId)
        .maybeSingle(),
      supabase
        .from("sale_progress")
        .select("current_step_code")
        .eq("property_id", propertyId)
        .maybeSingle(),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propertyId)
        .eq("kind", "listing"),
      supabase
        .from("upgrade_prompts")
        .select("trigger_code, subject_id")
        .eq("property_id", propertyId)
        .not("dismissed_at", "is", null),
      withOffers ? propertyOffers(propertyId) : Promise.resolve(null),
    ]);
    const failed = [current, listing, sale, contacts, dismissed].find((result) => result.error);
    if (!plans || failed || (offers && !offers.ok)) {
      console.error("[billing] upgrade prompt not read", {
        entity_id: propertyId,
        code: failed?.error?.code,
      });
      return null;
    }
    const sent: UpgradeOffer[] =
      offers && offers.ok
        ? offers.data.map((item) => ({
            id: item.offer.id,
            status: item.offer.status,
            priceCents: item.offer.priceCents,
            askingPriceCents: item.property.askingPriceCents,
            validityUntil: item.offer.validityUntil,
          }))
        : [];
    const facts: UpgradeFacts = {
      currentPlan: current.data ?? "autonomie",
      plans: plans.map((plan) => ({
        code: plan.code,
        priceCents: plan.priceCents,
        active: plan.active,
      })),
      orderable: true,
      listingStatus: listing.data?.status ?? null,
      publishedAt: listing.data?.published_at ?? null,
      contacts: contacts.count ?? 0,
      // Not counted before the visits and the sale file (lot 3).
      visits: null,
      missingDocuments: null,
      offers: sent,
      fromValuation: place.kind === "price" && place.fromValuation,
      stepCode: sale.data?.current_step_code ?? null,
      dismissed: (dismissed.data ?? []).map((row) => ({
        trigger: row.trigger_code,
        subjectId: row.subject_id,
      })),
    };
    const choice = chooseUpgradePrompt(facts, place, now);
    if (!choice) return null;
    const target = plans.find((plan) => plan.code === choice.targetPlan);
    if (!target) return null;
    let text: string;
    if (choice.trigger === "offer_received") {
      const { offer } = choice;
      if (offer?.priceCents == null || offer.askingPriceCents == null) return null;
      text = t.prompts.offer_received.text(
        formatPrice(offer.priceCents),
        formatPrice(offer.askingPriceCents),
      );
    } else {
      text = t.prompts[choice.trigger].text;
    }
    const href = `${ROUTES.plan}?bien=${encodeURIComponent(propertyId)}&formule=${choice.targetPlan}`;
    return {
      propertyId,
      trigger: choice.trigger,
      subjectId: choice.subjectId,
      title: t.prompts[choice.trigger].title,
      text,
      action: {
        // A paid plan in force: what the passage costs on top (« Passer à Sérénité : +510 € »).
        label:
          choice.upgradeCents !== null
            ? t.passTo(target.name, formatPrice(choice.upgradeCents))
            : t.action,
        href,
      },
    };
  } catch (error) {
    console.error("[billing] upgrade prompt not read", {
      entity_id: propertyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
