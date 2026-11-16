import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  chooseUpgradePrompt,
  UPGRADE_TARGET,
  UPGRADE_TRIGGERS,
  type UpgradeFacts,
  type UpgradeOffer,
} from "@/leenkey/billing/upgrade-prompts";
import { UPGRADE_THRESHOLDS } from "@/lib/config/upgrade";
import { frUpgrade } from "@/lib/i18n/sections/upgrade";
import { upgradePromptEventSchema } from "@/lib/validations/billing";

// L2-09: the upgrade prompts (SPEC-V2 section 11 bis). At most one, the
// first of the list whose condition holds, never hidden, above the plan in
// force and on sale; never under Sérénité, never while a paid plan cannot be
// ordered. Nothing here blocks an action: a prompt is chosen, never required.
// The SQL is tested in supabase/tests/rls_upgrade_prompts.sql, the pages in
// tests/e2e/upgrade-prompts-live.spec.ts.

const mocks = vi.hoisted(() => ({
  profile: { id: "seller" } as { id: string } | null,
  rpc: [] as { name: string; args: Record<string, unknown> }[],
  error: null as { code: string } | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => mocks.profile }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      mocks.rpc.push({ name, args });
      return { data: null, error: mocks.error };
    },
  }),
}));

const NOW = new Date("2026-11-16T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const PROPERTY = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const OFFER = "1b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f8";

const PLANS = [
  { code: "autonomie" as const, priceCents: 0, active: true },
  { code: "accompagne" as const, priceCents: 99_000, active: true },
  { code: "serenite" as const, priceCents: 150_000, active: true },
];

function facts(overrides: Partial<UpgradeFacts> = {}): UpgradeFacts {
  return {
    currentPlan: "autonomie",
    plans: PLANS,
    orderable: true,
    listingStatus: "published",
    publishedAt: daysAgo(20),
    contacts: 1,
    visits: null,
    missingDocuments: null,
    offers: [],
    fromValuation: false,
    stepCode: "contacts_visits",
    dismissed: [],
    ...overrides,
  };
}

function offer(overrides: Partial<UpgradeOffer> = {}): UpgradeOffer {
  return {
    id: OFFER,
    status: "submitted",
    priceCents: 33_800_000,
    askingPriceCents: 35_000_000,
    validityUntil: "2026-11-20T12:00:00Z",
    ...overrides,
  };
}

const dashboard = { kind: "dashboard" } as const;

describe("the codes and their plans", () => {
  it("are the eight of the SPEC, each with the plan it proposes", () => {
    expect(UPGRADE_TRIGGERS).toEqual([
      "offer_accepted",
      "offer_received",
      "visits_no_offer",
      "contacts_no_visit",
      "low_contacts",
      "file_incomplete",
      "listing_ready",
      "valuation_done",
    ]);
    expect(UPGRADE_TARGET.offer_accepted).toBe("serenite");
    expect(UPGRADE_TARGET.file_incomplete).toBe("serenite");
    expect(UPGRADE_TARGET.offer_received).toBe("accompagne");
  });

  it("keep the thresholds of Q2, outside the code", () => {
    expect(UPGRADE_THRESHOLDS).toEqual({
      lowContacts: { below: 3, days: 14 },
      contactsNoVisit: { contacts: 5, days: 21 },
      visitsNoOffer: { visits: 3 },
      fileIncomplete: { missing: 3, days: 30 },
    });
  });
});

describe("chooseUpgradePrompt", () => {
  it("low_contacts: fewer than 3 contacts after 14 days online", () => {
    expect(chooseUpgradePrompt(facts(), dashboard, NOW)).toMatchObject({
      trigger: "low_contacts",
      subjectId: null,
      targetPlan: "accompagne",
      upgradeCents: null,
    });
    expect(chooseUpgradePrompt(facts({ contacts: 3 }), dashboard, NOW)).toBeNull();
    expect(chooseUpgradePrompt(facts({ publishedAt: daysAgo(13) }), dashboard, NOW)).toBeNull();
    // Paused, or not online: no listing to judge.
    expect(chooseUpgradePrompt(facts({ listingStatus: "paused" }), dashboard, NOW)).toBeNull();
  });

  it("contacts_no_visit waits for the visits to be counted (lot 3)", () => {
    const many = facts({ contacts: 6, publishedAt: daysAgo(25) });
    expect(chooseUpgradePrompt(many, dashboard, NOW)).toBeNull();
    expect(chooseUpgradePrompt({ ...many, visits: 0 }, dashboard, NOW)).toMatchObject({
      trigger: "contacts_no_visit",
    });
    expect(chooseUpgradePrompt({ ...many, visits: 1 }, dashboard, NOW)).toBeNull();
  });

  it("an offer received comes first, one prompt per offer", () => {
    const received = facts({ offers: [offer()] });
    expect(chooseUpgradePrompt(received, dashboard, NOW)).toMatchObject({
      trigger: "offer_received",
      subjectId: OFFER,
      offer: { priceCents: 33_800_000, askingPriceCents: 35_000_000 },
    });
    // Hidden for this offer: not low_contacts either, the listing brought an offer.
    const hidden = { ...received, dismissed: [{ trigger: "offer_received", subjectId: OFFER }] };
    expect(chooseUpgradePrompt(hidden, dashboard, NOW)).toBeNull();
    // A new offer: its own prompt.
    const next = { ...hidden, offers: [offer({ id: "other" }), offer()] };
    expect(chooseUpgradePrompt(next, dashboard, NOW)).toMatchObject({ subjectId: "other" });
  });

  it("an offer past its validity no longer waits, even before the cron", () => {
    const late = facts({ offers: [offer({ validityUntil: "2026-11-16T11:00:00Z" })] });
    expect(chooseUpgradePrompt(late, dashboard, NOW)).toBeNull();
  });

  it("offer_accepted proposes Sérénité, with what the passage costs from Accompagné", () => {
    const accepted = facts({ offers: [offer({ status: "accepted" })] });
    expect(chooseUpgradePrompt(accepted, dashboard, NOW)).toMatchObject({
      trigger: "offer_accepted",
      targetPlan: "serenite",
      upgradeCents: null,
    });
    expect(
      chooseUpgradePrompt({ ...accepted, currentPlan: "accompagne" }, dashboard, NOW),
    ).toMatchObject({ trigger: "offer_accepted", upgradeCents: 51_000 });
  });

  it("never above the plan in force: nothing under Sérénité, nothing for Accompagné to Accompagné", () => {
    const received = facts({ offers: [offer()] });
    expect(chooseUpgradePrompt({ ...received, currentPlan: "accompagne" }, dashboard, NOW)).toBe(
      null,
    );
    const accepted = facts({ offers: [offer({ status: "accepted" })], currentPlan: "serenite" });
    expect(chooseUpgradePrompt(accepted, dashboard, NOW)).toBeNull();
    expect(chooseUpgradePrompt(facts({ currentPlan: "serenite" }), dashboard, NOW)).toBeNull();
  });

  it("never a plan withdrawn from sale, never while a paid plan cannot be ordered", () => {
    const withdrawn = PLANS.map((plan) =>
      plan.code === "accompagne" ? { ...plan, active: false } : plan,
    );
    expect(chooseUpgradePrompt(facts({ plans: withdrawn }), dashboard, NOW)).toBeNull();
    expect(chooseUpgradePrompt(facts({ orderable: false }), dashboard, NOW)).toBeNull();
  });

  it("a prompt hidden never comes back on its property", () => {
    const hidden = facts({ dismissed: [{ trigger: "low_contacts", subjectId: null }] });
    expect(chooseUpgradePrompt(hidden, dashboard, NOW)).toBeNull();
  });

  it("each page its prompts: the preview, the price step, the page of one offer", () => {
    expect(chooseUpgradePrompt(facts(), { kind: "submit" }, NOW)).toMatchObject({
      trigger: "listing_ready",
    });
    const valuation = facts({ listingStatus: null, publishedAt: null, stepCode: "prepare" });
    expect(
      chooseUpgradePrompt(valuation, { kind: "price", fromValuation: true }, NOW),
    ).toMatchObject({ trigger: "valuation_done" });
    expect(chooseUpgradePrompt(valuation, { kind: "price", fromValuation: false }, NOW)).toBe(null);
    // Past step 01: the price is already set.
    expect(
      chooseUpgradePrompt(
        { ...valuation, stepCode: "publish" },
        { kind: "price", fromValuation: true },
        NOW,
      ),
    ).toBeNull();
    // The page of an offer: the prompt of this offer only.
    const two = facts({ offers: [offer({ id: "other" }), offer()] });
    expect(chooseUpgradePrompt(two, { kind: "offer", offerId: OFFER }, NOW)).toMatchObject({
      subjectId: OFFER,
    });
    // The dashboard never shows the prompts of the preview and of the price step.
    expect(
      chooseUpgradePrompt(
        facts({ contacts: 5, stepCode: "prepare", fromValuation: true }),
        dashboard,
        NOW,
      ),
    ).toBeNull();
  });

  it("chooses a prompt and nothing else: no action of the page depends on it", () => {
    // The chooser returns data only; an unknown plan in force reads no prompt.
    expect(
      chooseUpgradePrompt(facts({ currentPlan: "autonomie", plans: [] }), dashboard, NOW),
    ).toBe(null);
  });
});

describe("the texts", () => {
  it("are the sentences of the SPEC, in the voice of Leenkey", () => {
    expect(frUpgrade.prompts.offer_received.text("338 000 €", "350 000 €")).toBe(
      "Vous avez reçu une offre de 338 000 € pour un prix affiché de 350 000 €. Vous pouvez la traiter vous-même ou demander à un conseiller Leenkey de l'analyser avec vous et de vous accompagner dans votre négociation.",
    );
    expect(frUpgrade.prompts.low_contacts.text).toBe(
      "Votre annonce génère peu de demandes. Faites le point sur votre prix et votre stratégie avec un conseiller Leenkey.",
    );
    expect(frUpgrade.passTo("Sérénité", "510\u202F€")).toBe("Passer à Sérénité\u00A0: +510\u202F€");
    const all = JSON.stringify(frUpgrade);
    expect(all).not.toMatch(/\bon\b|estimation|Prix ferme|validé/i);
  });
});

describe("recordUpgradePrompt", () => {
  beforeEach(() => {
    mocks.profile = { id: "seller" };
    mocks.rpc = [];
    mocks.error = null;
  });

  it("sends no plan: the database sets the one of the code, whatever the browser says", async () => {
    const { recordUpgradePrompt } = await import("@/leenkey/billing/upgrade-actions");
    expect(
      await recordUpgradePrompt({
        propertyId: PROPERTY,
        trigger: "offer_accepted",
        subjectId: OFFER,
        event: "dismissed",
        targetPlan: "autonomie",
      }),
    ).toEqual({ ok: true, data: null });
    expect(mocks.rpc).toEqual([
      {
        name: "upgrade_prompt_record",
        args: {
          p_property: PROPERTY,
          p_trigger: "offer_accepted",
          p_subject: OFFER,
          p_event: "dismissed",
        },
      },
    ]);
  });

  it("refuses without a session, a code or an event that is not one", async () => {
    const { recordUpgradePrompt } = await import("@/leenkey/billing/upgrade-actions");
    expect(
      await recordUpgradePrompt({
        propertyId: PROPERTY,
        trigger: "buy_now",
        subjectId: null,
        event: "shown",
      }),
    ).toEqual({ ok: false, error: "invalid" });
    mocks.profile = null;
    expect(
      await recordUpgradePrompt({
        propertyId: PROPERTY,
        trigger: "low_contacts",
        subjectId: null,
        event: "shown",
      }),
    ).toEqual({ ok: false, error: "auth" });
    expect(mocks.rpc).toEqual([]);
  });

  it("says a refusal of the database without throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { recordUpgradePrompt } = await import("@/leenkey/billing/upgrade-actions");
    mocks.error = { code: "42501" };
    expect(
      await recordUpgradePrompt({
        propertyId: PROPERTY,
        trigger: "low_contacts",
        subjectId: null,
        event: "clicked",
      }),
    ).toEqual({ ok: false, error: "unavailable" });
  });

  it("takes the events of the page only", () => {
    const base = { propertyId: PROPERTY, trigger: "low_contacts", subjectId: null };
    expect(upgradePromptEventSchema.safeParse({ ...base, event: "shown" }).success).toBe(true);
    expect(upgradePromptEventSchema.safeParse({ ...base, event: "bought" }).success).toBe(false);
    expect(
      upgradePromptEventSchema.safeParse({ ...base, subjectId: "x", event: "shown" }).success,
    ).toBe(false);
  });
});

describe("the boundaries", () => {
  it("low_contacts from the 14th day online, not before", () => {
    expect(chooseUpgradePrompt(facts({ publishedAt: daysAgo(14) }), dashboard, NOW)).toMatchObject({
      trigger: "low_contacts",
    });
    expect(
      chooseUpgradePrompt(
        facts({ publishedAt: new Date(NOW.getTime() - 14 * 86_400_000 + 60_000).toISOString() }),
        dashboard,
        NOW,
      ),
    ).toBeNull();
  });

  it("file_incomplete at step 05 or after it, once the sale file exists (lot 3)", () => {
    const file = { missingDocuments: 1, publishedAt: daysAgo(2) };
    expect(
      chooseUpgradePrompt(facts({ ...file, stepCode: "notary" }), dashboard, NOW),
    ).toMatchObject({ trigger: "file_incomplete", targetPlan: "serenite" });
    expect(
      chooseUpgradePrompt(facts({ ...file, stepCode: "closing" }), dashboard, NOW),
    ).toMatchObject({ trigger: "file_incomplete" });
    expect(chooseUpgradePrompt(facts({ ...file, stepCode: "offers" }), dashboard, NOW)).toBeNull();
  });
});
