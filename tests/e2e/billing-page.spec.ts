import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-26: the page of the plans of a property and the summary of an order
// (SPEC-V2 8.8 and 11, DESIGN.md 12.4), read on the seed in mobile and in
// desktop: nothing is paid, nothing is changed (the button that pays is only
// clicked with its box unticked). Seed: LK-0003 (Autonomie) and LK-0001
// (Accompagné) of seller_a. The payment itself is in billing.spec.ts
// (project « seed-mutations »).

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)");

const LK0001 = "5eed1000-0000-4000-8000-000000000001";
const LK0003 = "5eed1000-0000-4000-8000-000000000003";
const planPage = (id: string) => `/vendeur/formule?bien=${id}`;

/** Signs seller_a in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill("seller_a@test.leenkey.fr");
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
        // Accepted by a parallel test in between: the page itself opens now.
      });
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

const plansList = (page: Page) => page.getByRole("list", { name: "Choisir ma formule" });
const recapOf = (page: Page) =>
  page.getByRole("region", { name: "Récapitulatif de votre commande" });

test("la page formule : trois formules, la formule actuelle, le récapitulatif et ses cases @a11y", async ({
  page,
}) => {
  await signIn(page, planPage(LK0003));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Un forfait fixe par bien. Jamais de commission.",
    }),
  ).toBeVisible();
  const plans = plansList(page);
  await expect(plans.getByRole("heading", { level: 2 })).toHaveText([
    "Autonomie",
    "Accompagné",
    "Sérénité",
  ]);
  await expect(plans.getByRole("listitem").first()).toContainText("Formule actuelle");
  await expect(plans.getByText("Le plus complet")).toBeVisible();
  await expect(page.getByText(/Paiement sécurisé par carte via Stripe/)).toBeVisible();
  await expectNoSeriousViolation(page);

  await plans.getByRole("button", { name: "Choisir Accompagné" }).click();
  const recap = recapOf(page);
  await expect(
    recap.getByRole("heading", { name: "Récapitulatif de votre commande" }),
  ).toBeFocused();
  await expect(recap).toContainText("Accompagné");
  await expect(recap).toContainText(
    "12 mois à partir du paiement, renouvelables à l'échéance, jamais automatiquement",
  );
  await expect(recap).toContainText("renoncer au contrat pendant 14 jours");
  // Never ticked beforehand (L1-40, decision of 2026-10-15).
  const terms = recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ });
  const early = recap.getByRole("checkbox", { name: /commencent avant la fin du délai/ });
  await expect(terms).not.toBeChecked();
  await expect(early).not.toBeChecked();
  await recap.getByRole("button", { name: "Commander et payer 990 € TTC" }).click();
  await expect(
    recap.getByText("Cochez la case pour accepter les conditions générales."),
  ).toBeVisible();
  await expect(terms).toBeFocused();
  await expect(page).toHaveURL(planPage(LK0003));
  await expectNoSeriousViolation(page);

  await recap.getByRole("button", { name: "Changer de formule" }).click();
  await expect(plans).toBeVisible();
});

test("les cases cochées pour une formule ne passent jamais à une autre", async ({ page }) => {
  await signIn(page, planPage(LK0003));
  await plansList(page).getByRole("button", { name: "Choisir Accompagné" }).click();
  const recap = recapOf(page);
  await recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ }).check();
  await recap.getByRole("checkbox", { name: /commencent avant la fin du délai/ }).check();
  await recap.getByRole("button", { name: "Changer de formule" }).click();

  await plansList(page).getByRole("button", { name: "Choisir Sérénité" }).click();
  await expect(recap.getByRole("button", { name: "Commander et payer 1 500 € TTC" })).toBeVisible();
  await expect(recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ })).not.toBeChecked();
  await expect(
    recap.getByRole("checkbox", { name: /commencent avant la fin du délai/ }),
  ).not.toBeChecked();

  // Nor from one visit of the summary to the next, for the same plan.
  await recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ }).check();
  await recap.getByRole("button", { name: "Changer de formule" }).click();
  await plansList(page).getByRole("button", { name: "Choisir Sérénité" }).click();
  await expect(recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ })).not.toBeChecked();
});

test("une formule payante : « Passer à Sérénité pour 510 € », la formule inférieure comprise", async ({
  page,
}) => {
  await signIn(page, planPage(LK0001));
  const plans = plansList(page);
  const accompagne = plans.getByRole("listitem").filter({ hasText: "Accompagné" }).first();
  await expect(accompagne).toContainText("Formule actuelle");
  await expect(accompagne).toContainText(/Active depuis le .*, jusqu'au /);
  await expect(plans.getByRole("button", { name: "Passer à Sérénité pour 510 €" })).toBeVisible();
  await expect(plans.getByRole("button", { name: /Choisir/ })).toHaveCount(0);
  await plans.getByRole("button", { name: "Passer à Sérénité pour 510 €" }).click();
  const recap = recapOf(page);
  await expect(recap).toContainText("510 € TTC : la différence avec Accompagné, déjà payée");
  await expect(recap.getByRole("button", { name: "Commander et payer 510 € TTC" })).toBeVisible();
});

test("le tableau comparatif sous les formules, replié sur téléphone (L1-33)", async ({
  page,
  isMobile,
}) => {
  await signIn(page, planPage(LK0003));
  const comparison = page.getByRole("region", { name: "Comparer les formules" });
  // getByRole leaves out the copy hidden at this width.
  const table = comparison.getByRole("table", { name: "Ce que comprend chaque formule" });
  if (isMobile) {
    await expect(table).toHaveCount(0);
    await comparison.getByText("Comparer les formules en détail").click();
  }
  await expect(table).toHaveCount(1);
  await expect(table.getByRole("columnheader")).toHaveText([
    "Ce qui est inclus",
    "Autonomie",
    "Accompagné",
    "Sérénité",
  ]);
  await expect(table.getByRole("row")).toHaveCount(19);
  const row = (label: string) => table.getByRole("row", { name: new RegExp(`^${label}`) });
  await expect(row("Publication sur Leenkey").getByRole("cell")).toHaveText([
    "Inclus",
    "Inclus",
    "Inclus",
  ]);
  await expect(row("Conseiller dédié").getByRole("cell")).toHaveText([
    "Non inclus",
    "Inclus",
    "Inclus",
  ]);
  await expect(row("Suivi jusqu'à la signature").getByRole("cell")).toHaveText([
    "Non inclus",
    "Non inclus",
    "Inclus",
  ]);
  await expectHeadersFit(table);
  await expectNoSeriousViolation(page);

  if (!isMobile) {
    // 768 px, where the table unfolds: open, its names in their columns.
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(table).toHaveCount(1);
    await expectHeadersFit(table);
  }
});

/** No name of a plan wider than its column (« Accompagné » on a phone). */
async function expectHeadersFit(table: ReturnType<Page["getByRole"]>) {
  for (const header of await table.getByRole("columnheader").all()) {
    const { scroll, client } = await header.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
    expect(scroll, (await header.textContent()) ?? "").toBeLessThanOrEqual(client);
  }
}
