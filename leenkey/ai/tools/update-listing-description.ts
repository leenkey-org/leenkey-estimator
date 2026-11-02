import "server-only";
import { z } from "zod";
import type { AiTool } from "@/core/ai/tools/types";
import { LISTING_DESCRIPTION_MAX, textLength } from "@/lib/validations/listing";
import type { DescriptionPreview } from "../previews";
import { editableListing, updateListing, type UpdateOutput } from "./listing-edit";
import { withProperty } from "./shared";

// update_listing_description (SPEC-V2 section 12): replaces the description
// of the listing, once the seller has seen the old one and the new one and
// confirmed (ConfirmActionCard). 1 200 characters at most, as on step 3.

const input = z.object({
  propertyId: z.string().uuid(),
  description: z
    .string()
    .trim()
    .min(1)
    .refine((text) => textLength(text) <= LISTING_DESCRIPTION_MAX, {
      message: `${LISTING_DESCRIPTION_MAX} characters at most`,
    }),
});

type Input = z.infer<typeof input>;

export const updateListingDescriptionTool: AiTool<Input, UpdateOutput, DescriptionPreview> = {
  name: "update_listing_description",
  description:
    "Replace the description of the listing of one property with a new full text " +
    `(${LISTING_DESCRIPTION_MAX} characters at most). The seller sees the current and the new ` +
    "description and must confirm before anything changes.",
  input,
  inputSchema: withProperty(
    {
      description: {
        type: "string",
        description: `The complete new description, plain text, ${LISTING_DESCRIPTION_MAX} characters at most.`,
      },
    },
    ["description"],
  ),
  requiresConfirmation: true,
  contexts: ["seller"],
  async preview({ propertyId, description }, ctx) {
    const target = await editableListing(ctx.profileId, propertyId);
    if (!target.ok) return target;
    if (target.data.listing.description.trim() === description) {
      return {
        ok: false,
        error: "The new description is the same as the current one: nothing to change.",
      };
    }
    return {
      ok: true,
      data: {
        kind: "listing_description",
        propertyName: target.data.name,
        before: target.data.listing.description,
        after: description,
      },
    };
  },
  async execute({ propertyId, description }, ctx) {
    const target = await editableListing(ctx.profileId, propertyId);
    if (!target.ok) return { updated: false, error: target.error };
    return updateListing(ctx, target.data.listing.id, { description });
  },
};
