import { beforeEach, describe, expect, it, vi } from "vitest";
import { editableOnceSent } from "@/leenkey/properties/creation";
import { editHref, photosEditable, savedHref } from "@/leenkey/properties/sheet";
import type { Characteristics } from "@/lib/validations/property";
import type { Database } from "@/types/database";

// L1-14b: a listing sent for review, online or paused changes from the page
// of its property and stays as it is (SPEC-V2 8.3); not its address, nothing
// once suspended or sold. The Supabase client is a script of answers: the
// RLS and the triggers are tested in supabase/tests/rls_listing_edits.sql.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

const id = "623efc8b-97d4-4902-ac43-406417498893";
const at = (listingStatus: ListingStatus | null) => ({ id, listingStatus });

describe("what changes once the listing is sent", () => {
  it("in review, online or paused; never once suspended or sold", () => {
    for (const status of ["pending", "published", "paused"] as const) {
      expect(editableOnceSent(status), status).toBe(true);
    }
    for (const status of [null, "draft", "rejected", "suspended", "sold"] as const) {
      expect(editableOnceSent(status), String(status)).toBe(false);
    }
  });

  it("the steps of the creation for a draft, the pages of change once sent, never the address", () => {
    expect(editHref(at("draft"), "address")).toBe(`/vendeur/biens/${id}/adresse`);
    expect(editHref(at(null), "characteristics")).toBe(`/vendeur/biens/${id}/caracteristiques`);
    expect(editHref(at("rejected"), "listing")).toBe(`/vendeur/biens/${id}/prix`);
    for (const status of ["pending", "published", "paused"] as const) {
      expect(editHref(at(status), "address"), status).toBeNull();
      expect(editHref(at(status), "characteristics")).toBe(
        `/vendeur/biens/${id}/modifier/caracteristiques`,
      );
      expect(editHref(at(status), "listing")).toBe(`/vendeur/biens/${id}/modifier/annonce`);
    }
    for (const status of ["suspended", "sold"] as const) {
      for (const part of ["address", "characteristics", "listing"] as const) {
        expect(editHref(at(status), part), `${status} ${part}`).toBeNull();
      }
    }
  });

  it("the photos change in their tab until the listing is suspended or sold", () => {
    for (const status of [null, "draft", "rejected", "pending", "published", "paused"] as const) {
      expect(photosEditable(status), String(status)).toBe(true);
    }
    expect(photosEditable("suspended")).toBe(false);
    expect(photosEditable("sold")).toBe(false);
  });

  it("a change leads back to its tab, which says it is saved", () => {
    expect(savedHref(id)).toBe(`/vendeur/biens/${id}?modifie=1`);
    expect(savedHref(id, "annonce")).toBe(`/vendeur/biens/${id}/annonce?modifie=1`);
  });
});

// saveCharacteristics, with a script of answers for the Supabase client.
type Answer = { data: unknown; error: { code: string } | null };
type Write = { table: string; op: string; values?: unknown };
type Chain = {
  select(): Chain;
  update(values: unknown): Chain;
  eq(): Chain;
  is(): Chain;
  maybeSingle(): Promise<Answer>;
};

const mocks = vi.hoisted(() => ({
  profile: { id: "a11ce000-0000-4000-8000-000000000001", roles: ["seller"] },
  answers: [] as Answer[],
  writes: [] as Write[],
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => mocks.profile }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string): Chain {
      const write: Write = { table, op: "select" };
      const chain: Chain = {
        select: () => chain,
        update(values) {
          Object.assign(write, { op: "update", values });
          return chain;
        },
        eq: () => chain,
        is: () => chain,
        async maybeSingle() {
          mocks.writes.push(write);
          return mocks.answers.shift() ?? { data: null, error: null };
        },
      };
      return chain;
    },
  }),
}));

const property = (status: ListingStatus | null) => ({
  data: {
    address_line: "18 rue de la Gare",
    postal_code: "91600",
    city: "Savigny-sur-Orge",
    listing: status ? { status } : null,
  },
  error: null,
});

const complete: Characteristics = {
  propertyId: id,
  type: "appartement",
  surfaceM2: 68,
  carrezM2: null,
  rooms: 3,
  bedrooms: 2,
  floor: 2,
  floorsTotal: 4,
  buildYear: 1972,
  isNewBuild: false,
  dpe: "D",
  ges: "D",
  heating: "Collectif gaz",
  features: ["balcony", "elevator"],
  chargesMonthlyEuros: 210,
  propertyTaxYearlyEuros: 1150,
  coproLots: 48,
};

describe("saveCharacteristics once the listing is sent (L1-14b)", () => {
  beforeEach(() => {
    mocks.answers.length = 0;
    mocks.writes.length = 0;
    vi.clearAllMocks();
  });

  it("saves the characteristics of a listing in review, online or paused", async () => {
    const { saveCharacteristics } = await import("@/leenkey/properties/actions");
    for (const status of ["pending", "published", "paused"] as const) {
      mocks.writes.length = 0;
      mocks.answers.push(property(status), { data: { id }, error: null });
      expect(await saveCharacteristics({ ...complete, bedrooms: 1 }, "next"), status).toEqual({
        ok: true,
        data: { complete: true },
      });
      expect(mocks.writes[1]).toMatchObject({
        table: "properties",
        op: "update",
        values: { bedrooms: 1, surface_m2: 68, rooms: 3 },
      });
    }
    // The page of the property too, under /vendeur.
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/vendeur", "layout");
  });

  it("keeps it complete, even with « Enregistrer »: it stays as it is", async () => {
    const { saveCharacteristics } = await import("@/leenkey/properties/actions");
    mocks.answers.push(property("published"));
    expect(await saveCharacteristics({ ...complete, surfaceM2: null }, "save")).toEqual({
      ok: false,
      error: "incomplete",
      fieldErrors: { surfaceM2: "required" },
    });
    // A draft may still be saved incomplete.
    mocks.answers.push(property("draft"), { data: { id }, error: null });
    expect(await saveCharacteristics({ ...complete, surfaceM2: null }, "save")).toEqual({
      ok: true,
      data: { complete: false },
    });
  });

  it("changes nothing once suspended by Leenkey or sold", async () => {
    const { saveCharacteristics } = await import("@/leenkey/properties/actions");
    for (const status of ["suspended", "sold"] as const) {
      mocks.writes.length = 0;
      mocks.answers.push(property(status));
      expect(await saveCharacteristics(complete, "next"), status).toEqual({
        ok: false,
        error: "not_found",
      });
      expect(mocks.writes.map((write) => write.op)).toEqual(["select"]);
    }
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
