import { z } from "zod";
import type { ToolInputSchema } from "@/core/ai/tools/types";

// Inputs shared by the tools of the seller (L1-28).

export const propertyInput = z.object({ propertyId: z.string().uuid() });
export type PropertyInput = z.infer<typeof propertyInput>;

const PROPERTY_ID = {
  type: "string",
  description: "Id of a property of the seller (from get_my_properties or the file of the seller).",
};

export const propertyInputSchema: ToolInputSchema = {
  type: "object",
  properties: { propertyId: PROPERTY_ID },
  required: ["propertyId"],
  additionalProperties: false,
};

/** An input made of the property and other fields. */
export function withProperty(
  properties: Record<string, unknown>,
  required: string[],
): ToolInputSchema {
  return {
    type: "object",
    properties: { propertyId: PROPERTY_ID, ...properties },
    required: ["propertyId", ...required],
    additionalProperties: false,
  };
}

/** A date as the model reads it: the day in Paris (« 2026-10-22 »). */
export function parisDay(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(iso));
}
