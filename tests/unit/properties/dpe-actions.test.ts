import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DpeLookup, DpeRecord } from "@/leenkey/properties/dpe-registry";

// L1-66: findDpe, the DPE of a number for the form of step 2. The Supabase
// client is a script of answers; the register is lookupDpe, mocked.

type Answer = { data: { postal_code: string } | null; error: { code: string } | null };
type Chain = {
  select(): Chain;
  eq(column: string, value: unknown): Chain;
  is(): Chain;
  maybeSingle(): Promise<Answer>;
};

const propertyId = "623efc8b-97d4-4902-ac43-406417498893";
const record: DpeRecord = {
  number: "2491E0000001A",
  kind: "logement",
  dpe: "C",
  ges: "B",
  date: "2024-03-12",
  validUntil: "2034-03-11",
  energyKwhM2Year: 148,
  gesKgM2Year: 21,
  postalCode: "91360",
};

const mocks = vi.hoisted(() => ({
  profile: { id: "a11ce000-0000-4000-8000-000000000001", roles: ["seller"] } as {
    id: string;
  } | null,
  property: { data: { postal_code: "91360" }, error: null } as Answer,
  filters: [] as [string, unknown][],
  lookup: vi.fn<(number: string) => Promise<DpeLookup>>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => mocks.profile }));
vi.mock("@/leenkey/properties/dpe-registry", () => ({ lookupDpe: mocks.lookup }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(): Chain {
      const chain: Chain = {
        select: () => chain,
        eq(column, value) {
          mocks.filters.push([column, value]);
          return chain;
        },
        is: () => chain,
        maybeSingle: async () => mocks.property,
      };
      return chain;
    },
  }),
}));

describe("findDpe", () => {
  beforeEach(() => {
    mocks.profile = { id: "a11ce000-0000-4000-8000-000000000001" };
    mocks.property = { data: { postal_code: "91360" }, error: null };
    mocks.filters.length = 0;
    mocks.lookup.mockReset();
    mocks.lookup.mockResolvedValue({ ok: true, data: record });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("gives the DPE of the number for the seller's own property", async () => {
    const { findDpe } = await import("@/leenkey/properties/dpe-actions");
    expect(await findDpe({ propertyId, number: " 2491e0000001a " })).toEqual({
      ok: true,
      data: { record, samePostalCode: true },
    });
    expect(mocks.lookup).toHaveBeenCalledWith("2491E0000001A");
    // Their own property only: asked by its owner.
    expect(mocks.filters).toEqual([
      ["id", propertyId],
      ["owner_id", "a11ce000-0000-4000-8000-000000000001"],
    ]);
  });

  it("says when the DPE is registered for another postal code", async () => {
    const { findDpe } = await import("@/leenkey/properties/dpe-actions");
    mocks.property = { data: { postal_code: "91600" }, error: null };
    expect(await findDpe({ propertyId, number: record.number })).toMatchObject({
      ok: true,
      data: { samePostalCode: false },
    });
    // A DPE without a postal code in the register is not said to be elsewhere.
    mocks.lookup.mockResolvedValue({ ok: true, data: { ...record, postalCode: null } });
    expect(await findDpe({ propertyId, number: record.number })).toMatchObject({
      ok: true,
      data: { samePostalCode: true },
    });
  });

  it("asks the register for nothing without a session, a number, or the seller's own property", async () => {
    const { findDpe } = await import("@/leenkey/properties/dpe-actions");
    expect(await findDpe({ propertyId, number: "2491E12" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await findDpe({ propertyId: "pas-un-id", number: record.number })).toEqual({
      ok: false,
      error: "invalid",
    });
    // The property of someone else: RLS and the owner filter give no row.
    mocks.property = { data: null, error: null };
    expect(await findDpe({ propertyId, number: record.number })).toEqual({
      ok: false,
      error: "not_found",
    });
    mocks.property = { data: null, error: { code: "57014" } };
    expect(await findDpe({ propertyId, number: record.number })).toEqual({
      ok: false,
      error: "unavailable",
    });
    mocks.profile = null;
    expect(await findDpe({ propertyId, number: record.number })).toEqual({
      ok: false,
      error: "auth",
    });
    expect(mocks.lookup).not.toHaveBeenCalled();
  });

  it("says a number unknown to the register, and a register that does not answer", async () => {
    const { findDpe } = await import("@/leenkey/properties/dpe-actions");
    mocks.lookup.mockResolvedValue({ ok: true, data: null });
    expect(await findDpe({ propertyId, number: record.number })).toEqual({
      ok: false,
      error: "unknown",
    });
    mocks.lookup.mockResolvedValue({ ok: false, error: "unavailable" });
    expect(await findDpe({ propertyId, number: record.number })).toEqual({
      ok: false,
      error: "unavailable",
    });
  });
});
