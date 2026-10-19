import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SellerProperty } from "@/leenkey/properties/queries";
import {
  creationHref,
  pricePerM2Cents,
  propertyName,
  sellerFacts,
  sheetFigures,
  sheetHref,
  sheetTabs,
  statusActions,
} from "@/leenkey/properties/sheet";

// L1-14: the page of a property (SPEC-V2 8.3), its tabs, its key figures and
// the actions of its status. The SQL functions are tested in supabase/tests,
// the server actions below with a script of answers.

const id = "623efc8b-97d4-4902-ac43-406417498893";

const characteristics: SellerProperty["characteristics"] = {
  type: "appartement",
  surfaceM2: 68,
  carrezM2: 66.5,
  rooms: 3,
  bedrooms: 2,
  floor: 3,
  floorsTotal: 5,
  buildYear: 1975,
  isNewBuild: false,
  dpe: "C",
  ges: "D",
  heating: "Individuel gaz",
  features: ["balcony", "elevator", "cellar"],
  chargesMonthlyEuros: 180,
  propertyTaxYearlyEuros: 1150,
  coproLots: 40,
};

const listing: NonNullable<SellerProperty["listing"]> = {
  id: "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27",
  reference: "LK-0042",
  slug: "appartement-3-pieces-epinay-sur-orge-lk-0042",
  title: "Appartement 3 pièces lumineux",
  description: "Au calme, proche de la gare.",
  priceCents: 23_900_000,
  status: "published",
  rejectionReason: null,
  suspensionReason: null,
  publishedAt: "2026-10-12T09:00:00Z",
  soldAt: null,
  soldPriceCents: null,
};

const plain = (text: string) => text.replace(/[\u00A0\u202F]/g, " ");

describe("tabs of the page of a property", () => {
  it("Infos is the page itself, Photos and Annonce under it", () => {
    expect(sheetHref(id)).toBe(`/vendeur/biens/${id}`);
    expect(sheetHref(id, "photos")).toBe(`/vendeur/biens/${id}/photos`);
    expect(sheetTabs(id)).toEqual([
      { href: `/vendeur/biens/${id}`, label: "Infos" },
      { href: `/vendeur/biens/${id}/photos`, label: "Photos" },
      { href: `/vendeur/biens/${id}/annonce`, label: "Annonce" },
    ]);
  });
});

describe("actions of the status (SPEC-V2 8.3)", () => {
  it("by status, as the SQL functions allow them", () => {
    expect(statusActions(null)).toEqual(["resume", "delete"]);
    expect(statusActions("draft")).toEqual(["resume", "delete"]);
    expect(statusActions("rejected")).toEqual(["fix"]);
    expect(statusActions("published")).toEqual(["view", "pause", "sold"]);
    expect(statusActions("paused")).toEqual(["publish", "sold"]);
  });

  it("nothing while Leenkey reviews it, once suspended, once sold", () => {
    expect(statusActions("pending")).toEqual([]);
    expect(statusActions("suspended")).toEqual([]);
    expect(statusActions("sold")).toEqual([]);
  });

  it("the creation resumes at the step after the last one filled", () => {
    expect(creationHref({ id, characteristics, listing: null })).toBe(`/vendeur/biens/${id}/prix`);
    expect(creationHref({ id, characteristics, listing })).toBe(`/vendeur/biens/${id}/apercu`);
    expect(
      creationHref({ id, characteristics: { ...characteristics, surfaceM2: null }, listing }),
    ).toBe(`/vendeur/biens/${id}/caracteristiques`);
  });
});

describe("top of the page", () => {
  it("names a property by its listing, else by its summary", () => {
    expect(propertyName({ characteristics, listing })).toBe("Appartement 3 pièces lumineux");
    expect(plain(propertyName({ characteristics, listing: null }))).toBe(
      "Appartement 3 pièces · 68 m²",
    );
    expect(
      propertyName({ characteristics: { ...characteristics, type: null }, listing: null }),
    ).toBe("Bien à compléter");
  });

  it("surface, rooms, floor and price per m² of a flat", () => {
    const figures = sheetFigures({ characteristics, listing });
    expect(figures.map((figure) => [plain(figure.value), figure.label])).toEqual([
      ["68 m²", "surface"],
      ["3", "pièces"],
      ["3e", "étage"],
      ["3 515 €", "prix au m²"],
    ]);
  });

  it("levels of a house, the surface alone of a plot, nothing of a draft just started", () => {
    const house = sheetFigures({
      characteristics: { ...characteristics, type: "maison", floorsTotal: 2 },
      listing: null,
    });
    expect(house.map((figure) => figure.label)).toEqual(["surface", "pièces", "niveaux"]);
    const plot = sheetFigures({
      characteristics: { ...characteristics, type: "terrain", rooms: null },
      listing: null,
    });
    expect(plot.map((figure) => figure.label)).toEqual(["terrain"]);
    expect(
      sheetFigures({
        characteristics: {
          ...characteristics,
          type: null,
          surfaceM2: null,
          rooms: null,
          floor: null,
        },
        listing: null,
      }),
    ).toEqual([]);
  });

  it("price per m² in whole euros, none without a surface", () => {
    expect(pricePerM2Cents(23_900_000, 68)).toBe(351_500);
    expect(pricePerM2Cents(23_900_000, null)).toBeNull();
    expect(pricePerM2Cents(23_900_000, 0)).toBeNull();
  });
});

describe("tab Infos", () => {
  it("the table of the public page, without the rows of the documents (L3)", () => {
    const facts = sellerFacts({ characteristics, orientation: "Sud-ouest" });
    expect(facts).not.toBeNull();
    const labels = facts!.map((fact) => fact.label);
    expect(labels).toContain("Charges de copropriété");
    expect(labels).not.toContain("Travaux votés");
    expect(labels).not.toContain("Procédures en cours");
    const value = (label: string) => facts!.find((fact) => fact.label === label)?.value;
    expect(value("Chauffage")).toBe("Individuel gaz");
    expect(value("Ascenseur")).toBe("Oui");
    expect(value("Extérieur")).toBe("Balcon");
    expect(value("Exposition")).toBe("Sud-ouest");
  });

  it("nothing while the type, the surface or the rooms are missing", () => {
    expect(
      sellerFacts({ characteristics: { ...characteristics, rooms: null }, orientation: null }),
    ).toBeNull();
  });
});

// The server actions, with a script of answers for the RPC.
const mocks = vi.hoisted(() => ({
  profile: { id: "a11ce000-0000-4000-8000-000000000001" } as { id: string } | null,
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => mocks.profile }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));

describe("server actions of the status (status-actions.ts)", () => {
  const listingId = listing.id;
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.profile = { id: "a11ce000-0000-4000-8000-000000000001" };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("pause and back online through listing_pause and listing_resume", async () => {
    const { pauseListing, republishListing } = await import("@/leenkey/properties/status-actions");
    mocks.rpc.mockResolvedValueOnce({ data: "paused", error: null });
    expect(await pauseListing({ listingId })).toEqual({ ok: true, data: { status: "paused" } });
    expect(mocks.rpc).toHaveBeenLastCalledWith("listing_pause", { p_listing_id: listingId });
    mocks.rpc.mockResolvedValueOnce({ data: "published", error: null });
    expect(await republishListing({ listingId })).toEqual({
      ok: true,
      data: { status: "published" },
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith("listing_resume", { p_listing_id: listingId });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/vendeur", "layout");
  });

  it("sold with the final price in cents, or without it", async () => {
    const { markListingSold } = await import("@/leenkey/properties/status-actions");
    mocks.rpc.mockResolvedValue({ data: "sold", error: null });
    await markListingSold({ listingId, soldPriceEuros: 231_000 });
    expect(mocks.rpc).toHaveBeenLastCalledWith("listing_mark_sold", {
      p_listing_id: listingId,
      p_sold_price_cents: 23_100_000,
    });
    await markListingSold({ listingId, soldPriceEuros: null });
    expect(mocks.rpc).toHaveBeenLastCalledWith("listing_mark_sold", { p_listing_id: listingId });
    expect(await markListingSold({ listingId, soldPriceEuros: 12.5 })).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("says why the SQL function refused", async () => {
    const { pauseListing, deleteDraft } = await import("@/leenkey/properties/status-actions");
    const refuse = (code: string, message: string) =>
      mocks.rpc.mockResolvedValueOnce({ data: null, error: { code, message } });
    refuse("42501", "listing suspended by Leenkey");
    expect(await pauseListing({ listingId })).toEqual({ ok: false, error: "suspended" });
    refuse("42501", "listing not found");
    expect(await pauseListing({ listingId })).toEqual({ ok: false, error: "not_found" });
    refuse("22023", "cannot pause a listing in status paused");
    expect(await pauseListing({ listingId })).toEqual({ ok: false, error: "conflict" });
    refuse("22023", "only a draft can be deleted");
    expect(await deleteDraft({ propertyId: id })).toEqual({ ok: false, error: "conflict" });
    refuse("08006", "connection failure");
    expect(await pauseListing({ listingId })).toEqual({ ok: false, error: "unavailable" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("asks for a session and a listing of the right form, before any call", async () => {
    const { pauseListing, deleteDraft } = await import("@/leenkey/properties/status-actions");
    expect(await pauseListing({ listingId: "LK-0042" })).toEqual({ ok: false, error: "invalid" });
    mocks.profile = null;
    expect(await pauseListing({ listingId })).toEqual({ ok: false, error: "auth" });
    expect(await deleteDraft({ propertyId: id })).toEqual({ ok: false, error: "auth" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("deletes a draft through property_soft_delete", async () => {
    const { deleteDraft } = await import("@/leenkey/properties/status-actions");
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await deleteDraft({ propertyId: id })).toEqual({ ok: true, data: null });
    expect(mocks.rpc).toHaveBeenCalledWith("property_soft_delete", { p_property_id: id });
  });
});
