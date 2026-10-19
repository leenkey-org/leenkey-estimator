import { describe, expect, it } from "vitest";
import { sendErrorOf } from "@/core/messaging/errors";
import { threadItems } from "@/core/messaging/thread";
import { mergeMessages, toThreadMessage, type ThreadMessage } from "@/core/messaging/types";
import { contactLinks } from "@/leenkey/listings/presentation";
import {
  conversationSubtitle,
  conversationTitle,
  counterpartName,
  groupConversations,
  messagePreview,
  newConversationPath,
  propertyHref,
} from "@/leenkey/messaging/presentation";
import type { ConversationSummary } from "@/leenkey/messaging/types";
import {
  MESSAGE_MAX,
  firstMessageSchema,
  messageSchema,
  reportSchema,
} from "@/lib/validations/messaging";

const plain = (value: string) => value.replace(/[\u00A0\u202F]/g, " ");

const CONVERSATION = "5eed2000-0000-4000-8000-000000000011";
const LISTING = "623efc8b-97d4-4902-ac43-406417498893";

function conversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: CONVERSATION,
    role: "buyer",
    propertyId: "5eed1000-0000-4000-8000-000000000001",
    listingId: LISTING,
    listingSlug: "appartement-3-pieces-savigny-sur-orge-lk0005",
    listingStatus: "published",
    listingTitle: "Appartement 3 pièces avec balcon, proche gare",
    propertyType: "appartement",
    rooms: 3,
    city: "Savigny-sur-Orge",
    coverPath: null,
    counterpartFirstName: "Thomas",
    buyerFinancingStatus: null,
    lastMessageAt: "2026-10-15T07:12:00.000Z",
    lastMessageBody: "Bonjour, votre appartement m'intéresse.",
    lastMessageMine: false,
    unread: true,
    closed: false,
    ...overrides,
  };
}

function message(id: string, createdAt: string, senderId = "buyer"): ThreadMessage {
  return { id, conversationId: CONVERSATION, senderId, body: id, kind: "text", createdAt };
}

describe("a conversation in the messaging", () => {
  it("names the property as the header does (DESIGN.md 10.5)", () => {
    expect(plain(conversationTitle(conversation()))).toBe("Appartement 3 p · Savigny-sur-Orge");
    expect(plain(conversationTitle({ propertyType: "terrain", rooms: 0, city: "Étampes" }))).toBe(
      "Terrain · Étampes",
    );
    expect(plain(conversationTitle({ propertyType: null, rooms: null, city: null }))).toBe("Bien");
  });

  it("names the other party, without a first name too", () => {
    expect(counterpartName(conversation())).toBe("Thomas");
    expect(counterpartName(conversation({ counterpartFirstName: null }))).toBe("le vendeur");
    expect(counterpartName(conversation({ role: "seller", counterpartFirstName: null }))).toBe(
      "l'acquéreur",
    );
  });

  it("shows the financing of the buyer to the seller only, with its exact label", () => {
    expect(conversationSubtitle(conversation({ buyerFinancingStatus: "document_checked" }))).toBe(
      "Avec Thomas",
    );
    const seller = conversation({ role: "seller", buyerFinancingStatus: "document_checked" });
    expect(plain(conversationSubtitle(seller))).toBe("Avec Thomas · Justificatif vérifié");
    expect(plain(conversationSubtitle({ ...seller, buyerFinancingStatus: "not_provided" }))).toBe(
      "Avec Thomas · Financement non renseigné",
    );
    for (const status of [
      "not_provided",
      "declared",
      "document_provided",
      "document_checked",
    ] as const) {
      expect(conversationSubtitle({ ...seller, buyerFinancingStatus: status })).not.toMatch(
        /valid/i,
      );
    }
  });

  it("previews the last message on one line", () => {
    expect(messagePreview(conversation({ lastMessageBody: "Bonjour,\n\n  à samedi" }))).toBe(
      "Bonjour, à samedi",
    );
    expect(messagePreview(conversation({ lastMessageMine: true, lastMessageBody: "Oui" }))).toBe(
      "Vous : Oui",
    );
  });

  it("leads the seller to their property, the buyer to the listing while it is online", () => {
    expect(propertyHref(conversation())).toBe(
      "/annonce/appartement-3-pieces-savigny-sur-orge-lk0005",
    );
    expect(propertyHref(conversation({ listingStatus: "paused" }))).toBeNull();
    expect(propertyHref(conversation({ role: "seller" }))).toBe(
      "/vendeur/biens/5eed1000-0000-4000-8000-000000000001",
    );
  });
});

describe("the list of the conversations", () => {
  const a1 = conversation({ id: "a1", role: "seller", propertyId: "A", listingTitle: "Maison A" });
  const b1 = conversation({ id: "b1", role: "seller", propertyId: "B", listingTitle: "Maison B" });
  const a2 = conversation({ id: "a2", role: "seller", propertyId: "A", listingTitle: "Maison A" });
  const buy = conversation({ id: "buy" });

  it("is one list for a buyer, or a seller of one property", () => {
    expect(groupConversations([])).toEqual([]);
    const [only] = groupConversations([buy]);
    expect(only).toMatchObject({ title: null, showProperty: true });
    expect(groupConversations([a1, a2])).toHaveLength(1);
  });

  it("groups by property for a seller of several, then the listings contacted", () => {
    const groups = groupConversations([a1, b1, buy, a2]);
    expect(
      groups.map((group) => [group.title, group.conversations.map((item) => item.id)]),
    ).toEqual([
      ["Maison A", ["a1", "a2"]],
      ["Maison B", ["b1"]],
      ["Annonces contactées", ["buy"]],
    ]);
    expect(groups.map((group) => group.showProperty)).toEqual([false, false, true]);
    // A seller of one property who also buys: two groups.
    expect(groupConversations([a1, buy]).map((group) => group.title)).toEqual([
      "Maison A",
      "Annonces contactées",
    ]);
  });
});

describe("contact from a listing", () => {
  it("writes to the seller, about a visit for the second button", () => {
    expect(newConversationPath(LISTING)).toBe(`/messages/nouveau?annonce=${LISTING}`);
    expect(newConversationPath(LISTING, { visit: true })).toBe(
      `/messages/nouveau?annonce=${LISTING}&visite=1`,
    );
    const listing = { id: LISTING, slug: "appartement-lk0005" };
    expect(contactLinks(listing, true)).toEqual({
      contact: `/messages/nouveau?annonce=${LISTING}`,
      visit: `/messages/nouveau?annonce=${LISTING}&visite=1`,
      signedIn: true,
    });
  });

  it("goes through the sign-up of a buyer without a session, then to the message", () => {
    const { contact, visit } = contactLinks({ id: LISTING, slug: "appartement-lk0005" }, false);
    const next = (href: string) => new URL(href, "https://leenkey.fr").searchParams;
    expect(contact.startsWith("/inscription?")).toBe(true);
    expect(next(contact).get("role")).toBe("buyer");
    expect(next(contact).get("next")).toBe(`/messages/nouveau?annonce=${LISTING}`);
    expect(next(visit).get("next")).toBe(`/messages/nouveau?annonce=${LISTING}&visite=1`);
  });
});

describe("the thread", () => {
  it("keeps each message once, in order", () => {
    const first = message("m1", "2026-10-15T07:12:00.000Z");
    const second = message("m2", "2026-10-15T07:40:00.000Z", "seller");
    const third = message("m3", "2026-10-15T08:05:00.000Z");
    expect(mergeMessages([first, third], [second, third]).map((item) => item.id)).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
    // The same time: by id, as the database does.
    const twin = message("m0", first.createdAt);
    expect(mergeMessages([first], [twin]).map((item) => item.id)).toEqual(["m0", "m1"]);
  });

  it("reads the rows of Realtime and PostgREST the same way", () => {
    const row = {
      id: "m1",
      conversation_id: CONVERSATION,
      sender_id: "buyer",
      body: "Bonjour",
      kind: "visit_invite",
      created_at: "2026-10-15T07:12:00.123456+00:00",
    };
    expect(toThreadMessage(row)).toEqual({
      id: "m1",
      conversationId: CONVERSATION,
      senderId: "buyer",
      body: "Bonjour",
      kind: "visit_invite",
      createdAt: "2026-10-15T07:12:00.123Z",
    });
    expect(toThreadMessage({ ...row, kind: "unknown" }).kind).toBe("text");
  });

  it("dates the first message of each day, in Paris", () => {
    const items = threadItems(
      [
        message("m1", "2026-09-22T07:12:00.000Z"),
        message("m2", "2026-09-22T21:30:00.000Z"),
        // 22:30 UTC on 22 September is 00:30 on 23 September in Paris.
        message("m3", "2026-09-22T22:30:00.000Z"),
      ],
      "2026-10-15T12:00:00Z",
    );
    expect(items.map((item) => (item.kind === "date" ? item.label : item.message.id))).toEqual([
      "Mardi 22 septembre",
      "m1",
      "m2",
      "Mercredi 23 septembre",
      "m3",
    ]);
  });
});

describe("what the database refuses", () => {
  it("maps each refusal to its message", () => {
    expect(sendErrorOf({ code: "54000", message: "messages_per_hour" })).toBe("messagesPerHour");
    expect(sendErrorOf({ code: "54000", message: "conversations_per_day" })).toBe(
      "conversationsPerDay",
    );
    expect(sendErrorOf({ code: "42501", message: "conversation closed" })).toBe("closed");
    // RLS, or conversation_start for a suspended account.
    expect(sendErrorOf({ code: "42501", message: "not authenticated" })).toBe("inactive");
    expect(sendErrorOf({ code: "22023" })).toBe("listingUnavailable");
    expect(sendErrorOf({ code: "23514" })).toBe("tooLong");
    expect(sendErrorOf({ code: "08006" })).toBe("unavailable");
  });
});

describe("what a participant sends", () => {
  it("refuses an empty message and one of more than 4 000 characters", () => {
    const base = { conversationId: CONVERSATION };
    expect(messageSchema.safeParse({ ...base, body: "  Bonjour  " }).data?.body).toBe("Bonjour");
    expect(messageSchema.safeParse({ ...base, body: "   " }).error?.issues[0].message).toBe(
      "empty",
    );
    expect(
      messageSchema.safeParse({ ...base, body: "a".repeat(MESSAGE_MAX + 1) }).error?.issues[0]
        .message,
    ).toBe("tooLong");
    // Counted as Postgres does: an emoji is one character.
    expect(messageSchema.safeParse({ ...base, body: "😀".repeat(MESSAGE_MAX) }).success).toBe(true);
    expect(firstMessageSchema.safeParse({ listingId: "LK-0005", body: "Bonjour" }).success).toBe(
      false,
    );
  });

  it("asks a reason of 3 characters at least for a report", () => {
    const base = { conversationId: CONVERSATION };
    expect(reportSchema.safeParse({ ...base, reason: "ok" }).error?.issues[0].message).toBe(
      "tooShort",
    );
    expect(reportSchema.safeParse({ ...base, reason: "Propos insultants" }).success).toBe(true);
  });
});
