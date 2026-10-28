import { describe, expect, it } from "vitest";
import { toProgress, type StepRow } from "@/core/steps/progress";
import type { ConversationSummary } from "@/leenkey/messaging/types";
import {
  chooseProperty,
  dashboardMode,
  daysOnSale,
  nextActionView,
  propertyConversations,
  saleEditable,
  saleFigures,
  stepHeading,
  stepTickable,
  taskLines,
  taskTickable,
  weekStart,
} from "@/leenkey/properties/dashboard";
import type { NextAction, SaleSituation } from "@/leenkey/properties/next-action";
import type { SellerProperty } from "@/leenkey/properties/queries";

// L1-24: « Ma vente », what it shows of a sale (SPEC-V2 8.7, DESIGN.md 12.3).

const NOW = new Date("2026-10-28T10:00:00Z");

const rows: StepRow[] = [
  {
    code: "publish",
    position: 2,
    title: "Créer et publier mon annonce",
    description: "Une annonce claire attire les acquéreurs.",
    owner: "seller",
    tasks: [
      {
        id: "t-written",
        code: "listing_written",
        title: "Annonce rédigée",
        required: true,
        auto_trigger: "listing.draft_complete",
        owner: "seller",
        position: 1,
      },
      {
        id: "t-published",
        code: "listing_published",
        title: "Annonce en ligne",
        required: true,
        auto_trigger: "listing.published",
        owner: "seller",
        position: 2,
      },
      {
        id: "t-reviewed",
        code: "listing_reviewed",
        title: "Annonce relue par le conseiller",
        required: false,
        auto_trigger: null,
        owner: "leenkey",
        position: 3,
      },
    ],
  },
  {
    code: "notary",
    position: 5,
    title: "Préparer ma vente avec le notaire",
    description: "",
    owner: "seller",
    tasks: [
      {
        id: "t-notary",
        code: "notary_chosen",
        title: "Notaire choisi",
        required: true,
        auto_trigger: null,
        owner: "seller",
        position: 1,
      },
      {
        id: "t-precontract",
        code: "precontract_signed",
        title: "Avant-contrat signé",
        required: true,
        auto_trigger: null,
        owner: "both",
        position: 2,
      },
    ],
  },
];

const progress = (current: string, done: string[]) =>
  toProgress(
    { template: "accompagne", currentStepCode: current },
    rows,
    done.map((id) => ({ task_id: id, done_at: "2026-10-20T09:00:00Z" })),
  );

const characteristics: SellerProperty["characteristics"] = {
  type: "appartement",
  surfaceM2: 68,
  carrezM2: null,
  rooms: 3,
  bedrooms: 2,
  floor: 3,
  floorsTotal: 5,
  buildYear: 1975,
  isNewBuild: false,
  dpe: "C",
  ges: "D",
  heating: null,
  features: [],
  chargesMonthlyEuros: null,
  propertyTaxYearlyEuros: null,
  coproLots: null,
};

function property(
  status: SellerProperty["listingStatus"],
  extra: Partial<Pick<SellerProperty, "id" | "createdAt">> & { publishedAt?: string } = {},
): Pick<SellerProperty, "id" | "listingStatus" | "listing" | "createdAt" | "characteristics"> {
  return {
    id: extra.id ?? "p1",
    listingStatus: status,
    createdAt: extra.createdAt ?? "2026-10-01T09:00:00Z",
    characteristics,
    listing: status
      ? {
          id: "l1",
          reference: "LK-0042",
          slug: "appartement-lk0042",
          title: "Appartement 3 pièces",
          description: "",
          priceCents: 23_900_000,
          status,
          rejectionReason: null,
          suspensionReason: null,
          publishedAt: extra.publishedAt ?? null,
          soldAt: null,
          soldPriceCents: null,
        }
      : null,
  };
}

function conversation(patch: Partial<ConversationSummary>): ConversationSummary {
  return {
    id: "c1",
    role: "seller",
    propertyId: "p1",
    listingId: "l1",
    listingSlug: "appartement-lk0042",
    listingStatus: "published",
    listingTitle: "Appartement 3 pièces",
    propertyType: "appartement",
    rooms: 3,
    city: "Savigny-sur-Orge",
    coverPath: null,
    counterpartFirstName: "Thomas",
    buyerFinancingStatus: null,
    lastMessageAt: "2026-10-27T09:00:00Z",
    lastMessageBody: "Bonjour",
    lastMessageMine: false,
    unread: true,
    closed: false,
    ...patch,
  };
}

describe("the property of « Ma vente »", () => {
  it("is the one asked when it is the seller's, otherwise the one on sale", () => {
    const draft = property("draft", { id: "draft", createdAt: "2026-10-27T09:00:00Z" });
    const older = property("published", { id: "older", publishedAt: "2026-09-01T09:00:00Z" });
    const newer = property("paused", { id: "newer", publishedAt: "2026-10-10T09:00:00Z" });
    const sold = property("sold", { id: "sold", publishedAt: "2026-10-20T09:00:00Z" });
    const all = [draft, older, sold, newer];
    expect(chooseProperty(all)?.id).toBe("newer");
    expect(chooseProperty(all, "draft")?.id).toBe("draft");
    // Not one of theirs: the property of the sale.
    expect(chooseProperty(all, "someone-else")?.id).toBe("newer");
    expect(chooseProperty([draft, sold])?.id).toBe("draft");
    expect(chooseProperty([])).toBeNull();
  });

  it("a draft invites to finish it, a sold one shows its recap", () => {
    expect(dashboardMode({ listingStatus: null })).toBe("draft");
    expect(dashboardMode({ listingStatus: "draft" })).toBe("draft");
    expect(dashboardMode({ listingStatus: "rejected" })).toBe("sale");
    expect(dashboardMode({ listingStatus: "pending" })).toBe("sale");
    expect(dashboardMode({ listingStatus: "sold" })).toBe("sold");
  });
});

describe("the step and the next action in words", () => {
  it("says the step of the sale among those of its plan", () => {
    expect(stepHeading(progress("notary", []))).toEqual({
      current: 2,
      total: 2,
      label: "Étape 2 sur 2 · Préparer ma vente avec le notaire",
    });
  });

  const links = {
    sheet: "/vendeur/biens/p1",
    steps: "/vendeur/biens/p1/etapes",
    messages: "/messages",
    listing: "/annonce/appartement-savigny-lk-0001",
  };

  it("a buyer waiting: their first name, since when, the conversation", () => {
    const view = nextActionView(
      {
        rule: "buyerWaiting",
        href: "/messages/c1",
        firstName: "Thomas",
        since: "2026-10-27T09:00:00Z",
      },
      links,
      NOW,
    );
    expect(view.title).toBe("Répondez à Thomas");
    expect(view.detail).toBe("Message reçu hier. Une réponse rapide garde l'acquéreur intéressé.");
    expect(view.primary).toEqual({ label: "Répondre", href: "/messages/c1" });
  });

  it("a task: what to do, where; by hand, the task to tick", () => {
    const sale = progress("notary", []);
    const step = sale.steps[1];
    const task = step.tasks[0];
    const byHand: NextAction = { rule: "task", step, task, href: null };
    expect(nextActionView(byHand, links, NOW)).toMatchObject({
      title: "Choisissez votre notaire",
      detail: "Étape « Préparer ma vente avec le notaire ».",
      primary: { label: "C'est fait", taskId: "t-notary", taskTitle: "Notaire choisi" },
      secondary: { href: "/vendeur/biens/p1/etapes" },
    });
    const rejected = nextActionView(
      { rule: "listingRejected", href: "/vendeur/biens/p1/prix", reason: null },
      links,
      NOW,
    );
    expect(rejected.detail).toBe("Nous vous indiquons ce qu'il faut modifier avant de la publier.");
  });

  it("nothing to do: the review under way, or the listing as buyers see it", () => {
    const step = progress("notary", []).steps[1];
    expect(nextActionView({ rule: "advice", step }, links, NOW, "published")).toEqual({
      icon: "advice",
      title: "Préparer ma vente avec le notaire",
      detail: null,
      primary: { label: "Voir l'annonce en ligne", href: "/annonce/appartement-savigny-lk-0001" },
      secondary: null,
    });
    expect(nextActionView({ rule: "advice", step }, links, NOW, "pending")).toMatchObject({
      title: "Nous relisons votre annonce",
      detail: "Nous la relisons sous 24\u00A0h et vous prévenons par email.",
      primary: { label: "Voir le bien", href: "/vendeur/biens/p1" },
    });
    expect(nextActionView({ rule: "advice", step }, links, NOW, "paused").primary).toEqual({
      label: "Voir le bien",
      href: "/vendeur/biens/p1",
    });
  });
});

describe("the tasks of the current step", () => {
  const owned: SaleSituation["property"] = property("published");

  it("the next one the seller can do is current; who does the others", () => {
    const lines = taskLines(progress("publish", ["t-written"]).steps[0], owned, true);
    expect(lines.map((line) => [line.title, line.state, line.detail, line.manual])).toEqual([
      ["Annonce rédigée", "done", null, false],
      // Ticked by the database when Leenkey publishes it.
      ["Annonce en ligne", "todo", "Se coche automatiquement", false],
      ["Annonce relue par le conseiller", "todo", "Par votre conseiller Leenkey", false],
    ]);
  });

  it("the tasks without event of the seller are ticked by hand, never once suspended", () => {
    const step = progress("notary", ["t-notary"]).steps[1];
    expect(
      taskLines(step, owned, true).map((line) => [line.state, line.manual, line.detail]),
    ).toEqual([
      ["done", true, null],
      ["current", true, "À cocher quand c'est fait"],
    ]);
    // Not tickable (suspended, sold, a later step): still by hand, never « automatically ».
    expect(taskLines(step, owned, false).map((line) => [line.manual, line.detail])).toEqual([
      [false, null],
      [false, "À cocher quand c'est fait"],
    ]);
  });

  it("ticked by hand up to the current step, on a sale neither suspended nor sold", () => {
    const atPublish = progress("publish", []);
    const atNotary = progress("notary", []);
    // A task of a later step waits for it.
    expect(taskTickable(atPublish, "t-notary", "published")).toBe(false);
    expect(stepTickable(atPublish, atPublish.steps[1])).toBe(false);
    expect(taskTickable(atNotary, "t-notary", "published")).toBe(true);
    expect(taskTickable(atNotary, "t-precontract", "paused")).toBe(true);
    // Never a task with an event, nor one of Leenkey; never once suspended or sold.
    expect(taskTickable(atNotary, "t-written", "published")).toBe(false);
    expect(taskTickable(atNotary, "t-reviewed", "published")).toBe(false);
    expect(taskTickable(atNotary, "t-notary", "suspended")).toBe(false);
    expect(taskTickable(atNotary, "t-notary", "sold")).toBe(false);
    expect(taskTickable(atNotary, "unknown", "published")).toBe(false);
    expect(saleEditable("rejected")).toBe(true);
  });
});

describe("the figures of the listing", () => {
  it("views over seven days, contacts, buyers whose financing is at least declared", () => {
    const list = propertyConversations(
      [
        conversation({
          id: "a",
          buyerFinancingStatus: "declared",
          lastMessageAt: "2026-10-26T09:00:00Z",
        }),
        conversation({ id: "b", buyerFinancingStatus: "not_provided" }),
        conversation({
          id: "c",
          buyerFinancingStatus: "document_checked",
          lastMessageAt: "2026-10-28T08:00:00Z",
        }),
        // Another property, and a conversation where the account buys.
        conversation({ id: "d", propertyId: "p2" }),
        conversation({ id: "e", role: "buyer" }),
      ],
      "p1",
    );
    expect(list.map((item) => item.id)).toEqual(["c", "b", "a"]);
    expect(saleFigures(list, [{ count: 12 }, { count: 30 }])).toEqual({
      views: 42,
      contacts: 3,
      qualified: 2,
    });
  });

  it("the seven days are those of Paris, today included", () => {
    expect(weekStart(NOW)).toBe("2026-10-22");
    // 23:30 in Paris on the 28th is already the 28th there.
    expect(weekStart(new Date("2026-10-27T23:30:00Z"))).toBe("2026-10-22");
  });

  it("a sale lasts from its publication to its sale, one day at least", () => {
    expect(daysOnSale("2026-09-18T09:00:00Z", "2026-10-28T09:00:00Z")).toBe(40);
    expect(daysOnSale("2026-10-28T08:00:00Z", "2026-10-28T09:00:00Z")).toBe(1);
    expect(daysOnSale(null, "2026-10-28T09:00:00Z")).toBeNull();
  });
});
