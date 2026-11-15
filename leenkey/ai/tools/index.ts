import "server-only";
import type { AiContext, AnyAiTool } from "@/core/ai/tools/types";
import { contactAdvisorTool } from "./contact-advisor";
import { createBuyerCaseTool, createCaseTool } from "./create-case";
import { draftListingDescriptionTool } from "./draft-listing-description";
import { getListingPublicTool } from "./get-listing-public";
import { getListingStatsTool } from "./get-listing-stats";
import { getMyPropertiesTool } from "./get-my-properties";
import { getPropertyDetailsTool } from "./get-property-details";
import { getSaleProgressTool } from "./get-sale-progress";
import { getUpgradeContextTool } from "./get-upgrade-context";
import { prefillOfferTool } from "./prefill-offer";
import { searchListingsTool } from "./search-listings";
import { summarizeContactsTool } from "./summarize-contacts";
import { updateListingDescriptionTool } from "./update-listing-description";
import { updateListingPriceTool } from "./update-listing-price";

// The tools of the assistant (SPEC-V2 section 12). The tools about
// properties, listings and buyers live here (CLAUDE.md section 3: core/ knows
// none of them); search_knowledge (core/ai/tools) is not offered to the
// model of the conversation: the whole FAQ is in its prompt (Q69, option a).
// The buyer (L2-06): search_listings, get_listing_public, prefill_offer and
// its own create_case (two tools of the same name, one per context). To come
// with their tasks: summarize_offer (L2-07), summarize_shared_documents,
// create_alert and propose_visit_slot (L3).

const TOOLS: readonly AnyAiTool[] = [
  getMyPropertiesTool,
  getPropertyDetailsTool,
  getSaleProgressTool,
  getListingStatsTool,
  summarizeContactsTool,
  getUpgradeContextTool,
  draftListingDescriptionTool,
  updateListingDescriptionTool,
  updateListingPriceTool,
  contactAdvisorTool,
  createCaseTool,
  searchListingsTool,
  getListingPublicTool,
  prefillOfferTool,
  createBuyerCaseTool,
];

/** The tools of a context. */
export function toolsFor(context: AiContext): AnyAiTool[] {
  return TOOLS.filter((tool) => tool.contexts.includes(context));
}

/** Every tool, to check them all (tests). */
export const ALL_TOOLS = TOOLS;
