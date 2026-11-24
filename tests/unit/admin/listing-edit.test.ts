import { describe, expect, it } from "vitest";
import {
  LISTING_EDIT_STATUSES,
  listingEditable,
  listingEditChanges,
  listingEditInvalidFields,
  listingEditSchema,
} from "@/lib/validations/admin";
import { frAdminListings } from "@/lib/i18n/sections/adminListings";
import { frListingRevisions } from "@/lib/i18n/sections/listingRevisions";

// L1-30e: « Modifier » a listing from the back office (DECISIONS.md
// 2026-11-24): the values the server action sends to listing_admin_edit.

const LISTING = "4f6b6c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

const input = (overrides: Record<string, unknown> = {}) => ({
  listingId: LISTING,
  title: "Maison 5 pièces avec jardin",
  description: "Belle maison familiale.",
  priceEuros: 300000,
  reason: "Prix arrondi au millier.",
  ...overrides,
});

describe("listingEditSchema", () => {
  it("takes a title, a description, a price in euros and a reason, trimmed", () => {
    const parsed = listingEditSchema.parse(
      input({ title: "  Maison relue  ", reason: "  Titre plus précis.  " }),
    );
    expect(parsed).toMatchObject({ title: "Maison relue", reason: "Titre plus précis." });
  });

  it("refuses what listing_admin_edit refuses, field by field", () => {
    expect(listingEditInvalidFields(input())).toEqual([]);
    expect(listingEditInvalidFields(input({ title: "Ma" }))).toEqual(["title"]);
    expect(listingEditInvalidFields(input({ title: "x".repeat(121) }))).toEqual(["title"]);
    expect(listingEditInvalidFields(input({ description: "  " }))).toEqual(["description"]);
    expect(listingEditInvalidFields(input({ description: "x".repeat(1201) }))).toEqual([
      "description",
    ]);
    expect(listingEditInvalidFields(input({ priceEuros: 0 }))).toEqual(["priceEuros"]);
    expect(listingEditInvalidFields(input({ priceEuros: 1500.5 }))).toEqual(["priceEuros"]);
    expect(listingEditInvalidFields(input({ priceEuros: Number.NaN }))).toEqual(["priceEuros"]);
    expect(listingEditInvalidFields(input({ priceEuros: 50_000_001 }))).toEqual(["priceEuros"]);
    expect(listingEditInvalidFields(input({ reason: " a " }))).toEqual(["reason"]);
    expect(listingEditInvalidFields(input({ reason: "x".repeat(1001) }))).toEqual(["reason"]);
    expect(listingEditInvalidFields(input({ listingId: "LK-0042" }))).toEqual([]);
    expect(listingEditSchema.safeParse(input({ listingId: "LK-0042" })).success).toBe(false);
  });

  it("names the fields in the order of the form", () => {
    expect(listingEditInvalidFields(input({ reason: "", title: "", priceEuros: -1 }))).toEqual([
      "title",
      "priceEuros",
      "reason",
    ]);
  });

  it("counts the characters as Postgres does (an emoji is one)", () => {
    expect(listingEditInvalidFields(input({ title: "🏡🏡🏡" }))).toEqual([]);
  });

  it("takes only the fields changed (null or absent: left as it is), at least one", () => {
    const only = { listingId: LISTING, reason: "Prix arrondi au millier." };
    expect(listingEditSchema.safeParse({ ...only, priceEuros: 300000 }).success).toBe(true);
    expect(
      listingEditSchema.safeParse({ ...only, title: null, description: null, priceEuros: 300000 })
        .success,
    ).toBe(true);
    // Nothing sent: refused, without naming a field (the action says « unchanged »).
    expect(listingEditSchema.safeParse(only).success).toBe(false);
    expect(listingEditInvalidFields(only)).toEqual([]);
    expect(
      listingEditSchema.safeParse({ ...only, title: null, description: null, priceEuros: null })
        .success,
    ).toBe(false);
  });
});

describe("listingEditChanges", () => {
  const initial = { title: "Maison", description: "Texte.", priceEuros: 300000 };

  it("keeps only what the team changed, so a newer change of the seller stays", () => {
    expect(listingEditChanges(initial, { ...initial })).toEqual({});
    expect(listingEditChanges(initial, { ...initial, priceEuros: 299000 })).toEqual({
      priceEuros: 299000,
    });
    expect(listingEditChanges(initial, { ...initial, title: "  Maison  " })).toEqual({});
    expect(
      listingEditChanges(initial, { ...initial, title: "Maison 5 pièces", description: "Autre." }),
    ).toEqual({ title: "Maison 5 pièces", description: "Autre." });
  });

  it("a price emptied or not read is sent, and refused", () => {
    const changes = listingEditChanges(initial, { ...initial, priceEuros: Number.NaN });
    expect(Number.isNaN(changes.priceEuros)).toBe(true);
    expect(listingEditInvalidFields({ listingId: LISTING, reason: "Motif", ...changes })).toEqual([
      "priceEuros",
    ]);
  });
});

describe("which listings the team changes", () => {
  it("in review, online, paused or suspended; never a draft, to correct or sold", () => {
    expect([...LISTING_EDIT_STATUSES]).toEqual(["pending", "published", "paused", "suspended"]);
    expect(listingEditable("draft")).toBe(false);
    expect(listingEditable("rejected")).toBe(false);
    expect(listingEditable("sold")).toBe(false);
    expect(listingEditable("suspended")).toBe(true);
  });
});

describe("the words of the change (CLAUDE.md 16)", () => {
  it("in our voice, no « on », no « estimation » alone, no « Prix ferme »", () => {
    const words = JSON.stringify({
      edit: frAdminListings.edit,
      reason: frListingRevisions.reason("x"),
      pending: frListingRevisions.pendingIntro,
    });
    expect(words).not.toMatch(/\bon\b|estimation|prix ferme/i);
    expect(frAdminListings.history.actions["listing.admin_edit"]).toBe("Modifiée par l'équipe");
  });
});
