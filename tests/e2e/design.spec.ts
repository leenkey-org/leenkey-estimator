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

test.describe("catalogue /design", () => {
  test.skip(isProduction, "page absente en production (404), vérifiée par le premier test");

  test.beforeEach(async ({ page }) => {
    const response = await page.goto("/design");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
    // Contrast is computed on the final rendering: photos and Sora loaded.
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
  });

  test("aucune violation d'accessibilité sérieuse ou critique @a11y", async ({ page }) => {
    // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
    await page.emulateMedia({ reducedMotion: "reduce" });
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
    // Radix moves the focus just after keydown and selects while the key is
    // down: hold it like a person does (press() releases it at once).
    await page.keyboard.down("ArrowRight");
    await expect(dpe.getByRole("radio", { name: "Classe D" })).toBeFocused();
    await page.keyboard.up("ArrowRight");
    await expect(dpe.getByRole("radio", { name: "Classe D" })).toBeChecked();
    await expect(dpe.getByRole("radio", { name: "Classe C" })).not.toBeChecked();
  });

  test("la cloche : panneau vide de l'espace, puis le panneau d'exemple (L1-22)", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const section = page.locator('section[aria-labelledby="notifications"]');
    await section.getByRole("button", { name: "Notifications", exact: true }).first().click();
    const panel = page.getByRole("dialog", { name: "Notifications" });
    await expect(panel.getByRole("heading", { name: "Aucune notification" })).toBeVisible();
    await expect(panel).toContainText("des réponses des vendeurs");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    // The empty panel of a seller: « Compléter mon annonce » to the « Dossier » tab.
    await section.getByRole("button", { name: "Notifications", exact: true }).last().click();
    await expect(panel.getByRole("link", { name: "Compléter mon annonce" })).toHaveAttribute(
      "href",
      "/vendeur/dossier",
    );
    await page.keyboard.press("Escape");

    const bell = section.getByRole("button", { name: "Notifications, 3 nouvelles" });
    await bell.click();
    await expect(panel.getByRole("heading")).toHaveText([
      "Notifications",
      "Aujourd'hui",
      "Cette semaine",
      "Plus ancien",
    ]);
    await expect(
      panel.getByRole("link").filter({ hasText: "Nouveau message de Chloé" }),
    ).toContainText(", non lue");
    await panel.getByRole("button", { name: "Tout marquer comme lu" }).click();
    await expect(panel.getByRole("button", { name: "Tout marquer comme lu" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(panel.getByText(", non lue")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(section.getByRole("button", { name: "Notifications, 3 nouvelles" })).toHaveCount(
      0,
    );
  });

  test("l'aperçu des emails : chaque gabarit, avec son sujet (L1-22)", async ({ page }) => {
    await page.getByRole("link", { name: "Aperçu des emails" }).click();
    await expect(page).toHaveURL("/design/emails");
    await expect(page.getByRole("heading", { level: 1, name: "Emails" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(9);
    await expect(page.getByText("Sujet : 3 annonces à valider")).toBeVisible();
    const frame = page.frameLocator(
      'iframe[title="Aperçu de l\'email « Nouveau message avec un lien (vendeur) »"]',
    );
    await expect(frame.getByText("Ce message contient un lien ou une adresse")).toBeVisible();
  });

  test("le titre utilise Sora en gras, la police de la charte D", async ({ page }) => {
    const title = page.getByRole("heading", { level: 1, name: "Design system" });
    const style = await title.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { family: computed.fontFamily, weight: computed.fontWeight };
    });
    expect(style.family).toMatch(/^"?sora/i);
    expect(style.weight).toBe("700");
  });
});
