import { z } from "zod";

// L3-02 (SPEC-V2 14): what a seller and a buyer send about a visit, checked
// again by the database (visit_slot_add, visit_invite, visit_book).

export const VISIT_DURATIONS = [30, 45, 60] as const;

/** A token of an invitation: 64 hexadecimal characters. */
export const VISIT_TOKEN = /^[0-9a-f]{64}$/;

export const visitSlotSchema = z.object({
  propertyId: z.string().uuid(),
  /** « 2026-11-21 », the day in Paris. */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** « 10:30 », the time in Paris. */
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  minutes: z.union([z.literal(30), z.literal(45), z.literal(60)]),
});

export const visitInviteSchema = z.object({
  propertyId: z.string().uuid(),
  buyerId: z.string().uuid(),
});

export const visitBookSchema = z.object({
  token: z.string().regex(VISIT_TOKEN),
  slotId: z.string().uuid(),
});
