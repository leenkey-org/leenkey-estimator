import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-39: « Mon compte » read on a seed account, at 390 px (mobile) and
// 1 280 px (desktop): its sections and rows, « Mes espaces », no serious
// accessibility violation. The changes themselves, on a new account:
// tests/e2e/account-live.spec.ts.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1, SEED_PASSWORD)");

async function signIn(page: Page, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill("buyer_c@test.leenkey.fr");
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  await page.goto(path);
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page
      .waitForURL((url) => url.pathname !== "/conditions", { timeout: 5_000 })
      .catch(() => {
        // Accepted by a parallel test in between.
      });
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
  await expect(page).toHaveURL(path);
}

test("sans session, le compte mène à la connexion", async ({ page }) => {
  await page.goto("/compte/mot-de-passe");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fcompte%2Fmot-de-passe/);
});

test("le compte d'un acquéreur : ses informations, ses espaces, ses réglages", async ({ page }) => {
  await signIn(page, "/compte");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mon compte");
  for (const section of [
    "Informations personnelles",
    "Connexion",
    "Notifications",
    "Mes espaces",
    "Cookies",
    "Fermer mon compte",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
  }
  const identity = page.getByRole("region", { name: "Informations personnelles" });
  await expect(identity.getByRole("link", { name: /Prénom et nom/ })).toHaveAttribute(
    "href",
    "/compte/informations",
  );
  const signInRows = page.getByRole("region", { name: "Connexion" });
  await expect(signInRows.getByRole("link", { name: /Adresse email/ })).toContainText(
    "buyer_c@test.leenkey.fr",
  );
  await expect(signInRows.getByRole("link", { name: /Mot de passe/ })).toHaveAttribute(
    "href",
    "/compte/mot-de-passe",
  );
  const spaces = page.getByRole("region", { name: "Mes espaces" });
  await expect(spaces.getByRole("link", { name: /J'achète/ })).toHaveAttribute(
    "href",
    "/acquereur",
  );
  await expect(spaces.getByRole("button", { name: "Ajouter « Je vends »" })).toBeVisible();
  // Also in the footer; here for the pages without it (Q43).
  await expect(
    page
      .getByRole("region", { name: "Cookies" })
      .getByRole("button", { name: "Gérer mes cookies" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
  await expect(page.getByRole("link", { name: "contact.leenkey@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:contact.leenkey@gmail.com",
  );
  // Rows of 56 px (DESIGN.md 13.1, G9).
  const row = await identity.getByRole("link", { name: /Prénom et nom/ }).boundingBox();
  expect(row?.height).toBeGreaterThanOrEqual(56);
  // No horizontal scroll.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );

  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
});

test("les pages de chaque changement, reliées au compte", async ({ page }) => {
  await signIn(page, "/compte/informations");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Informations personnelles");
  await expect(page.getByLabel("Prénom")).not.toHaveValue("");
  await expect(page.getByRole("link", { name: "Mon compte" }).first()).toHaveAttribute(
    "href",
    "/compte",
  );
  await page.goto("/compte/email");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Adresse email");
  await expect(page.getByText("buyer_c@test.leenkey.fr")).toBeVisible();
  await page.goto("/compte/mot-de-passe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mot de passe");
  await expect(page.getByLabel("Mot de passe actuel")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toBeVisible();
  for (const path of ["/compte/informations", "/compte/email", "/compte/mot-de-passe"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
      path,
    ).toEqual([]);
  }
});
