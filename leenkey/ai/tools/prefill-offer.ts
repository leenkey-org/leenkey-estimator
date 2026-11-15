import "server-only";
import { z } from "zod";
import type { AiTool } from "@/core/ai/tools/types";
import { buyerDraft, offerAccess, offerListing } from "@/leenkey/offers/queries";
import { createClient } from "@/lib/supabase/server";
import { OFFER_AMOUNT_MAX_EUROS } from "@/lib/validations/offer";
import { gapPercent, type OfferPrefillPreview } from "../previews";
import { LISTING_NOT_FOUND } from "./get-listing-public";

// prefill_offer (SPEC-V2 sections 12 and 13, L2-06): the price the buyer
// said in the conversation is written in the draft of their offer on a
// listing, once they have read it and confirmed (ConfirmActionCard); the
// form of the offer then opens. Nothing is sent: an offer leaves only from
// its form, once the buyer has filled its seven steps and ticked its
// declarations themselves. The price only: the identity, the financing, the
// conditions and the declarations of an offer are the buyer's to write (the
// financing step already starts from their declared project).
// The SQL function ai_prefill_offer writes the draft and the result of the
// tool in one transaction, with the rights of the buyer (RLS: a listing
// online that is not theirs, their financing declared). Never the service
// role here (CLAUDE.md section 8).

const input = z.object({
  listingId: z.string().uuid(),
  priceEuros: z.number().int().min(1).max(OFFER_AMOUNT_MAX_EUROS),
});

type Input = z.infer<typeof input>;
type Output =
  | { prefilled: true; offerId: string }
  | { prefilled: false; answered: true }
  | { prefilled: false; error: string };

export const OFFER_UNDECLARED =
  "The buyer has not filled their buying project yet (page « Mon projet d'achat » of their " +
  "space): an offer can be prepared once it is filled. Nothing was prepared.";
export const OFFER_ACCEPTED =
  "An offer of the buyer on this listing is already accepted: no new offer can be prepared.";
export const OFFER_CLOSED =
  "This listing takes no offer from this buyer (their own listing, or a listing no longer " +
  "online). Nothing was prepared.";

export const prefillOfferTool: AiTool<Input, Output, OfferPrefillPreview> = {
  name: "prefill_offer",
  description:
    "Prepare the draft of a purchase offer of the buyer on a listing online, with the price " +
    "they gave, in whole euros: after their confirmation, the form of the offer opens with this " +
    "price, and they fill the rest themselves (identity, financing, conditions, validity, " +
    "declarations). Nothing is sent to the seller. Only when the buyer says they want to make " +
    "an offer on a precise listing and gives its price: never suggest a price yourself.",
  input,
  inputSchema: {
    type: "object",
    properties: {
      listingId: {
        type: "string",
        description:
          "Id of the listing online the offer is about (the listing the buyer is reading, or " +
          "one given by search_listings).",
      },
      priceEuros: {
        type: "integer",
        description: "The price the buyer offers, in whole euros, as they gave it.",
      },
    },
    required: ["listingId", "priceEuros"],
    additionalProperties: false,
  },
  requiresConfirmation: true,
  contexts: ["buyer"],
  async preview({ listingId, priceEuros }, ctx) {
    const [listing, access, draft] = await Promise.all([
      offerListing(listingId),
      offerAccess({ id: ctx.profileId, roles: ctx.roles }, listingId),
      buyerDraft(ctx.profileId, listingId),
    ]);
    if (!listing.ok || !access.ok || !draft.ok) {
      return { ok: false, error: "The listing could not be read. Try again later." };
    }
    if (!listing.data) return { ok: false, error: LISTING_NOT_FOUND };
    if (access.data.state === "undeclared") return { ok: false, error: OFFER_UNDECLARED };
    if (access.data.state === "accepted") return { ok: false, error: OFFER_ACCEPTED };
    if (access.data.state === "closed") return { ok: false, error: OFFER_CLOSED };
    const askingEuros = Math.round(listing.data.askingPriceCents / 100);
    const draftCents = draft.data?.priceCents ?? null;
    return {
      ok: true,
      data: {
        kind: "offer_prefill",
        listingId,
        listingTitle: listing.data.title,
        city: listing.data.city,
        askingEuros,
        priceEuros,
        gapPercent: gapPercent(priceEuros, askingEuros),
        draftPriceEuros: draftCents === null ? null : Math.round(draftCents / 100),
      },
    };
  },
  async execute({ listingId, priceEuros }, ctx) {
    if (!ctx.call) {
      return { prefilled: false, error: "Not confirmed by the buyer: nothing was prepared." };
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ai_prefill_offer", {
      p_conversation_id: ctx.call.conversationId,
      p_tool_use_id: ctx.call.toolUseId,
      p_tool_name: ctx.call.name,
      p_listing_id: listingId,
      p_price_cents: priceEuros * 100,
    });
    if (!error) return { prefilled: true, offerId: data };
    // The result of this call is already in the log (a second click, another
    // tab). Any other duplicate (a draft created by the form at the same
    // moment) is a failure, said as one: the call stays answered by it.
    if (error.code === "23505" && error.message.includes("ai_messages_tool_result_idx")) {
      return { prefilled: false, answered: true };
    }
    // The policy said no: the listing went off line, an offer was accepted meanwhile.
    if (error.code === "42501") return { prefilled: false, error: OFFER_CLOSED };
    console.error("[ai] offer prefill failed", {
      user_id: ctx.profileId,
      entity_id: listingId,
      code: error.code,
    });
    return { prefilled: false, error: "The offer could not be prepared. Nothing was prepared." };
  },
};
