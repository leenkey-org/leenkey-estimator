import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlannedEmail, QueuedNotification } from "@/core/notifications/batch";
import type { NotificationView } from "@/core/notifications/types";
import { describeNotification, inFilter } from "@/leenkey/notifications/catalog";
import {
  FEEDBACK_DAYS,
  feedbackDeadline,
  feedbackWindow,
  interestOf,
  visitTookPlace,
} from "@/leenkey/visits/feedback";
import { frVisits } from "@/lib/i18n/sections/visits";
import {
  VISIT_INTERESTS,
  visitBuyerFeedbackSchema,
  visitSellerFeedbackSchema,
} from "@/lib/validations/visit";

// L3-03: the feedback after a visit (SPEC-V2 14): when its form opens and
// closes, what is accepted, and the request of the day after (bell, email).

vi.mock("server-only", () => ({}));

const plain = (value: string | undefined | null) => (value ?? "").replace(/[\u00A0\u202F]/g, " ");
const ENDS = "2026-11-20T10:00:00Z";
const VISIT = "7d9f3c1e-2a4b-4c6d-8e0f-1a2b3c4d5e6f";

describe("when the feedback of a visit is given", () => {
  it("a visit took place once its slot ended, unless it was cancelled", () => {
    expect(visitTookPlace("confirmed", ENDS, new Date("2026-11-20T09:59:00Z"))).toBe(false);
    expect(visitTookPlace("confirmed", ENDS, new Date("2026-11-20T10:00:00Z"))).toBe(true);
    expect(visitTookPlace("done", ENDS, new Date("2026-11-21T08:00:00Z"))).toBe(true);
    expect(visitTookPlace("cancelled", ENDS, new Date("2026-11-21T08:00:00Z"))).toBe(false);
    expect(visitTookPlace("requested", ENDS, new Date("2026-11-21T08:00:00Z"))).toBe(false);
  });

  it("the form is open for 7 days after the visit, then closed", () => {
    expect(FEEDBACK_DAYS).toBe(7);
    expect(feedbackDeadline(ENDS).toISOString()).toBe("2026-11-27T10:00:00.000Z");
    expect(feedbackWindow("confirmed", ENDS, new Date("2026-11-20T09:00:00Z"))).toBe("none");
    expect(feedbackWindow("confirmed", ENDS, new Date("2026-11-20T10:00:00Z"))).toBe("open");
    expect(feedbackWindow("confirmed", ENDS, new Date("2026-11-27T09:59:59Z"))).toBe("open");
    expect(feedbackWindow("confirmed", ENDS, new Date("2026-11-27T10:00:00Z"))).toBe("closed");
    expect(feedbackWindow("done", ENDS, new Date("2026-12-24T10:00:00Z"))).toBe("closed");
    expect(feedbackWindow("cancelled", ENDS, new Date("2026-11-21T10:00:00Z"))).toBe("none");
  });

  it("an interest is a whole number from 1 to 5, each with its words", () => {
    expect(VISIT_INTERESTS.map(interestOf)).toEqual([1, 2, 3, 4, 5]);
    for (const value of [0, 6, 2.5, "4", null, undefined, Number.NaN]) {
      expect(interestOf(value)).toBeNull();
    }
    expect(VISIT_INTERESTS.map((value) => frVisits.feedback.interestLabels[value])).toEqual([
      "Pas intéressé",
      "Peu intéressé",
      "À réfléchir",
      "Intéressé",
      "Très intéressé",
    ]);
    expect(frVisits.feedback.interestValue(4)).toBe("Intérêt 4 / 5");
    expect(frVisits.feedback.none).toBe("Retour non donné");
  });

  it("the texts keep the editorial rules: no « on », no judgement of the buyer", () => {
    const texts = JSON.stringify(frVisits.feedback, (_key, value) =>
      typeof value === "function" ? value(3, "x") : value,
    );
    expect(texts).not.toMatch(/\bon\b/i);
    expect(texts).not.toMatch(/\b(sérieux|fiable|moyenne|classement)\b/i);
  });
});

describe("what a party sends", () => {
  it("the buyer: an interest from 1 to 5, a comment trimmed and optional", () => {
    expect(visitBuyerFeedbackSchema.parse({ visitId: VISIT, interest: 4 })).toEqual({
      visitId: VISIT,
      interest: 4,
      comment: "",
    });
    expect(
      visitBuyerFeedbackSchema.parse({ visitId: VISIT, interest: 5, comment: "  Lumineux.  " })
        .comment,
    ).toBe("Lumineux.");
    for (const interest of [0, 6, 3.5, "4", null, undefined]) {
      expect(visitBuyerFeedbackSchema.safeParse({ visitId: VISIT, interest }).success).toBe(false);
    }
    expect(visitBuyerFeedbackSchema.safeParse({ visitId: "v1", interest: 3 }).success).toBe(false);
    expect(
      visitBuyerFeedbackSchema.safeParse({
        visitId: VISIT,
        interest: 3,
        comment: "a".repeat(2001),
      }).success,
    ).toBe(false);
    expect(
      visitBuyerFeedbackSchema.safeParse({
        visitId: VISIT,
        interest: 3,
        comment: "a".repeat(2000),
      }).success,
    ).toBe(true);
  });

  it("the seller: a note of 2000 characters at most (an empty one erases it)", () => {
    expect(visitSellerFeedbackSchema.parse({ visitId: VISIT, comment: " Ponctuel. " })).toEqual({
      visitId: VISIT,
      comment: "Ponctuel.",
    });
    expect(visitSellerFeedbackSchema.parse({ visitId: VISIT, comment: "   " }).comment).toBe("");
    expect(visitSellerFeedbackSchema.safeParse({ visitId: VISIT }).success).toBe(false);
    expect(
      visitSellerFeedbackSchema.safeParse({ visitId: VISIT, comment: "a".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("the request of the day after (visit.feedback_requested)", () => {
  const facts = {
    entity_id: "v1",
    visit_id: "v1",
    property_id: "p1",
    listing_id: "l1",
    title: "Maison familiale 5 pièces",
    city: "Savigny-sur-Orge",
    buyer_first_name: "Chloé",
    seller_first_name: "Alice",
    starts_at: "2026-11-21T09:30:00Z",
    ends_at: "2026-11-21T10:00:00Z",
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://leenkey-v2.vercel.app";
  });

  const view = (
    role: "buyer" | "seller",
    data: Record<string, unknown> = facts,
  ): NotificationView => ({
    id: "n1",
    type: "visit.feedback_requested",
    title: null,
    body: null,
    data: { ...data, role },
    link: "/visites/v1",
    createdAt: "2026-11-22T08:00:00Z",
    readAt: null,
  });

  it("in the bell: its words for each party, in both filters", () => {
    const buyer = describeNotification(view("buyer"));
    expect(buyer.title).toBe("Donnez votre retour sur votre visite");
    expect(plain(buyer.detail)).toBe(
      "samedi 21 novembre à 10 h 30 · « Maison familiale 5 pièces »",
    );
    expect(describeNotification(view("seller")).title).toBe("Visite de Chloé : votre note");
    expect(describeNotification(view("seller", {}))).toMatchObject({
      title: "Visite passée : votre note",
      detail: null,
    });
    expect(inFilter(view("buyer"), "visitsOffers")).toBe(true);
    expect(inFilter(view("seller"), "offersVisits")).toBe(true);
    expect(inFilter(view("buyer"), "messages")).toBe(false);
  });

  const queued = (role: "buyer" | "seller", data: Record<string, unknown>): QueuedNotification => ({
    id: "n1",
    profileId: role,
    type: "visit.feedback_requested",
    data: { ...data, role },
    link: "/visites/v1",
    groupKey: "visit-feedback:v1",
    createdAt: new Date("2026-11-22T08:00:00Z"),
    emailAfter: new Date("2026-11-22T08:00:00Z"),
    readAt: null,
    email: `${role}@exemple.test`,
    firstName: role === "buyer" ? "Chloé" : "Alice",
    prefs: {},
    active: true,
    groupLastSentAt: null,
  });
  const planned = (
    role: "buyer" | "seller",
    data: Record<string, unknown> = facts,
  ): PlannedEmail => {
    const item = queued(role, data);
    return {
      audience: "recipient",
      type: item.type,
      groupKey: item.groupKey,
      profileId: item.profileId,
      email: item.email,
      firstName: item.firstName,
      items: [item],
      rows: [item],
      ids: [item.id],
    };
  };

  it("by email: once, under the preference of the messages", async () => {
    const { emailPolicy } = await import("@/leenkey/notifications/email-catalog");
    expect(emailPolicy("visit.feedback_requested")).toEqual({
      audience: "recipient",
      preference: "email_messages",
      throttleMinutes: 0,
    });
  });

  it("the email of the buyer: the visit, the link of its page, the 7 days", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(planned("buyer"));
    expect(email?.subject).toBe("Votre retour sur votre visite");
    const text = plain(email?.text);
    expect(text).toContain("Bonjour Chloé");
    expect(text).toContain(
      "Vous avez visité le bien « Maison familiale 5 pièces » samedi 21 novembre à 10 h 30.",
    );
    expect(text).toContain("Il lit votre retour tel que vous l'écrivez.");
    expect(text).toContain("Cette page reste ouverte 7 jours après la visite.");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/visites/v1");
    expect(email?.attachments).toBeUndefined();
    expect(email?.text).not.toMatch(/\bon\b|Adresse|@exemple/i);
  });

  it("the email of the seller: the first name of the buyer, the note stays private", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    const email = await renderNotificationEmail(planned("seller"));
    expect(email?.subject).toBe("Votre note sur la visite de votre bien");
    const text = plain(email?.text);
    expect(text).toContain(
      "Chloé a visité votre bien « Maison familiale 5 pièces » samedi 21 novembre à 10 h 30.",
    );
    expect(text).toContain("elle reste privée, l'acquéreur ne la lit pas");
    expect(email?.html).toContain("https://leenkey-v2.vercel.app/visites/v1");
    expect(email?.text).not.toMatch(/\bon\b|Adresse|@exemple/i);
  });

  it("nothing leaves without the date of the visit", async () => {
    const { renderNotificationEmail } = await import("@/leenkey/notifications/email-catalog");
    expect(await renderNotificationEmail(planned("buyer", { title: "Maison" }))).toBeNull();
  });
});
