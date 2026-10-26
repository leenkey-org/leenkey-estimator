import { expect, test, type Page } from "@playwright/test";

// L1-56: every page takes the width of the screen up to 1 920 px, centred
// beyond, inside gutters of 20 px (16 px for direction C), 32 px from 768 px
// and 64 px from 1 536 px; the top bar, the content and the footer start at
// the same place (DESIGN.md 4.3); on a tablet the top bar keeps 20 px. A
// phone never scrolls sideways. The checks of the frame run without a
// database (CI); the columns of the search need the seed (E2E_SEED=1).

const seeded = process.env.E2E_SEED === "1";

/** Left edge of the logo of the TopNav, of a title of the page and of the footer. */
async function edges(page: Page, title: RegExp) {
  const left = async (locator: ReturnType<Page["locator"]>) =>
    Math.round((await locator.boundingBox())?.x ?? Number.NaN);
  return {
    nav: await left(page.locator('header[data-sticky-header="top-nav"] a').first()),
    title: await left(page.getByRole("heading", { name: title })),
    footer: await left(page.getByRole("contentinfo").getByRole("link").first()),
  };
}

async function overflowsSideways(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

test.describe("pleine page selon l'appareil", () => {
  test.beforeEach(() => {
    // The widths are set here: a single pass is enough.
    test.skip(test.info().project.name !== "desktop", "largeurs fixées dans le test");
  });

  // On a tablet, the top bar keeps 20 px: the links of an account would not fit.
  for (const [width, gutter, nav] of [
    [768, 32, 20],
    [1024, 32, 32],
    [1280, 32, 32],
    [1536, 64, 64],
    [1920, 64, 64],
  ] as const) {
    test(`${width} px : contenu et pied de page à ${gutter} px du bord, barre haute à ${nav} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: /Que voulez-vous faire/ })).toBeVisible();
      expect(await edges(page, /Que voulez-vous faire/)).toEqual({
        nav,
        title: gutter,
        footer: gutter,
      });
      expect(await overflowsSideways(page)).toBe(false);
    });
  }

  test("au-delà de 1 920 px, le cadre est centré", async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1200 });
    await page.goto("/concept");
    // (2 560 - 1 920) / 2 + 64.
    expect(await edges(page, /Combien vaut vraiment votre bien/)).toEqual({
      nav: 384,
      title: 384,
      footer: 384,
    });
  });

  test("à partir de 1 536 px, la recherche montre trois cartes par rangée", async ({ page }) => {
    test.skip(!seeded, "base de seed requise (E2E_SEED=1)");
    const tops = async () => {
      const items = page.getByRole("list", { name: "Résultats" }).getByRole("listitem");
      await expect(items.nth(3)).toBeVisible();
      const boxes = await Promise.all([0, 1, 2, 3].map((n) => items.nth(n).boundingBox()));
      return boxes.map((box) => Math.round(box?.y ?? Number.NaN));
    };
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/acheter");
    const [a, b, c] = await tops();
    // Two a row at 1 280 px: the third card starts the next row.
    expect(a).toBe(b);
    expect(c).toBeGreaterThan(a);

    await page.setViewportSize({ width: 1600, height: 900 });
    const [d, e, f, g] = await tops();
    expect([e, f]).toEqual([d, d]);
    expect(g).toBeGreaterThan(d);
    expect(await overflowsSideways(page)).toBe(false);
  });
});

test("sur téléphone, aucune page ne défile de côté", async ({ page, isMobile }) => {
  test.skip(!isMobile, "écran de téléphone (projet mobile)");
  for (const path of ["/", "/concept", "/tarifs", "/acheter", "/vendre", "/faq"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    expect(await overflowsSideways(page), path).toBe(false);
  }
});
