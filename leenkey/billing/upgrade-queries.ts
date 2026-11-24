import "server-only";
import { allPlans } from "@/core/billing/plans";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { propertyOffers } from "@/leenkey/offers/seller";
import { buildChecklist, checklistProperty } from "@/leenkey/sale-file/checklist";
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

/**
 * The documents of the notary file neither filed nor « Non concerné » (L3-04,
 * lib/config/documents.ts: those asked for from the listing and before the
 * agreement); null when they could not be read.
 */
async function missingDocuments(propertyId: string): Promise<number | null> {
  const supabase = await createClient();
  const [property, documents, exemptions] = await Promise.all([
    supabase
      .from("properties")
      .select("type, copro_lots, dpe_exempt, dpe_exemption_reason")
      .eq("id", propertyId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, type, title, created_at, covers")
      .eq("property_id", propertyId)
      .is("deleted_at", null),
    supabase.from("document_exemptions").select("type, reason").eq("property_id", propertyId),
  ]);
  if (property.error || !property.data || documents.error || exemptions.error) return null;
  const checklist = buildChecklist(
    checklistProperty({ type: property.data.type, coproLots: property.data.copro_lots }),
    documents.data.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      createdAt: row.created_at,
      // A DDT: the diagnostic lines it covers count as provided.
      covers: row.covers,
    })),
    exemptions.data,
    // Not subject to the DPE (L1-65): its reason, as the tab and the notary file read it.
    property.data.dpe_exempt ? (property.data.dpe_exemption_reason ?? "") : null,
  );
  return checklist.total - checklist.done;
}

export async function propertyUpgradePrompt(
  propertyId: string,
  place: UpgradePlace,
  now: Date = new Date(),
): Promise<UpgradePromptView | null> {
  if (!paidPlansOrderable()) return null;
  try {
    const supabase = await createClient();
    const withOffers = place.kind === "dashboard" || place.kind === "offer";
    const [plans, current, listing, sale, contacts, dismissed, offers, visits, missing] =
      await Promise.all([
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
        // L3-09: the visits that took place (not cancelled, their slot over).
        supabase
          .from("visits")
          .select("id, visit_slots!inner(ends_at)", { count: "exact", head: true })
          .eq("property_id", propertyId)
          .in("status", ["confirmed", "done"])
          .lt("visit_slots.ends_at", now.toISOString()),
        missingDocuments(propertyId),
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
      // L3-09: null when not read, and the prompt that needs it stays silent.
      visits: visits.error ? null : (visits.count ?? 0),
      missingDocuments: missing,
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
      // Both prices, or no sentence (an asking price is never 0).
      if (!offer?.priceCents || !offer.askingPriceCents) return null;
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
