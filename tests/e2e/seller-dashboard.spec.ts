import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-24: « Ma vente » (SPEC-V2 8.7, docs/DESIGN.md 12.3), read on the seed in
// mobile and in desktop; nothing is changed. Seed properties: 1 (LK-0001,
// published, Accompagné, two contacts: Chloé, financing declared, and David)
// and 2 (published) of seller_a; 15 (pending) and 16 (rejected) of seller_b.
// The property shown by default (chooseProperty) is unit-tested: the specs
// of « seed-mutations » add properties to the same sellers.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)");

const property = (n: number) => `5eed1000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const dashboard = (n: number) => `/vendeur?bien=${property(n)}`;

/** Signs a seed seller in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, account: "seller_a" | "seller_b", path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
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
  await expect(page).toHaveURL(path);
}

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

const header = (page: Page) =>
  page.locator("header").filter({ has: page.getByRole("heading", { level: 1, name: "Ma vente" }) });
const nextAction = (page: Page) => page.getByRole("region", { name: "Prochaine action" });

test("une vente en ligne : en-tête, prochaine action, chiffres, à faire, conversations @a11y", async ({
  page,
}) => {
  await signIn(page, "seller_a", dashboard(1));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ma vente");
  await expect(page.getByText("Bonjour Alice", { exact: true })).toBeVisible();

  // The header: the property, its price and its publication, its step, its plan.
  const top = header(page);
  await expect(top.getByText("Appartement 3 pièces avec balcon, proche gare")).toBeVisible();
  await expect(top.getByText(/^239\s000\s€ · publié le \d{1,2} \S+$/)).toBeVisible();
  // Its status: under the title on a phone, on the right from 768 px.
  await expect(top.getByText("En ligne", { exact: true }).filter({ visible: true })).toHaveCount(1);
  const progress = top.getByRole("progressbar");
  await expect(progress).toHaveAccessibleName("Étape 3 sur 6 · Gérer mes contacts et mes visites");
  await expect(top.getByText("Accompagné", { exact: true })).toBeVisible();

  // Nothing waits for the seller (both contacts answered, the visits come
  // with lot 3): the listing as buyers see it.
  const next = nextAction(page);
  await expect(next.getByText("Gérer mes contacts et mes visites")).toBeVisible();
  await expect(next.getByRole("link", { name: "Voir l'annonce en ligne" })).toHaveAttribute(
    "href",
    /^\/annonce\/.+lk0001$/,
  );

  // Its figures: views of the last 7 days, two contacts, one qualified (Chloé).
  const figures = page.getByRole("region", { name: "Votre annonce en chiffres" });
  await expect(figures).toContainText(/\d+ vues · 7 j/);
  await expect(figures).toContainText("2 contacts");
  await expect(figures).toContainText("1 qualifié");

  // « À faire »: the tasks of the step in Accompagné, the first contact
  // ticked by the engine, the last one by the advisor.
  const todo = page.getByRole("region", { name: "À faire" });
  const tasks = todo.getByRole("listitem");
  await expect(tasks).toHaveCount(4);
  await expect(tasks.nth(0)).toContainText("Fait : Premier contact reçu");
  await expect(tasks.nth(1)).toContainText("Créneaux de visite ouverts");
  await expect(tasks.nth(3)).toContainText("Point sur les retours de visite avec le conseiller");
  await expect(tasks.nth(3)).toContainText("Par votre conseiller Leenkey");

  // The last conversations, the latest first, each to its thread.
  const conversations = page.getByRole("region", { name: "Conversations" });
  const rows = conversations.getByRole("link", { name: /^(David|Chloé)/ });
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("David");
  await expect(rows.nth(0)).toHaveAttribute(
    "href",
    "/messages/5eed2000-0000-4000-8000-000000000012",
  );
  await expect(rows.nth(1)).toContainText("Chloé");
  await expect(
    conversations.getByRole("link", { name: "Toutes les conversations" }),
  ).toHaveAttribute("href", "/messages");

  // Then the properties of the seller.
  await expect(page.getByRole("heading", { level: 2, name: "Vos biens" })).toBeVisible();
  // Nothing wider than the screen (the previews cut at the end of their line).
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect(await seriousViolations(page)).toEqual([]);

  // « Toutes les étapes »: the six steps of the plan, the current one marked.
  await todo.getByRole("link", { name: "Toutes les étapes" }).click();
  await expect(page).toHaveURL(`/vendeur/biens/${property(1)}/etapes`);
  await expect(
    page
      .getByRole("navigation", { name: "Rubriques de votre bien" })
      .getByRole("link", { name: "Étapes" }),
  ).toHaveAttribute("aria-current", "page");
  const steps = page.getByRole("main").getByRole("heading", { level: 3 });
  await expect(steps).toHaveCount(6);
  await expect(steps.nth(2)).toHaveText("Étape 3 sur 6 · Gérer mes contacts et mes visites");
  await expect(
    page.getByRole("region", { name: "Étape 3 sur 6 · Gérer mes contacts et mes visites" }),
  ).toHaveAttribute("aria-current", "step");
  // The later steps wait for this one: nothing to tick there yet.
  await expect(
    page.getByRole("region", { name: /^Étape 5 sur 6/ }).getByRole("button"),
  ).toHaveCount(0);
  expect(await seriousViolations(page)).toEqual([]);
});

test("plusieurs biens : le sélecteur sous la salutation change le bien du tableau de bord", async ({
  page,
}) => {
  await signIn(page, "seller_a", dashboard(1));
  const top = header(page);
  await top.getByRole("button", { name: "Changer de bien" }).click();
  const menu = page.getByRole("menu", { name: "Changer de bien" });
  const items = menu.getByRole("menuitem");
  await expect(items.first()).toBeVisible();
  // The seven properties of seller_a in the seed, at least (others may be added).
  expect(await items.count()).toBeGreaterThanOrEqual(7);
  await expect(menu.locator('[aria-current="page"]')).toHaveText(
    /Appartement 3 pièces avec balcon, proche gare/,
  );
  expect(await seriousViolations(page)).toEqual([]);

  await items.filter({ hasText: "Maison familiale 5 pièces avec jardin" }).click();
  await expect(page).toHaveURL(dashboard(2));
  await expect(top.getByText("Maison familiale 5 pièces avec jardin")).toBeVisible();
  await expect(top.getByText("Autonomie", { exact: true })).toBeVisible();
  // Escape closes the menu and gives the focus back to its button.
  await top.getByRole("button", { name: "Changer de bien" }).click();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(top.getByRole("button", { name: "Changer de bien" })).toBeFocused();
});

test("une annonce refusée, puis une annonce en relecture : la prochaine action le dit", async ({
  page,
}) => {
  await signIn(page, "seller_b", dashboard(16));
  await expect(page.getByText("Bonjour Bruno", { exact: true })).toBeVisible();
  const next = nextAction(page);
  await expect(next.getByText("Corrigez votre annonce")).toBeVisible();
  // The remark of Leenkey, word for word.
  await expect(next.getByText(/^La description est trop courte pour être publiée/)).toBeVisible();
  await expect(next.getByRole("link", { name: "Corriger l'annonce" })).toHaveAttribute(
    "href",
    new RegExp(`^/vendeur/biens/${property(16)}/`),
  );
  await expect(next.getByRole("link", { name: "Voir le bien" })).toHaveAttribute(
    "href",
    `/vendeur/biens/${property(16)}`,
  );
  await expect(
    header(page).getByText("À corriger", { exact: true }).filter({ visible: true }),
  ).toHaveCount(1);
  expect(await seriousViolations(page)).toEqual([]);

  await page.goto(dashboard(15));
  await expect(nextAction(page).getByText("Nous relisons votre annonce")).toBeVisible();
  await expect(
    nextAction(page).getByText("Nous la relisons sous 24 h et vous prévenons par email."),
  ).toBeVisible();
  await expect(header(page).getByRole("progressbar")).toHaveAccessibleName(
    "Étape 2 sur 6 · Créer et publier mon annonce",
  );

  // A property that is not theirs: their own sale, never an error.
  await page.goto(dashboard(1));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ma vente");
  await expect(header(page).getByText("Appartement 3 pièces avec balcon, proche gare")).toHaveCount(
    0,
  );
});
