import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import { sitemapEntries } from "@/leenkey/listings/sitemap";

// L1-20: sitemap and robots.

afterEach(() => vi.unstubAllEnvs());

describe("sitemapEntries", () => {
  it("keeps the V1 pages, adds the search and every published listing", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://leenkey.fr");
    const entries = sitemapEntries([
      { slug: "appartement-3-pieces-savigny-sur-orge-lk0005", publishedAt: "2026-10-04T08:00:00Z" },
      { slug: "maison-5-pieces-epinay-sur-orge-lk0007", publishedAt: null },
    ]);
    const urls = entries.map((entry) => entry.url);
    for (const path of [
      "/",
      "/estimer",
      "/concept",
      "/tarifs",
      "/qui-sommes-nous",
      "/faq",
      "/investir",
      "/mentions-legales",
      "/cgu",
      "/acheter",
    ]) {
      expect(urls, path).toContain(`https://leenkey.fr${path}`);
    }
    expect(entries.at(-2)).toEqual({
      url: "https://leenkey.fr/annonce/appartement-3-pieces-savigny-sur-orge-lk0005",
      lastModified: "2026-10-04T08:00:00Z",
      changeFrequency: "weekly",
      priority: 0.7,
    });
    expect(entries.at(-1)?.lastModified).toBeUndefined();
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("still lists the pages without any listing (database unavailable)", () => {
    expect(sitemapEntries([]).length).toBe(10);
  });
});

describe("robots", () => {
  it("closes every environment but production", () => {
    for (const env of ["staging", "local"]) {
      vi.stubEnv("NEXT_PUBLIC_ENV", env);
      expect(robots(), env).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    }
  });

  it("opens production but the signed-in areas, the back office and the technical routes", () => {
    vi.stubEnv("NEXT_PUBLIC_ENV", "production");
    const result = robots();
    expect(result.sitemap).toBe("https://leenkey.fr/sitemap.xml");
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    // The share images of the listings (og:image) stay readable by social networks.
    expect(rules.allow).toEqual(["/", "/api/og/"]);
    expect(rules.disallow).toEqual(
      expect.arrayContaining([
        "/vendeur",
        "/acquereur",
        "/messages",
        "/offres",
        "/visites",
        "/compte",
        "/admin",
        "/api/",
        "/conditions",
      ]),
    );
    // The public pages stay open.
    for (const open of ["/acheter", "/annonce", "/estimer", "/connexion", "/inscription"]) {
      expect(rules.disallow, open).not.toContain(open);
    }
  });
});
