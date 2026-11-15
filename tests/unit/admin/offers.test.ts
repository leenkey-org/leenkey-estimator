import { describe, expect, it } from "vitest";
import {
  ADMIN_OFFER_FILTERS,
  adminOffersHref,
  offerAnalysedSchema,
  parseAdminOffersQuery,
} from "@/lib/validations/admin";

// L2-07: the back office of the offers. The address of the list (a status, a
// search, an account) and the command « Marquer comme analysée ». The SQL is
// tested in supabase/tests/rls_admin_offers.sql.

const ACCOUNT = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("admin offers URL", () => {
  it("has the four filters of the list, never the drafts", () => {
    expect(ADMIN_OFFER_FILTERS.map((filter) => [filter.param, filter.status])).toEqual([
      ["en-attente", "waiting"],
      ["acceptees", "accepted"],
      ["refusees", "declined"],
      ["terminees", "ended"],
    ]);
  });

  it("reads a status, a search and an account, and ignores the rest", () => {
    expect(
      parseAdminOffersQuery({ statut: "en-attente", q: " LK-2026-00012 ", compte: ACCOUNT }),
    ).toEqual({ status: "waiting", query: "LK-2026-00012", account: ACCOUNT });
    expect(parseAdminOffersQuery({ statut: "draft", q: "", compte: "moi" })).toEqual({
      status: undefined,
      query: undefined,
      account: undefined,
    });
    expect(
      parseAdminOffersQuery({ statut: ["acceptees", "refusees"], q: "x".repeat(101) }),
    ).toEqual({ status: "accepted", query: undefined, account: undefined });
  });

  it("writes the address back", () => {
    expect(adminOffersHref({})).toBe("/admin/offres");
    expect(adminOffersHref({ status: "accepted" })).toBe("/admin/offres?statut=acceptees");
    expect(adminOffersHref({ status: "ended", query: "Juvisy", account: ACCOUNT })).toBe(
      `/admin/offres?statut=terminees&q=Juvisy&compte=${ACCOUNT}`,
    );
    const href = adminOffersHref({ status: "declined", query: "Savigny-sur-Orge" });
    const params = Object.fromEntries(new URL(href, "https://leenkey.fr").searchParams);
    expect(parseAdminOffersQuery(params)).toEqual({
      status: "declined",
      query: "Savigny-sur-Orge",
      account: undefined,
    });
  });
});

describe("offerAnalysedSchema", () => {
  it("takes the id of an offer only", () => {
    expect(offerAnalysedSchema.safeParse({ offerId: ACCOUNT }).success).toBe(true);
    expect(offerAnalysedSchema.safeParse({ offerId: "LK-2026-00012" }).success).toBe(false);
    expect(offerAnalysedSchema.safeParse({}).success).toBe(false);
  });
});
