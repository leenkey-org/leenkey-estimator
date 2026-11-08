import { render } from "@react-email/components";
import { describe, expect, it, vi } from "vitest";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { PlanActivatedEmail, planActivatedSubject } from "@/emails/plan-activated";
import { PlanPurchasedEmail, planPurchasedSubject } from "@/emails/plan-purchased";
import {
  checkoutMetadata,
  firstContactFrom,
  planChoice,
  withdrawalEnds,
} from "@/leenkey/billing/orders";
import { priceIdFor, priceMatches } from "@/leenkey/billing/prices";
import { describeNotification } from "@/leenkey/notifications/catalog";
import { formatAmount } from "@/lib/format";
import { paidPlansOrderable } from "@/lib/config/sales";
import { checkoutMetadataSchema, checkoutSchema, sessionIdSchema } from "@/lib/validations/billing";

// L1-26: what a seller may order, the Stripe prices, the metadata read back
// by the webhook, the texts. The SQL is tested in
// supabase/tests/rls_stripe_checkout.sql, the screens in
// tests/e2e/billing.spec.ts.

vi.mock("server-only", () => ({}));

const plans = [
  { code: "autonomie" as const, priceCents: 0 },
  { code: "accompagne" as const, priceCents: 99000 },
  { code: "serenite" as const, priceCents: 150000 },
];
const propertyId = "5eed1000-0000-4000-8000-000000000009";
const ownerId = "5eed0000-0000-4000-8000-00000000000b";

describe("planChoice", () => {
  it("orders a paid plan on Autonomie at its price", () => {
    expect(planChoice(plans, "autonomie", "accompagne")).toEqual({
      status: "order",
      kind: "new",
      amountCents: 99000,
    });
    expect(planChoice(plans, "autonomie", "serenite")).toMatchObject({ amountCents: 150000 });
  });

  it("passes to a dearer plan for the difference, never to a lower one", () => {
    expect(planChoice(plans, "accompagne", "serenite")).toEqual({
      status: "order",
      kind: "upgrade",
      amountCents: 51000,
    });
    expect(planChoice(plans, "serenite", "accompagne")).toEqual({ status: "lower" });
    expect(planChoice(plans, "serenite", "serenite")).toEqual({ status: "current" });
    expect(planChoice(plans, "accompagne", "autonomie")).toEqual({ status: "free" });
  });

  it("takes the amounts from the table, whatever they are", () => {
    const dearer = plans.map((plan) => ({ ...plan, priceCents: plan.priceCents * 2 }));
    expect(planChoice(dearer, "accompagne", "serenite")).toMatchObject({ amountCents: 102000 });
  });

  it("needs the price of the plan in force, on sale or not", () => {
    // allPlans() gives the plans withdrawn from sale too; without the one in
    // force, the passage would cost the full price.
    expect(planChoice(plans.slice(2), "accompagne", "serenite")).toMatchObject({
      kind: "new",
      amountCents: 150000,
    });
  });
});

describe("Stripe prices", () => {
  const env = {
    STRIPE_PRICE_ACCOMPAGNE: "price_a",
    STRIPE_PRICE_SERENITE: " price_s ",
    STRIPE_PRICE_UPGRADE: "price_u",
  };

  it("reads the price of each order in the environment", () => {
    expect(priceIdFor("accompagne", "new", env)).toBe("price_a");
    expect(priceIdFor("serenite", "new", env)).toBe("price_s");
    expect(priceIdFor("serenite", "upgrade", env)).toBe("price_u");
    expect(priceIdFor("accompagne", "upgrade", env)).toBeNull();
    expect(priceIdFor("autonomie", "new", env)).toBeNull();
    expect(priceIdFor("accompagne", "new", {})).toBeNull();
  });

  it("orders only when Stripe holds the amount of the table, once, in euros", () => {
    const price = { unitAmount: 99000, currency: "eur", active: true, recurring: false };
    expect(priceMatches(price, 99000)).toBe(true);
    expect(priceMatches({ ...price, unitAmount: 89000 }, 99000)).toBe(false);
    expect(priceMatches({ ...price, currency: "usd" }, 99000)).toBe(false);
    expect(priceMatches({ ...price, active: false }, 99000)).toBe(false);
    expect(priceMatches({ ...price, recurring: true }, 99000)).toBe(false);
    expect(priceMatches({ ...price, unitAmount: null }, 99000)).toBe(false);
  });
});

describe("the order and its metadata", () => {
  it("refuses an order without the CGU and CGV accepted", () => {
    const order = {
      propertyId,
      plan: "accompagne",
      earlyStart: false,
      cguVersion: "2026-06-28",
      cgvVersion: "2026-10-17",
    };
    expect(checkoutSchema.safeParse({ ...order, acceptedTerms: true }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...order, acceptedTerms: false }).success).toBe(false);
    expect(checkoutSchema.safeParse(order).success).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...order, acceptedTerms: true, propertyId: "LK-0009" }).success,
    ).toBe(false);
  });

  it("writes metadata the webhook reads back", () => {
    const metadata = checkoutMetadata({
      propertyId,
      ownerId,
      plan: "serenite",
      kind: "upgrade",
      earlyStart: true,
      acceptedAt: new Date("2026-11-03T10:00:00Z"),
      cguVersion: "2026-06-28",
      cgvVersion: "2026-10-17",
      env: "staging",
    });
    expect(metadata).toEqual({
      property_id: propertyId,
      owner_id: ownerId,
      plan: "serenite",
      kind: "upgrade",
      early_start: "1",
      accepted_at: "2026-11-03T10:00:00.000Z",
      cgu_version: "2026-06-28",
      cgv_version: "2026-10-17",
      env: "staging",
    });
    expect(checkoutMetadataSchema.parse(metadata)).toEqual(metadata);
    // Stripe metadata: strings of 500 characters at most.
    for (const value of Object.values(metadata)) expect(value.length).toBeLessThanOrEqual(500);
    expect(checkoutMetadataSchema.safeParse({ ...metadata, kind: "gift" }).success).toBe(false);
    expect(checkoutMetadataSchema.safeParse({}).success).toBe(false);
  });

  it("reads back only a session id", () => {
    expect(sessionIdSchema.safeParse("cs_test_a1B2c3").success).toBe(true);
    expect(sessionIdSchema.safeParse("cs_mock_abc").success).toBe(true);
    expect(sessionIdSchema.safeParse("pi_123").success).toBe(false);
    expect(sessionIdSchema.safeParse("cs_x'; drop").success).toBe(false);
  });
});

describe("first contact of the advisor", () => {
  it("at once with an immediate start, else after the 14 days of withdrawal", () => {
    const paid = new Date("2026-11-03T10:00:00Z");
    expect(firstContactFrom(paid, true)).toBeNull();
    // The 14 days start the day after the order and end on the 17th, at night.
    expect(withdrawalEnds(paid)).toBe("2026-11-17");
    expect(firstContactFrom(paid, false)?.toISOString()).toBe("2026-11-18T11:00:00.000Z");
  });

  it("counts the days of Paris, not of UTC", () => {
    // 00:30 in Paris on 4 November.
    expect(withdrawalEnds(new Date("2026-11-03T23:30:00Z"))).toBe("2026-11-18");
    // 23:30 in Paris on 28 March 2027, summer time.
    expect(withdrawalEnds(new Date("2027-03-28T21:30:00Z"))).toBe("2027-04-12");
  });

  it("carries a period ending on a Saturday, a Sunday or a public holiday to the next working day", () => {
    // 21 November 2026 is a Saturday.
    expect(withdrawalEnds(new Date("2026-11-07T10:00:00Z"))).toBe("2026-11-23");
    // Christmas on a Friday, then the weekend.
    expect(withdrawalEnds(new Date("2026-12-11T10:00:00Z"))).toBe("2026-12-28");
    // 11 November.
    expect(withdrawalEnds(new Date("2026-10-28T10:00:00Z"))).toBe("2026-11-12");
    // Easter Monday 2027 (29 March), Ascension (6 May), Whit Monday (17 May).
    expect(withdrawalEnds(new Date("2027-03-15T10:00:00Z"))).toBe("2027-03-30");
    expect(withdrawalEnds(new Date("2027-04-22T10:00:00Z"))).toBe("2027-05-07");
    expect(withdrawalEnds(new Date("2027-05-03T10:00:00Z"))).toBe("2027-05-18");
    // Easter Monday 2026 (6 April).
    expect(withdrawalEnds(new Date("2026-03-23T10:00:00Z"))).toBe("2026-04-07");
  });
});

describe("ordering in production", () => {
  it("opens in local and preprod, stays closed in production without the final CGV and mediator", () => {
    expect(paidPlansOrderable("local")).toBe(true);
    expect(paidPlansOrderable("staging")).toBe(true);
    expect(paidPlansOrderable("production")).toBe(false);
  });
});

describe("notifications of a plan", () => {
  const view = (type: string, data: Record<string, unknown>) =>
    describeNotification({
      id: "n",
      type,
      data,
      link: null,
      title: null,
      body: null,
      readAt: null,
      createdAt: "2026-11-03T10:00:00Z",
    });

  it("says the plan to the seller and the case to the team", () => {
    expect(view("plan.activated", { plan_name: "Accompagné", reference: "LK-0009" })).toMatchObject(
      {
        title: "Formule Accompagné activée",
        detail: "Pour votre bien LK-0009.",
        tone: "success",
      },
    );
    expect(
      view("case.created", { plan_name: "Sérénité", reference: "LK-0009", upgrade: true }).title,
    ).toBe("Passage à Sérénité");
    expect(view("case.created", { plan_name: "Accompagné" }).title).toBe(
      "Nouvelle formule Accompagné",
    );
    expect(view("case.created", { plan_name: "Accompagné", check: true, held: true }).title).toBe(
      "Paiement à vérifier",
    );
    expect(view("case.created", { plan_name: "Accompagné", check: true }).title).toBe(
      "Formule à vérifier",
    );
    expect(view("plan.refunded", { full: true, check: true }).title).toBe(
      "Remboursement à vérifier",
    );
    const refunded = view("plan.refunded", {
      full: true,
      amount_cents: 51000,
      reference: "LK-0009",
    });
    expect(refunded.title).toBe("Formule remboursée");
    expect(refunded.detail).toMatch(/^510\s€ · LK-0009$/);
  });
});

describe("emails of a plan", () => {
  const seller = {
    firstName: "Bruno",
    planName: "Accompagné",
    property: "LK-0009",
    amount: "990 €",
    orderedOn: "2 novembre 2026",
    endsOn: "2 novembre 2027",
    earlyStart: false,
    features: ["Un conseiller Leenkey dédié", "Relecture et optimisation de votre annonce"],
    cguVersion: "28 juin 2026",
    cgvVersion: "17 octobre 2026",
    withdrawalUntil: "16 novembre 2026",
    mediator: null,
    planUrl: "https://leenkey.fr/vendeur/formule",
    siteUrl: "https://leenkey.fr",
  };

  it("sums up the order on a durable medium (L1-40)", async () => {
    expect(planActivatedSubject("Accompagné", "LK-0009")).toBe(
      "Confirmation de votre souscription Leenkey · Accompagné · LK-0009",
    );
    const text = await render(
      PlanActivatedEmail({ ...seller, contactFrom: "mardi 17 novembre" }),
      EMAIL_PLAIN_TEXT,
    );
    expect(text).toMatch(
      /Votre formule Accompagné, au prix de 990\s€ TTC pour le bien LK-0009, a été souscrite le 2 novembre 2026\./,
    );
    expect(text).toContain("jusqu'au 2 novembre 2027, sans renouvellement automatique");
    expect(text).toContain("Un conseiller Leenkey dédié");
    expect(text).toContain("version du 28 juin 2026");
    expect(text).toContain("https://leenkey.fr/cgv");
    expect(text).toContain("jusqu'au 16 novembre 2026 inclus");
    expect(text).toContain("Formulaire de rétractation");
    expect(text).toContain("36 rue Pierre Brossolette, 91360 Épinay-sur-Orge");
    expect(text).toContain("Formule souscrite : Accompagné");
    expect(text).toContain("Médiateur de la consommation : en cours de désignation.");
    expect(text).not.toContain("montant proportionnel");
    const early = await render(
      PlanActivatedEmail({ ...seller, contactFrom: null, earlyStart: true }),
      EMAIL_PLAIN_TEXT,
    );
    expect(early).toContain("montant proportionnel aux prestations déjà fournies");
  });

  it("tells the seller what was paid and when the advisor gets in touch", async () => {
    const later = await render(
      PlanActivatedEmail({ ...seller, contactFrom: "mardi 17 novembre" }),
      EMAIL_PLAIN_TEXT,
    );
    expect(later).toContain("Bonjour Bruno,");
    expect(later).toContain("990 € TTC");
    expect(later).toContain("à partir du mardi 17 novembre");
    const now = await render(
      PlanActivatedEmail({ ...seller, contactFrom: null }),
      EMAIL_PLAIN_TEXT,
    );
    expect(now).toContain("sous 24 h");
    for (const text of [later, now]) {
      expect(text).not.toMatch(/\bon\b/i);
      expect(text).not.toMatch(/au succès/i);
    }
  });

  it("tells the team, with the start asked", async () => {
    expect(planPurchasedSubject("Sérénité", "LK-0009", true)).toBe("Passage à Sérénité · LK-0009");
    expect(planPurchasedSubject("Accompagné", "LK-0009", false)).toBe(
      "Formule Accompagné souscrite · LK-0009",
    );
    const text = await render(
      PlanPurchasedEmail({
        planName: "Accompagné",
        upgrade: false,
        property: "LK-0009",
        seller: "Bruno Lefèvre",
        amount: "990 €",
        earlyStart: false,
        casesUrl: "https://leenkey.fr/admin/dossiers",
        siteUrl: "https://leenkey.fr",
      }),
      EMAIL_PLAIN_TEXT,
    );
    expect(text).toContain("Bruno Lefèvre · 990 € TTC payés.");
    expect(text).toContain("15e\u00A0jour");
    expect(text).not.toContain("À vérifier");
  });

  it("tells the team a payment is held, with what to check", async () => {
    expect(planPurchasedSubject("Sérénité", "LK-0009", true, true)).toBe(
      "Paiement de la formule Sérénité à vérifier · LK-0009",
    );
    const text = await render(
      PlanPurchasedEmail({
        planName: "Sérénité",
        upgrade: true,
        property: "LK-0009",
        seller: "Bruno Lefèvre",
        amount: formatAmount(51000),
        earlyStart: true,
        held: true,
        check: [
          "passage payé sans la formule inférieure en vigueur",
          "paiement gardé, formule non activée",
        ],
        casesUrl: "https://leenkey.fr/admin/dossiers",
        siteUrl: "https://leenkey.fr",
      }),
      EMAIL_PLAIN_TEXT,
    );
    expect(text).toContain("Paiement à vérifier");
    expect(text).toContain("elle n'est pas activée");
    expect(text).toContain("· passage payé sans la formule inférieure en vigueur");
    expect(text).toContain("· paiement gardé, formule non activée");
    expect(text).not.toContain("premier contact");
    expect(text).not.toMatch(/\bon\b/i);
  });

  it("keeps the cents of an amount paid with a promotion code", () => {
    expect(formatAmount(99000)).toMatch(/^990\s€$/);
    expect(formatAmount(89150)).toMatch(/^891,50\s€$/);
    expect(formatAmount(150000)).toMatch(/^1\s500\s€$/);
  });
});
