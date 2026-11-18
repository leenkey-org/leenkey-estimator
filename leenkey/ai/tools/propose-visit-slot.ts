import "server-only";
import { z } from "zod";
import { logResult } from "@/core/ai/log";
import type { AiTool } from "@/core/ai/tools/types";
import { propertyName } from "@/leenkey/properties/sheet";
import { parisInstant } from "@/leenkey/visits/dates";
import { sellerVisits, type Contact } from "@/leenkey/visits/queries";
import { createClient } from "@/lib/supabase/server";
import { visitSlotSchema } from "@/lib/validations/visit";
import { VISIT_PREVIEW_SLOTS_MAX, type VisitInvitationPreview } from "../previews";
import { PROPERTY_NOT_FOUND, sellerPropertyById } from "../seller-data";
import { withProperty } from "./shared";

// propose_visit_slot (SPEC-V2 sections 12 and 14, L3-02): invites a buyer in
// relation with a property of the seller to visit it, on the free slots of
// the seller and, when the seller gave a date and a time, on a new slot. The
// seller reads who is invited and on which slots, and confirms
// (ConfirmActionCard): only then is the slot added (visit_slot_add) and the
// invitation created (visit_invite), with the session of the seller; the
// database checks everything again, and its trigger posts the notice
// « visit_invite » in the conversation and notifies the buyer. Nothing is
// written by the preview. The token of the invitation never leaves this
// module: neither the model nor the browser reads it.
//
// The buyer is named by their first name, as summarize_contacts gives it
// (the model never reads the id of a buyer), and found among the contacts
// of the property; two contacts of the same first name: refused, the seller
// invites from the tab « Visites ».
//
// These two functions of the database do not write the log of the
// assistant: the result is logged here once they have run, once per call
// (unique index): a call answered meanwhile reads « answered ».

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const input = z.object({
  propertyId: z.string().uuid(),
  buyerFirstName: z.string().trim().min(1).max(80),
  /** A slot to add before inviting, in Paris time; null: the slots the seller already has. */
  newSlot: visitSlotSchema.omit({ propertyId: true }).nullable(),
});

type Input = z.infer<typeof input>;
type Output =
  | { invited: true; expiresAt: string; slotAdded: boolean }
  | { invited: false; answered: true }
  | { invited: false; error: string };

export const VISIT_NOT_ONLINE =
  "The listing of this property is not online (nor paused): no visit can be proposed. " +
  "Nothing was written.";
export const VISIT_NOT_A_CONTACT =
  "No buyer of this first name has a conversation with the seller about this property: only " +
  "a buyer who wrote about the property can be invited. Call summarize_contacts to read the " +
  "first names of the contacts. Nothing was written.";
export const VISIT_AMBIGUOUS =
  "Several contacts of this property have this first name: the assistant cannot tell them " +
  "apart. The seller invites the right one from the tab « Visites » of the property. Nothing " +
  "was written.";
export const VISIT_ALREADY_BOOKED =
  "This buyer already has a visit to come booked on this property: no new invitation is " +
  "needed. Nothing was written.";
export const VISIT_NO_SLOT =
  "The seller has no free slot starting in more than 2 hours for this property, and no new " +
  "slot was given: ask the seller for a date and a time (and 30, 45 or 60 minutes), never " +
  "invent one. Nothing was written.";
export const VISIT_SLOT_INVALID =
  "The new slot is not a valid date and time in Paris (day YYYY-MM-DD, time HH:MM). Nothing " +
  "was written.";
export const VISIT_SLOT_TOO_SOON =
  "The new slot is in the past or starts in less than 1 hour: a slot starts between in 1 hour " +
  "and in 90 days. Ask the seller for another time. Nothing was written.";
export const VISIT_SLOT_TOO_FAR =
  "The new slot starts in more than 90 days: a slot starts between in 1 hour and in 90 days. " +
  "Nothing was written.";
export const VISIT_SLOT_OVERLAP =
  "The new slot overlaps a slot the seller already has for this property: ask the seller for " +
  "another time, or invite on the existing slots (newSlot null). Nothing was written.";
export const VISIT_SLOT_NOT_BOOKABLE =
  "The new slot starts in less than 2 hours and the seller has no other free slot: a buyer " +
  "books at least 2 hours before the start. Ask the seller for a later time. Nothing was written.";
const UNREADABLE = "The visits of the property could not be read. Try again later.";

type Range = { startsAt: string; endsAt: string };
type Plan = {
  propertyName: string;
  buyer: Contact & { firstName: string };
  /** The free slots the buyer will be able to book, in order. */
  free: Range[];
  /** The slot to add first; null: none, or the seller already has this very slot, free. */
  create: (Range & { minutes: 30 | 45 | 60 }) | null;
};

/** A first name as it is compared: no case, no accent, no space around. */
function nameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * What the invitation will do, read with the session of the seller (RLS):
 * the property is theirs and can be visited, the buyer is one of its
 * contacts, at least one slot can be booked. Writes nothing.
 */
async function plan(
  profileId: string,
  { propertyId, buyerFirstName, newSlot }: Input,
  now: Date = new Date(),
): Promise<{ ok: true; data: Plan } | { ok: false; error: string }> {
  const found = await sellerPropertyById(profileId, propertyId);
  if (!found.ok) return { ok: false, error: UNREADABLE };
  if (!found.data) return { ok: false, error: PROPERTY_NOT_FOUND };
  const status = found.data.listingStatus;
  if (status !== "published" && status !== "paused") return { ok: false, error: VISIT_NOT_ONLINE };
  const visits = await sellerVisits(propertyId);
  if (!visits.ok) return { ok: false, error: UNREADABLE };

  const asked = nameKey(buyerFirstName);
  const matches = visits.data.contacts.filter(
    (contact) => contact.firstName !== null && nameKey(contact.firstName) === asked,
  );
  const [contact] = matches;
  if (!contact || contact.firstName === null) return { ok: false, error: VISIT_NOT_A_CONTACT };
  if (matches.length > 1) return { ok: false, error: VISIT_AMBIGUOUS };
  if (contact.hasVisit) return { ok: false, error: VISIT_ALREADY_BOOKED };

  // As the buyer will read them (visit_open_slots): free, booked 2 hours before at the latest.
  const bookableFrom = now.getTime() + 2 * HOUR;
  const free = visits.data.slots
    .filter((slot) => slot.bookedBy === null && Date.parse(slot.startsAt) > bookableFrom)
    .map((slot) => ({ startsAt: slot.startsAt, endsAt: slot.endsAt }));

  let create: Plan["create"] = null;
  if (newSlot) {
    const start = parisInstant(newSlot.day, newSlot.time);
    if (!start) return { ok: false, error: VISIT_SLOT_INVALID };
    if (start.getTime() < now.getTime() + HOUR) return { ok: false, error: VISIT_SLOT_TOO_SOON };
    if (start.getTime() > now.getTime() + 90 * DAY) return { ok: false, error: VISIT_SLOT_TOO_FAR };
    const end = new Date(start.getTime() + newSlot.minutes * 60_000);
    const same = visits.data.slots.find(
      (slot) =>
        Date.parse(slot.startsAt) === start.getTime() && Date.parse(slot.endsAt) === end.getTime(),
    );
    // The very slot the seller already has, free: nothing to add.
    if (!same || same.bookedBy !== null) {
      const overlaps = visits.data.slots.some(
        (slot) =>
          Date.parse(slot.startsAt) < end.getTime() && Date.parse(slot.endsAt) > start.getTime(),
      );
      if (overlaps) return { ok: false, error: VISIT_SLOT_OVERLAP };
      create = {
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        minutes: newSlot.minutes,
      };
    }
  }
  const createBookable = create !== null && Date.parse(create.startsAt) > bookableFrom;
  if (free.length === 0 && !createBookable) {
    return { ok: false, error: create ? VISIT_SLOT_NOT_BOOKABLE : VISIT_NO_SLOT };
  }
  return {
    ok: true,
    data: {
      propertyName: propertyName(found.data),
      buyer: { ...contact, firstName: contact.firstName },
      free,
      create,
    },
  };
}

export const proposeVisitSlotTool: AiTool<Input, Output, VisitInvitationPreview> = {
  name: "propose_visit_slot",
  description:
    "Invite a buyer who has a conversation with the seller about one property to visit it: the " +
    "buyer receives an invitation valid 7 days, in the conversation, and books one of the free " +
    "slots of the seller themselves. Give the first name of the buyer as summarize_contacts " +
    "gives it. newSlot adds a slot first, with the day and the time the seller gave, in Paris " +
    "time: never invent a date or a time; null to invite on the slots the seller already has. " +
    "The seller reads who is invited and the slots proposed, and must confirm before anything " +
    "is written.",
  input,
  inputSchema: withProperty(
    {
      buyerFirstName: {
        type: "string",
        description: "First name of the buyer to invite, as summarize_contacts gives it.",
      },
      newSlot: {
        anyOf: [
          {
            type: "object",
            properties: {
              day: { type: "string", description: "Day in Paris, YYYY-MM-DD." },
              time: { type: "string", description: "Start time in Paris, HH:MM (24 hours)." },
              minutes: {
                type: "integer",
                enum: [30, 45, 60],
                description: "Length of the visit in minutes; 30 when the seller gave none.",
              },
            },
            required: ["day", "time", "minutes"],
            additionalProperties: false,
          },
          { type: "null" },
        ],
        description:
          "A slot to add before inviting, as the seller gave it; null: only the slots the " +
          "seller already has.",
      },
    },
    ["buyerFirstName", "newSlot"],
  ),
  requiresConfirmation: true,
  contexts: ["seller"],
  async preview(values, ctx) {
    const planned = await plan(ctx.profileId, values);
    if (!planned.ok) return planned;
    const { propertyName: name, buyer, free, create } = planned.data;
    return {
      ok: true,
      data: {
        kind: "visit_invitation",
        propertyName: name,
        buyerFirstName: buyer.firstName,
        slots: free.slice(0, VISIT_PREVIEW_SLOTS_MAX),
        moreSlots: Math.max(0, free.length - VISIT_PREVIEW_SLOTS_MAX),
        newSlot: create ? { startsAt: create.startsAt, endsAt: create.endsAt } : null,
        replacesInvitation: buyer.invitedUntil !== null,
      },
    };
  },
  async execute(values, ctx) {
    if (!ctx.call) {
      return { invited: false, error: "Not confirmed by the seller: nothing was written." };
    }
    // Read again: the slots and the contacts may have changed since the preview.
    const planned = await plan(ctx.profileId, values);
    if (!planned.ok) return { invited: false, error: planned.error };
    const { buyer, create } = planned.data;
    const { propertyId } = values;
    const supabase = await createClient();

    if (create) {
      const { error } = await supabase.rpc("visit_slot_add", {
        p_property: propertyId,
        p_starts_at: create.startsAt,
        p_minutes: create.minutes,
      });
      if (error) {
        if (error.code === "23P01") return { invited: false, error: VISIT_SLOT_OVERLAP };
        if (error.code === "22023") {
          return {
            invited: false,
            error: error.message.includes("not online") ? VISIT_NOT_ONLINE : VISIT_SLOT_TOO_SOON,
          };
        }
        if (error.code !== "42501") {
          console.error("[ai] visit slot not added", {
            user_id: ctx.profileId,
            entity_id: propertyId,
            code: error.code,
          });
        }
        return {
          invited: false,
          error: "The slot could not be added: the buyer was not invited. Nothing was written.",
        };
      }
    }

    // The token of the invitation stays here: only its end is said.
    const invitation = await supabase.rpc("visit_invite", {
      p_property: propertyId,
      p_buyer: buyer.buyerId,
    });
    const expiresAt = invitation.data?.[0]?.expires_at;
    if (invitation.error || !expiresAt) {
      const code = invitation.error?.code;
      if (code !== "42501" && code !== "22023") {
        console.error("[ai] buyer not invited", {
          user_id: ctx.profileId,
          entity_id: propertyId,
          code,
        });
      }
      return {
        invited: false,
        error: create
          ? "The buyer could not be invited: no invitation was sent. The new slot was added " +
            "to the visits of the property: say so to the seller."
          : "The buyer could not be invited: nothing was written.",
      };
    }

    const output: Output = { invited: true, expiresAt, slotAdded: create !== null };
    const logged = await logResult(supabase, ctx.call.conversationId, {
      type: "tool_result",
      tool_use_id: ctx.call.toolUseId,
      name: ctx.call.name,
      status: "confirmed",
      result: output,
    });
    // Answered meanwhile (another tab at the same moment): its answer stays the one of the log.
    if (logged === "duplicate") return { invited: false, answered: true };
    if (logged === "failed") {
      console.error("[ai] visit invitation sent, its result not logged", {
        user_id: ctx.profileId,
        entity_id: propertyId,
      });
    }
    return output;
  },
};
