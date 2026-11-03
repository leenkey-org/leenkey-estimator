import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { PlanActivatedEmail, planActivatedSubject } from "@/emails/plan-activated";
import { PlanPurchasedEmail, planPurchasedSubject } from "@/emails/plan-purchased";
import {
  checkoutMetadata,
  firstContactFrom,
  planChoice,
  priceIdFor,
  priceMatches,
} from "@/leenkey/billing/orders";
import { describeNotification } from "@/leenkey/notifications/catalog";
import { paidPlansOrderable } from "@/lib/config/sales";
import { checkoutMetadataSchema, checkoutSchema, sessionIdSchema } from "@/lib/validations/billing";

// L1-26: what a seller may order, the Stripe prices, the metadata read back
// by the webhook, the texts. The SQL is tested in
// supabase/tests/rls_stripe_checkout.sql, the screens in
// tests/e2e/billing.spec.ts.

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
    const order = { propertyId, plan: "accompagne", earlyStart: false };
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
    expect(firstContactFrom(paid, false)?.toISOString()).toBe("2026-11-17T10:00:00.000Z");
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
    planUrl: "https://leenkey.fr/vendeur/formule",
    siteUrl: "https://leenkey.fr",
  };

  it("tells the seller what was paid and when the advisor gets in touch", async () => {
    expect(planActivatedSubject("Accompagné")).toBe("Votre formule Accompagné est activée");
    const later = await render(
      PlanActivatedEmail({ ...seller, contactFrom: "mardi 17 novembre" }),
      EMAIL_PLAIN_TEXT,
    );
    expect(later).toContain("Bonjour Bruno,");
    expect(later).toContain("votre formule Accompagné est active pour votre bien LK-0009");
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
    expect(text).toContain("15e jour");
  });
});
