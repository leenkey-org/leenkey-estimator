import "server-only";
import type { AiContext, AnyAiTool } from "@/core/ai/tools/types";
import { contactAdvisorTool } from "./contact-advisor";
import { createCaseTool } from "./create-case";
import { draftListingDescriptionTool } from "./draft-listing-description";
import { getListingStatsTool } from "./get-listing-stats";
import { getMyPropertiesTool } from "./get-my-properties";
import { getPropertyDetailsTool } from "./get-property-details";
import { getSaleProgressTool } from "./get-sale-progress";
import { getUpgradeContextTool } from "./get-upgrade-context";
import { summarizeContactsTool } from "./summarize-contacts";
import { updateListingDescriptionTool } from "./update-listing-description";
import { updateListingPriceTool } from "./update-listing-price";

// The tools of the assistant (SPEC-V2 section 12). The tools about
// properties, listings and buyers live here (CLAUDE.md section 3: core/ knows
// none of them); search_knowledge (core/ai/tools) is not offered to the
// model of the conversation: the whole FAQ is in its prompt (Q69, option a).
// To come with their tasks: summarize_offer (L2), the tools of the buyer
// (L2, create_case among them) and of the admin (L1-30), propose_visit_slot
// (L3).

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
];

/** The tools of a context. */
export function toolsFor(context: AiContext): AnyAiTool[] {
  return TOOLS.filter((tool) => tool.contexts.includes(context));
}

/** Every tool, to check them all (tests). */
export const ALL_TOOLS = TOOLS;
