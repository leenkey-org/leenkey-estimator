import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// L1-36: every legal text is reachable from the footers (V2 pages and V1
// marketing pages), which show the legal identity and address of Leenkey.

const PAGES = [
  ["/mentions-legales", /Mentions légales/],
  ["/cgu", /Conditions/],
  ["/cgv", "Conditions générales de vente"],
  ["/confidentialite", "Politique de confidentialité"],
  ["/cookies", "Politique cookies"],
  ["/signalement", "Signalement et modération"],
  ["/intelligence-artificielle", "Intelligence artificielle"],
] as const;

test("chaque lien légal du pied de page mène à sa page", async ({ page }) => {
  await page.goto("/cgv");
  const footer = page.getByRole("contentinfo");
  for (const [path, title] of PAGES) {
    await expect(footer.locator(`a[href="${path}"]`)).toHaveCount(1);
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first(), path).toHaveText(title);
    await page.goto("/cgv");
  }
  await expect(footer.locator('a[href="mailto:contact.leenkey@gmail.com"]')).toHaveText("Contact");
});

test("le pied de page des pages V1 a les mêmes liens et l'adresse légale", async ({ page }) => {
  await page.goto("/tarifs");
  const footer = page.locator("footer").last();
  for (const [path] of PAGES) await expect(footer.locator(`a[href="${path}"]`)).toHaveCount(1);
  await expect(footer).toContainText("SAS LEENKEY · RCS Évry 107 616 211");
  await expect(footer).toContainText("36 rue Pierre Brossolette, 91360 Épinay-sur-Orge");
});

test("les pages en cours de rédaction le disent et donnent l'adresse légale", async ({ page }) => {
  for (const path of ["/cgv", "/confidentialite", "/signalement", "/intelligence-artificielle"]) {
    await page.goto(path);
    await expect(
      page.getByRole("status").filter({ hasText: "en cours de rédaction" }),
    ).toBeVisible();
    await expect(page.locator("address")).toContainText("36 rue Pierre Brossolette");
  }
});

test("la politique cookies liste les cookies du site", async ({ page }) => {
  await page.goto("/cookies");
  const table = page.getByRole("table", { name: "Liste provisoire des cookies du site" });
  for (const name of ["lk_consent", "lk_lien", "lk_vues", "_ga, _ga_…"]) {
    await expect(table.getByRole("rowheader", { name })).toBeVisible();
  }
});

test("pages légales sans violation sérieuse ou critique @a11y", async ({ page }) => {
  for (const path of ["/cgv", "/cookies", "/signalement", "/intelligence-artificielle"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(
      blocking.map((violation) => violation.id),
      path,
    ).toEqual([]);
  }
});
