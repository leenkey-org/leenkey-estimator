import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-09: what does not need an account. The CI build has no Supabase: the
// middleware still protects the signed-in areas and the forms validate on the
// server before any call to Supabase Auth. The full journey (email
// confirmation, password reset) runs against a stack with an email catcher:
// scripts/local-stack.sh, then tests/e2e/auth-journey.spec.ts.

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

test("un espace connecté renvoie vers la connexion, qui y ramènera", async ({ page }) => {
  await page.goto("/vendeur/biens?onglet=photos");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fvendeur%2Fbiens%3Fonglet%3Dphotos$/);
  await expect(page.getByRole("heading", { level: 1, name: "Connectez-vous" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer un compte" })).toHaveAttribute(
    "href",
    "/inscription?next=%2Fvendeur%2Fbiens%3Fonglet%3Dphotos",
  );
});

test("l'inscription présélectionne le rôle selon la page d'origine", async ({ page }) => {
  await page.goto("/inscription?next=%2Fannonce%2Fmaison-5-pieces-lk0002");
  await expect(page.getByRole("radio", { name: /J'achète/ })).toBeChecked();
  await page.goto("/inscription");
  await expect(page.getByRole("radio", { name: /Je vends/ })).toBeChecked();
  await page.goto("/inscription?role=buyer");
  await expect(page.getByRole("radio", { name: /J'achète/ })).toBeChecked();
});

test("l'inscription annonce les erreurs et garde la saisie", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Prénom et nom").fill("Camille Martin");
  await page.getByLabel("Email").fill("pas-un-email");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  // Next.js has its own (empty) role="alert" region: target ours by its text.
  await expect(
    page.getByRole("alert").filter({ hasText: "3 champs sont à corriger." }),
  ).toBeVisible();
  await expect(page.getByText("Cet email n'est pas valide.")).toBeVisible();
  await expect(page.getByText("8 caractères minimum.")).toBeVisible();
  await expect(
    page.getByText(
      "Acceptez les conditions d'utilisation et la politique de confidentialité pour continuer.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Prénom et nom")).toHaveValue("Camille Martin");
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
});

test("les liens des conditions mènent à des pages existantes", async ({ page }) => {
  for (const path of ["/cgu", "/confidentialite"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
  }
});

test("écrans d'authentification sans violation sérieuse ou critique @a11y", async ({ page }) => {
  for (const path of ["/inscription", "/connexion", "/mot-de-passe-oublie", "/confidentialite"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    expect(await blockingViolations(page), path).toEqual([]);
  }
});
