import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// L3-02: propose_visit_slot (SPEC-V2 sections 12 and 14). What the seller
// reads before confirming, what is refused before anything is shown, what is
// written once confirmed and in which order, and that the token of the
// invitation never leaves the tool. The SQL (visit_slot_add, visit_invite)
// is tested in supabase/tests.

type RpcError = { code: string; message: string } | null;

const mocks = vi.hoisted(() => ({
  property: null as Record<string, unknown> | null,
  visits: { slots: [], visits: [], contacts: [] } as {
    slots: Record<string, unknown>[];
    visits: Record<string, unknown>[];
    contacts: Record<string, unknown>[];
  },
  readable: true,
  writes: [] as { name: string; args: unknown }[],
  slotError: null as RpcError,
  inviteError: null as RpcError,
  logError: null as { code: string } | null,
}));

const TOKEN = "ab".repeat(32);
const EXPIRES = "2026-11-25T09:00:00+00:00";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string, args: unknown) => {
      mocks.writes.push({ name, args });
      if (name === "visit_slot_add") {
        return mocks.slotError
          ? { data: null, error: mocks.slotError }
          : { data: "slot-new", error: null };
      }
      return mocks.inviteError
        ? { data: null, error: mocks.inviteError }
        : { data: [{ token: TOKEN, expires_at: EXPIRES }], error: null };
    },
    from: (table: string) => ({
      insert: async (row: unknown) => {
        mocks.writes.push({ name: `insert:${table}`, args: row });
        return { error: mocks.logError };
      },
    }),
  }),
}));
vi.mock("@/leenkey/visits/queries", () => ({
  sellerVisits: async () =>
    mocks.readable ? { ok: true, data: mocks.visits } : { ok: false, error: "unavailable" },
}));
vi.mock("@/leenkey/ai/seller-data", () => ({
  sellerPropertyById: async () => ({ ok: true, data: mocks.property }),
  PROPERTY_NOT_FOUND: "No property of this seller has this id. Call get_my_properties.",
}));
vi.mock("@/leenkey/properties/sheet", () => ({ propertyName: () => "Maison, Savigny-sur-Orge" }));

const {
  proposeVisitSlotTool: tool,
  VISIT_ALREADY_BOOKED,
  VISIT_AMBIGUOUS,
  VISIT_NOT_A_CONTACT,
  VISIT_NOT_ONLINE,
  VISIT_NO_SLOT,
  VISIT_SLOT_INVALID,
  VISIT_SLOT_NOT_BOOKABLE,
  VISIT_SLOT_OVERLAP,
  VISIT_SLOT_TOO_FAR,
  VISIT_SLOT_TOO_SOON,
} = await import("@/leenkey/ai/tools/propose-visit-slot");
const { actionPreview, VISIT_PREVIEW_SLOTS_MAX } = await import("@/leenkey/ai/previews");
const { toolsFor } = await import("@/leenkey/ai/tools");
const { isFailure } = await import("@/leenkey/ai/queries");
const { mockModel } = await import("@/leenkey/ai/mock");
const { promptFile } = await import("@/core/ai/prompts");
const { frAssistant } = await import("@/lib/i18n/sections/assistant");

const PROPERTY = "5eed1000-0000-4000-8000-000000000001";
const BUYER = "5eed0000-0000-4000-8000-00000000000c";
const ctx = {
  profileId: "seller-a",
  roles: ["seller"],
  context: "seller" as const,
  stepCode: null,
};
const call = { conversationId: "conv-1", toolUseId: "toolu_1", name: "propose_visit_slot" };
const input = { propertyId: PROPERTY, buyerFirstName: "Chloé", newSlot: null };
// Thursday 19 November 2026, 10:00 in Paris.
const NOW = new Date("2026-11-19T09:00:00Z");

const slot = (startsAt: string, endsAt: string, bookedBy: string | null = null) => ({
  id: `slot-${startsAt}`,
  startsAt,
  endsAt,
  bookedBy,
  visitId: bookedBy === null ? null : "visit-1",
});
const contact = (over: Record<string, unknown> = {}) => ({
  buyerId: BUYER,
  firstName: "Chloé",
  financingStatus: "declared",
  invitedUntil: null,
  hasVisit: false,
  ...over,
});
const SATURDAY = slot("2026-11-21T09:30:00+00:00", "2026-11-21T10:00:00+00:00");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mocks.property = { id: PROPERTY, listingStatus: "published" };
  mocks.visits = { slots: [SATURDAY], visits: [], contacts: [contact()] };
  mocks.readable = true;
  mocks.writes = [];
  mocks.slotError = null;
  mocks.inviteError = null;
  mocks.logError = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
});

describe("propose_visit_slot", () => {
  it("is a tool of the seller only, confirmed first, named in the prompt of the seller", () => {
    expect(tool.contexts).toEqual(["seller"]);
    expect(tool.requiresConfirmation).toBe(true);
    expect(toolsFor("seller")).toContain(tool);
    expect(toolsFor("buyer")).not.toContain(tool);
    expect(toolsFor("admin")).not.toContain(tool);
    expect(promptFile("seller")).toContain("`propose_visit_slot`");
    expect(promptFile("buyer")).not.toContain("propose_visit_slot");
  });

  it("reads a first name, a day and a time in Paris, 30, 45 or 60 minutes; never the id of a buyer", () => {
    const newSlot = { day: "2026-11-21", time: "10:30", minutes: 30 };
    expect(tool.input.safeParse(input).success).toBe(true);
    expect(tool.input.safeParse({ ...input, newSlot }).success).toBe(true);
    expect(tool.input.safeParse({ ...input, newSlot: { ...newSlot, minutes: 20 } }).success).toBe(
      false,
    );
    expect(tool.input.safeParse({ ...input, newSlot: { ...newSlot, time: "25:00" } }).success).toBe(
      false,
    );
    expect(tool.input.safeParse({ ...input, buyerFirstName: " " }).success).toBe(false);
    expect(tool.input.safeParse({ ...input, propertyId: "1" }).success).toBe(false);
    expect(Object.keys(tool.inputSchema?.properties ?? {})).not.toContain("buyerId");
  });

  it("the seller reads who is invited and the free slots, booked 2 hours before at the latest", async () => {
    mocks.visits.slots = [
      // In 90 minutes: too late to be booked. Booked: not proposed.
      slot("2026-11-19T10:30:00+00:00", "2026-11-19T11:00:00+00:00"),
      slot("2026-11-20T09:00:00+00:00", "2026-11-20T09:30:00+00:00", "Malik"),
      SATURDAY,
    ];
    const preview = await tool.preview?.({ ...input, buyerFirstName: " chloe " }, ctx);
    expect(preview).toEqual({
      ok: true,
      data: {
        kind: "visit_invitation",
        propertyName: "Maison, Savigny-sur-Orge",
        buyerFirstName: "Chloé",
        slots: [{ startsAt: SATURDAY.startsAt, endsAt: SATURDAY.endsAt }],
        moreSlots: 0,
        newSlot: null,
        replacesInvitation: false,
      },
    });
    expect(preview?.ok && actionPreview.safeParse(preview.data).success).toBe(true);
    // Neither the id of the buyer nor anything of an invitation in what the browser receives.
    expect(JSON.stringify(preview)).not.toContain(BUYER);
    expect(mocks.writes).toEqual([]);
  });

  it("a new slot: its start and its end, in Paris time; an invitation still valid is said replaced", async () => {
    mocks.visits.contacts = [contact({ invitedUntil: "2026-11-22T09:00:00+00:00" })];
    const preview = await tool.preview?.(
      { ...input, newSlot: { day: "2026-11-21", time: "14:00", minutes: 45 } },
      ctx,
    );
    expect(preview?.ok && preview.data).toMatchObject({
      slots: [{ startsAt: SATURDAY.startsAt, endsAt: SATURDAY.endsAt }],
      newSlot: { startsAt: "2026-11-21T13:00:00.000Z", endsAt: "2026-11-21T13:45:00.000Z" },
      replacesInvitation: true,
    });
    expect(preview?.ok && actionPreview.safeParse(preview.data).success).toBe(true);
    // Without any slot of the seller, the new one is enough.
    mocks.visits.slots = [];
    const alone = await tool.preview?.(
      { ...input, newSlot: { day: "2026-11-21", time: "14:00", minutes: 45 } },
      ctx,
    );
    expect(alone?.ok && alone.data.slots).toEqual([]);
    expect(alone?.ok && alone.data.newSlot).not.toBeNull();
    // The very slot the seller already has: nothing to add.
    mocks.visits.slots = [SATURDAY];
    const same = await tool.preview?.(
      { ...input, newSlot: { day: "2026-11-21", time: "10:30", minutes: 30 } },
      ctx,
    );
    expect(same?.ok && same.data.newSlot).toBeNull();
    expect(mocks.writes).toEqual([]);
  });

  it("lists 12 slots at most and counts the others", async () => {
    mocks.visits.slots = Array.from({ length: 15 }, (_, index) => {
      const day = String(21 + Math.floor(index / 5)).padStart(2, "0");
      const hour = String(9 + (index % 5)).padStart(2, "0");
      return slot(`2026-11-${day}T${hour}:00:00+00:00`, `2026-11-${day}T${hour}:30:00+00:00`);
    });
    const preview = await tool.preview?.(input, ctx);
    expect(preview?.ok && preview.data.slots).toHaveLength(VISIT_PREVIEW_SLOTS_MAX);
    expect(preview?.ok && preview.data.moreSlots).toBe(3);
    expect(preview?.ok && actionPreview.safeParse(preview.data).success).toBe(true);
  });

  it("refuses a buyer who is not a contact, an ambiguous first name, a buyer with a visit booked", async () => {
    expect(await tool.preview?.({ ...input, buyerFirstName: "Malik" }, ctx)).toEqual({
      ok: false,
      error: VISIT_NOT_A_CONTACT,
    });
    mocks.visits.contacts = [contact(), contact({ buyerId: "other" })];
    expect(await tool.preview?.(input, ctx)).toEqual({ ok: false, error: VISIT_AMBIGUOUS });
    mocks.visits.contacts = [contact({ hasVisit: true })];
    expect(await tool.preview?.(input, ctx)).toEqual({ ok: false, error: VISIT_ALREADY_BOOKED });
    mocks.visits.contacts = [contact({ firstName: null })];
    expect(await tool.preview?.(input, ctx)).toEqual({ ok: false, error: VISIT_NOT_A_CONTACT });
    expect(mocks.writes).toEqual([]);
  });

  it("refuses a property that is not the seller's, a listing off line, visits unreadable", async () => {
    mocks.property = null;
    expect(await tool.preview?.(input, ctx)).toEqual({
      ok: false,
      error: "No property of this seller has this id. Call get_my_properties.",
    });
    mocks.property = { id: PROPERTY, listingStatus: "draft" };
    expect(await tool.preview?.(input, ctx)).toEqual({ ok: false, error: VISIT_NOT_ONLINE });
    mocks.property = { id: PROPERTY, listingStatus: "paused" };
    mocks.readable = false;
    expect((await tool.preview?.(input, ctx))?.ok).toBe(false);
    expect(mocks.writes).toEqual([]);
  });

  it("refuses without any free slot, and a new slot invalid, too soon, too far or overlapping", async () => {
    const at = (day: string, time: string, minutes: 30 | 45 | 60 = 30) =>
      tool.preview?.({ ...input, newSlot: { day, time, minutes } }, ctx);
    // Too soon, in the past, a day that does not exist, more than 90 days ahead, overlapping.
    expect(await at("2026-11-19", "10:59")).toEqual({ ok: false, error: VISIT_SLOT_TOO_SOON });
    expect(await at("2026-11-18", "15:00")).toEqual({ ok: false, error: VISIT_SLOT_TOO_SOON });
    expect(await at("2026-02-30", "10:00")).toEqual({ ok: false, error: VISIT_SLOT_INVALID });
    expect(await at("2027-03-01", "10:00")).toEqual({ ok: false, error: VISIT_SLOT_TOO_FAR });
    expect(await at("2026-11-21", "10:15", 60)).toEqual({ ok: false, error: VISIT_SLOT_OVERLAP });
    // The same slot, already booked by someone else.
    mocks.visits.slots = [{ ...SATURDAY, bookedBy: "Malik", visitId: "visit-1" }];
    expect(await at("2026-11-21", "10:30")).toEqual({ ok: false, error: VISIT_SLOT_OVERLAP });
    // No free slot (the only one is booked), none given.
    expect(await tool.preview?.(input, ctx)).toEqual({ ok: false, error: VISIT_NO_SLOT });
    mocks.visits.slots = [];
    expect(await tool.preview?.(input, ctx)).toEqual({ ok: false, error: VISIT_NO_SLOT });
    // In 90 minutes: it can be added, but no buyer could book it, and there is no other.
    expect(await at("2026-11-19", "11:30")).toEqual({ ok: false, error: VISIT_SLOT_NOT_BOOKABLE });
    expect(mocks.writes).toEqual([]);
  });

  it("writes nothing without the confirmation of the seller", async () => {
    const output = await tool.execute(
      { ...input, newSlot: { day: "2026-11-21", time: "14:00", minutes: 30 } },
      ctx,
    );
    expect(output).toMatchObject({ invited: false });
    expect(isFailure(output)).toBe(true);
    expect(mocks.writes).toEqual([]);
  });

  it("once confirmed: the invitation, then its result in the log; never the token", async () => {
    const output = await tool.execute(input, { ...ctx, call });
    expect(output).toEqual({ invited: true, expiresAt: EXPIRES, slotAdded: false });
    expect(isFailure(output)).toBe(false);
    expect(mocks.writes).toEqual([
      { name: "visit_invite", args: { p_property: PROPERTY, p_buyer: BUYER } },
      {
        name: "insert:ai_messages",
        args: {
          conversation_id: "conv-1",
          role: "tool",
          content: {
            type: "tool_result",
            tool_use_id: "toolu_1",
            name: "propose_visit_slot",
            status: "confirmed",
            result: { invited: true, expiresAt: EXPIRES, slotAdded: false },
          },
        },
      },
    ]);
    expect(JSON.stringify(output)).not.toContain(TOKEN);
    expect(JSON.stringify(mocks.writes)).not.toContain(TOKEN);
  });

  it("with a new slot: visit_slot_add first, then visit_invite", async () => {
    const output = await tool.execute(
      { ...input, newSlot: { day: "2026-11-21", time: "14:00", minutes: 45 } },
      { ...ctx, call },
    );
    expect(output).toEqual({ invited: true, expiresAt: EXPIRES, slotAdded: true });
    expect(mocks.writes.map((write) => write.name)).toEqual([
      "visit_slot_add",
      "visit_invite",
      "insert:ai_messages",
    ]);
    expect(mocks.writes[0].args).toEqual({
      p_property: PROPERTY,
      p_starts_at: "2026-11-21T13:00:00.000Z",
      p_minutes: 45,
    });
    expect(JSON.stringify(output)).not.toContain(TOKEN);
    expect(JSON.stringify(mocks.writes)).not.toContain(TOKEN);
  });

  it("a slot refused by the database: no invitation; an invitation refused: said, with the slot added", async () => {
    const slotInput = {
      ...input,
      newSlot: { day: "2026-11-21", time: "14:00", minutes: 30 as const },
    };
    mocks.slotError = { code: "23P01", message: "the slot overlaps another one" };
    expect(await tool.execute(slotInput, { ...ctx, call })).toEqual({
      invited: false,
      error: VISIT_SLOT_OVERLAP,
    });
    expect(mocks.writes.map((write) => write.name)).toEqual(["visit_slot_add"]);

    mocks.writes = [];
    mocks.slotError = null;
    mocks.inviteError = { code: "22023", message: "this buyer has no relation with the property" };
    const failed = await tool.execute(slotInput, { ...ctx, call });
    expect(failed).toMatchObject({
      invited: false,
      error: expect.stringContaining("slot was added"),
    });
    expect(isFailure(failed)).toBe(true);
    // Nothing logged by the tool: the action logs the failure.
    expect(mocks.writes.map((write) => write.name)).toEqual(["visit_slot_add", "visit_invite"]);

    // What changed since the preview is refused before anything is written.
    mocks.writes = [];
    mocks.visits.contacts = [];
    expect(await tool.execute(input, { ...ctx, call })).toEqual({
      invited: false,
      error: VISIT_NOT_A_CONTACT,
    });
    expect(mocks.writes).toEqual([]);
  });

  it("a call answered meanwhile reads « answered », never done twice in the log", async () => {
    mocks.logError = { code: "23505" };
    expect(await tool.execute(input, { ...ctx, call })).toEqual({ invited: false, answered: true });
  });

  it("the card: the first name in its title, the sentence of the 7 days, « nous » never « on »", () => {
    const visit = frAssistant.action.visit;
    expect(visit.title("Chloé")).toBe("Inviter Chloé à visiter");
    expect(visit.note).toBe(
      "L'invitation est valable 7 jours. L'acquéreur choisit son créneau ; l'adresse exacte ne lui est donnée qu'une fois la visite confirmée.",
    );
    expect(visit.more(1)).toBe("et 1 autre créneau libre");
    expect(JSON.stringify(visit)).not.toMatch(/\bon\b/i);
  });
});

describe("the model of the tests (AI_MOCK)", () => {
  type Request = Parameters<typeof mockModel>[0];
  const person = (text: string) => ({
    role: "user" as const,
    content: [
      { type: "text" as const, text: "<dossier>Dossier.</dossier>" },
      { type: "text" as const, text },
    ],
  });
  const used = (id: string, name: string, toolInput: Record<string, unknown>) => ({
    role: "assistant" as const,
    content: [{ type: "tool_use" as const, id, name, input: toolInput }],
  });
  const gave = (id: string, content: string) => ({
    role: "user" as const,
    content: [{ type: "tool_result" as const, tool_use_id: id, content }],
  });
  const ask = async (messages: Request["messages"]) => {
    const answer = await mockModel(
      { model: "mock", max_tokens: 1, messages, tools: [] },
      { onText: () => {} },
    );
    return answer.content;
  };

  it("« visite »: the properties, the contacts, then propose_visit_slot for the contact named", async () => {
    const asked = person("Proposez une visite à Chloé le 2026-11-21 à 14:00");
    expect(await ask([asked])).toMatchObject([{ type: "tool_use", name: "get_my_properties" }]);
    const properties = [
      asked,
      used("a", "get_my_properties", {}),
      gave("a", JSON.stringify({ properties: [{ propertyId: PROPERTY }] })),
    ];
    expect(await ask(properties)).toMatchObject([
      { type: "tool_use", name: "summarize_contacts", input: { propertyId: PROPERTY } },
    ]);
    const contacts = [
      ...properties,
      used("b", "summarize_contacts", { propertyId: PROPERTY }),
      gave("b", JSON.stringify({ total: 1, contacts: [{ firstName: "Malik" }] })),
    ];
    const proposed = await ask(contacts);
    expect(proposed.at(-1)).toMatchObject({
      type: "tool_use",
      name: "propose_visit_slot",
      input: {
        propertyId: PROPERTY,
        buyerFirstName: "Chloé",
        newSlot: { day: "2026-11-21", time: "14:00", minutes: 30 },
      },
    });
    const block = proposed.at(-1);
    expect(tool.input.safeParse(block?.type === "tool_use" ? block.input : null).success).toBe(
      true,
    );
    const done = [
      ...contacts,
      used("c", "propose_visit_slot", {}),
      gave("c", JSON.stringify({ invited: true, expiresAt: EXPIRES, slotAdded: true })),
    ];
    expect(await ask(done)).toMatchObject([{ type: "text", text: "L'invitation est envoyée." }]);
  });

  it("« visite » without a name nor a date: the first contact, the slots of the seller", async () => {
    const asked = person("Proposez une visite");
    const proposed = await ask([
      asked,
      used("a", "get_my_properties", {}),
      gave("a", JSON.stringify({ properties: [{ propertyId: PROPERTY }] })),
      used("b", "summarize_contacts", { propertyId: PROPERTY }),
      gave("b", JSON.stringify({ total: 1, contacts: [{ firstName: "Malik" }] })),
    ]);
    expect(proposed.at(-1)).toMatchObject({
      name: "propose_visit_slot",
      input: { propertyId: PROPERTY, buyerFirstName: "Malik", newSlot: null },
    });
  });
});
