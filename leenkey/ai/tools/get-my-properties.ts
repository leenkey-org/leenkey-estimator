import "server-only";
import { z } from "zod";
import type { AiTool } from "@/core/ai/tools/types";
import { sellerFile, type PropertyOverview } from "../seller-data";

// get_my_properties (SPEC-V2 section 12): the properties of the seller, with
// the status of their listing, their plan and their step.

const input = z.object({}).strict();

export type GetMyPropertiesOutput =
  | { properties: PropertyOverview[]; total: number }
  | { error: "unavailable" };

export const getMyPropertiesTool: AiTool<z.infer<typeof input>, GetMyPropertiesOutput> = {
  name: "get_my_properties",
  description:
    "List the properties of the seller (10 most recent at most): id, name, city, status of the " +
    "listing, price, plan (paid or free), current step of the sale and the tasks left in it.",
  input,
  inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
  requiresConfirmation: false,
  contexts: ["seller"],
  async execute(_input, ctx) {
    const file = await sellerFile(ctx.profileId);
    if (!file) return { error: "unavailable" };
    return { properties: file.overview, total: file.properties.length };
  },
};
