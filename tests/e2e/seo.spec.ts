import { expect, test } from "@playwright/test";

// L1-20: /sitemap.xml and /robots.txt. Two modes, like search.spec.ts:
// without a database (CI), the sitemap lists the pages of the site only; on
// the seed (E2E_SEED=1, local stack or preprod), the published listings too
// and never the others. Robots: closed outside production.

const seeded = process.env.E2E_SEED === "1";
const production = process.env.NEXT_PUBLIC_ENV === "production";

test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop", "réponses sans écran : un seul projet");
});

test("le sitemap liste les pages du site et les annonces publiées", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/xml/);
  const xml = await response.text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname,
  );
  for (const path of ["/", "/estimer", "/acheter", "/concept", "/tarifs", "/faq", "/cgu"]) {
    expect(paths, path).toContain(path);
  }
  const listings = paths.filter((path) => path.startsWith("/annonce/"));
  if (seeded) {
    // Twelve published in the seed (the back office tests may publish more).
    expect(listings.length).toBeGreaterThanOrEqual(12);
    // Pending (LK-0006) and refused (LK-0016) listings are never listed.
    expect(listings.some((path) => /-lk00(06|16)$/.test(path))).toBe(false);
  } else {
    expect(listings).toEqual([]);
  }
  expect(new Set(paths).size).toBe(paths.length);
});

test("robots ferme tout hors production, et les espaces privés en production", async ({
  request,
}) => {
  const text = await (await request.get("/robots.txt")).text();
  if (!production) {
    expect(text).toMatch(/^Disallow: \/$/m);
    return;
  }
  expect(text).toMatch(/^Allow: \/$/m);
  // The share images of the listings stay readable by social networks.
  expect(text).toMatch(/^Allow: \/api\/og\/$/m);
  for (const path of ["/vendeur", "/acquereur", "/messages", "/compte", "/admin", "/api/"]) {
    expect(text, path).toContain(`Disallow: ${path}\n`);
  }
  expect(text).not.toMatch(/^Disallow: \/(acheter|annonce|estimer)\b/m);
  expect(text).toContain("Sitemap: https://leenkey.fr/sitemap.xml");
});
