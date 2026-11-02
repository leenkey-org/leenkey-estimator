import "server-only";
import { z } from "zod";
import type { AiTool } from "@/core/ai/tools/types";
import { PROPERTY_NOT_FOUND } from "../seller-data";
import { draftListingDescription } from "../suggestions";
import { withProperty } from "./shared";

// draft_listing_description (SPEC-V2 section 12, L1-29): a description of
// the listing written by the generator of the price step (the rules of
// core/ai/prompts/listing-description.md, from the facts of the property),
// returned to the assistant, never written. To change the listing, the
// assistant proposes it with update_listing_description (ConfirmActionCard).
// Each call counts against the limit of the day, as a message would: it
// calls the model once more (a turn may call the tool several times).

const input = z.object({
  propertyId: z.string().uuid(),
  notes: z.string().max(1_000),
});
type Input = z.infer<typeof input>;

export const draftListingDescriptionTool: AiTool<Input, unknown> = {
  name: "draft_listing_description",
  description:
    "Write a proposed description for the listing of a property of the seller, following the rules " +
    "of Leenkey (only the facts of the property and the notes, 800 to 1 100 characters, no " +
    "superlative, no address, no price). Nothing is written: show the text to the seller, then, if " +
    "they want it on their listing, propose it with update_listing_description.",
  input,
  inputSchema: withProperty(
    {
      notes: {
        type: "string",
        description:
          "What the seller asked to stress, add or change, in their words; an empty string if nothing.",
      },
    },
    ["notes"],
  ),
  requiresConfirmation: false,
  contexts: ["seller"],
  async execute({ propertyId, notes }, ctx) {
    const draft = await draftListingDescription({
      profile: { id: ctx.profileId, firstName: null, roles: [...ctx.roles] },
      propertyId,
      notes,
    });
    if (draft.ok) return { description: draft.data.text };
    if (draft.error === "not_found") return { error: PROPERTY_NOT_FOUND };
    if (draft.error === "quota") {
      return { error: "The daily limit of the assistant is reached: no description written." };
    }
    if (draft.error === "refused") return { error: "The description could not be written." };
    return { error: "unavailable" };
  },
};
