import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// L1-07 / L1-08: /design is the living catalogue of the Façade design system
// (docs/DESIGN.md 12.14). It only exists outside production. CI builds and
// runs this suite with NEXT_PUBLIC_ENV=production: there, the catalogue tests
// are skipped and the first test checks that the page really is a 404.
// `npm run a11y` against a local or preprod build runs the @a11y tests.

const isProduction = process.env.NEXT_PUBLIC_ENV === "production";

test("/design n'existe pas en production", async ({ page }) => {
  test.skip(!isProduction, "catalogue présent hors production");
  const response = await page.goto("/design");
  expect(response?.status()).toBe(404);
});

test("les pages V1 ne chargent pas la police Archivo", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const families = await page.evaluate(() => [...document.fonts].map((face) => face.family));
  expect(families.some((family) => /archivo/i.test(family))).toBe(false);
});

test.describe("catalogue /design", () => {
  test.skip(isProduction, "page absente en production (404), vérifiée par le premier test");

  test.beforeEach(async ({ page }) => {
    const response = await page.goto("/design");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
    // Contrast is computed on the final rendering: photos and Archivo loaded.
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
  });

  test("aucune violation d'accessibilité sérieuse ou critique @a11y", async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target.join(" ")),
      }));
    expect(blocking).toEqual([]);
  });

  test("les sélections se pilotent au clavier et annoncent leur état @a11y", async ({ page }) => {
    const chip = page.getByRole("button", { name: "Terrasse" });
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await chip.focus();
    await page.keyboard.press("Space");
    await expect(chip).toHaveAttribute("aria-pressed", "true");

    const dpe = page.getByRole("radiogroup", { name: "DPE" });
    await expect(dpe.getByRole("radio", { name: "Classe C" })).toBeChecked();
    await dpe.getByRole("radio", { name: "Classe C" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(dpe.getByRole("radio", { name: "Classe D" })).toBeChecked();
    await expect(dpe.getByRole("radio", { name: "Classe D" })).toBeFocused();
  });

  test("le titre et les prix utilisent Archivo élargie", async ({ page }) => {
    const title = page.getByRole("heading", { level: 1, name: "Design system" });
    const style = await title.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { family: computed.fontFamily, stretch: computed.fontStretch };
    });
    expect(style.family).toMatch(/archivo/i);
    expect(style.stretch).toBe("116%");
  });
});
