import { beforeEach, describe, expect, it, vi } from "vitest";

// L2-09: what a page reads of its upgrade prompt (leenkey/billing/
// upgrade-queries.ts): the words of the SPEC with the prices of the offer,
// the link to the plan aimed at, « Passer à Sérénité : +510 € » under a paid
// plan; and never a prompt when anything cannot be read or a paid plan
// cannot be ordered. The choice itself: upgrade-prompts.test.ts.

const PROPERTY = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const OFFER = "1b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f8";

const mocks = vi.hoisted(() => ({
  orderable: true,
  plan: "autonomie" as string,
  failing: null as string | null,
  offers: [] as unknown[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/config/sales", () => ({ paidPlansOrderable: () => mocks.orderable }));
vi.mock("@/core/billing/plans", () => ({
  allPlans: async () => [
    { code: "autonomie", name: "Autonomie", priceCents: 0, active: true },
    { code: "accompagne", name: "Accompagné", priceCents: 99_000, active: true },
    { code: "serenite", name: "Sérénité", priceCents: 150_000, active: true },
  ],
}));
vi.mock("@/leenkey/offers/seller", () => ({
  propertyOffers: async () => ({ ok: true, data: mocks.offers }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const result = (table: string, data: unknown, count?: number) =>
      mocks.failing === table
        ? { data: null, error: { code: "XX000" }, count: null }
        : { data, error: null, count: count ?? null };
    const query = (table: string) => {
      const rows: Record<string, unknown> = {
        listings: { status: "published", published_at: "2026-10-01T10:00:00Z" },
        sale_progress: { current_step_code: "offers" },
        conversations: null,
        upgrade_prompts: [],
      };
      const chain = {
        select: () => chain,
        eq: () => chain,
        // L3-09: the visits that took place, the documents of the sale file.
        in: () => chain,
        lt: () => chain,
        is: () => chain,
        not: () => Promise.resolve(result(table, rows[table])),
        maybeSingle: () => Promise.resolve(result(table, rows[table])),
        then: (resolve: (value: unknown) => void) => resolve(result(table, null, 1)),
      };
      return chain;
    };
    return {
      from: query,
      rpc: async () => result("plan", mocks.plan),
    };
  },
}));

function sellerOffer(status: string, priceCents = 15_000_000, askingPriceCents = 15_900_000) {
  return {
    offer: { id: OFFER, status, priceCents, validityUntil: "2099-01-01T00:00:00Z" },
    property: { askingPriceCents },
  };
}

beforeEach(() => {
  mocks.orderable = true;
  mocks.plan = "autonomie";
  mocks.failing = null;
  mocks.offers = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("propertyUpgradePrompt", () => {
  it("the offer received, its two prices, the link to Accompagné", async () => {
    mocks.offers = [sellerOffer("submitted")];
    const { propertyUpgradePrompt } = await import("@/leenkey/billing/upgrade-queries");
    const prompt = await propertyUpgradePrompt(PROPERTY, { kind: "dashboard" });
    expect(prompt).toMatchObject({
      trigger: "offer_received",
      subjectId: OFFER,
      title: "Être accompagné sur cette offre",
      action: {
        label: "Voir l'accompagnement",
        href: `/vendeur/formule?bien=${PROPERTY}&formule=accompagne`,
      },
    });
    expect(prompt?.text.replace(/[\u00A0\u202F]/g, " ")).toMatch(
      /^Vous avez reçu une offre de 150 000 € pour un prix affiché de 159 000 €\./,
    );
  });

  it("under Accompagné, the offer accepted: what Sérénité costs on top", async () => {
    mocks.plan = "accompagne";
    mocks.offers = [sellerOffer("accepted")];
    const { propertyUpgradePrompt } = await import("@/leenkey/billing/upgrade-queries");
    const prompt = await propertyUpgradePrompt(PROPERTY, { kind: "offer", offerId: OFFER });
    expect(prompt?.trigger).toBe("offer_accepted");
    expect(prompt?.action.label.replace(/[\u00A0\u202F]/g, " ")).toBe("Passer à Sérénité : +510 €");
    expect(prompt?.action.href).toBe(`/vendeur/formule?bien=${PROPERTY}&formule=serenite`);
  });

  it("no sentence without both prices of the offer", async () => {
    mocks.offers = [sellerOffer("submitted", 15_000_000, 0)];
    const { propertyUpgradePrompt } = await import("@/leenkey/billing/upgrade-queries");
    expect(await propertyUpgradePrompt(PROPERTY, { kind: "offer", offerId: OFFER })).toBeNull();
  });

  it("nothing when a read fails, or while a paid plan cannot be ordered", async () => {
    const { propertyUpgradePrompt } = await import("@/leenkey/billing/upgrade-queries");
    mocks.offers = [sellerOffer("submitted")];
    mocks.failing = "upgrade_prompts";
    expect(await propertyUpgradePrompt(PROPERTY, { kind: "dashboard" })).toBeNull();
    mocks.failing = null;
    mocks.orderable = false;
    expect(await propertyUpgradePrompt(PROPERTY, { kind: "dashboard" })).toBeNull();
  });
});
