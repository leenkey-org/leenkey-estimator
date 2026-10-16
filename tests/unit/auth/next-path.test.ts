import { describe, expect, it } from "vitest";
import { loginPath, safeNextPath } from "@/core/auth/next-path";
import { homePathForRoles, isProtectedPath } from "@/leenkey/auth/routes";

describe("safeNextPath", () => {
  it("keeps a path of the site with its query and hash", () => {
    expect(safeNextPath("/annonce/maison-5-pieces-lk0002", "/")).toBe(
      "/annonce/maison-5-pieces-lk0002",
    );
    expect(safeNextPath("/acheter?ville=savigny-sur-orge&rayon=5#liste", "/")).toBe(
      "/acheter?ville=savigny-sur-orge&rayon=5#liste",
    );
  });

  it("refuses anything that could leave the site", () => {
    for (const raw of [
      "https://evil.example/x",
      "//evil.example/x",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "evil.example",
      "/ok\nLocation: https://evil.example",
      // Dot segments resolved by URL into a protocol-relative path.
      "/.//evil.example",
      "/%2e//evil.example",
      "/a/..//evil.example",
      "/./\\evil.example",
    ]) {
      expect(safeNextPath(raw, "/vendeur")).toBe("/vendeur");
    }
  });

  it("never sends back to an authentication page", () => {
    expect(safeNextPath("/connexion", "/acquereur")).toBe("/acquereur");
    expect(safeNextPath("/inscription?role=buyer", "/acquereur")).toBe("/acquereur");
    expect(safeNextPath("/auth/confirm?code=x", "/acquereur")).toBe("/acquereur");
    expect(safeNextPath("/conditions", "/acquereur")).toBe("/acquereur");
    expect(safeNextPath("/confirmation?token_hash=x&type=email", "/acquereur")).toBe("/acquereur");
  });

  it("falls back on empty or oversized values", () => {
    expect(safeNextPath(undefined, "/")).toBe("/");
    expect(safeNextPath("", "/")).toBe("/");
    expect(safeNextPath(`/${"a".repeat(600)}`, "/")).toBe("/");
  });
});

describe("homePathForRoles", () => {
  it("chooses the area of the account", () => {
    expect(homePathForRoles(["seller"])).toBe("/vendeur");
    expect(homePathForRoles(["buyer"])).toBe("/acquereur");
    expect(homePathForRoles(["buyer", "seller"])).toBe("/vendeur");
    expect(homePathForRoles(["admin"])).toBe("/admin");
    expect(homePathForRoles([])).toBe("/");
    expect(homePathForRoles(null)).toBe("/");
  });
});

describe("protected routes", () => {
  it("covers the signed-in areas only", () => {
    expect(isProtectedPath("/vendeur")).toBe(true);
    expect(isProtectedPath("/vendeur/biens/nouveau")).toBe(true);
    expect(isProtectedPath("/admin/annonces")).toBe(true);
    expect(isProtectedPath("/messages/123")).toBe(true);
    expect(isProtectedPath("/vendre")).toBe(false);
    expect(isProtectedPath("/acheter")).toBe(false);
    expect(isProtectedPath("/annonce/x")).toBe(false);
    expect(isProtectedPath("/administration")).toBe(false);
  });

  it("builds the login link that comes back", () => {
    expect(loginPath("/vendeur")).toBe("/connexion?next=%2Fvendeur");
    expect(loginPath("//evil.example")).toBe("/connexion");
    expect(loginPath(null)).toBe("/connexion");
  });
});
