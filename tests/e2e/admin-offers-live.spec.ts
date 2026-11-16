import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L2-07: the offers in the back office (SPEC-V2 section 17) and the tool
// summarize_offer of the assistant of the seller (section 12). buyer_c
// (Chloé, project declared in the seed) makes an offer on LK-0008, the house
// of seller_b in Sainte-Geneviève-des-Bois (489 000 €, plan Sérénité);
// seller_b reads it with the assistant, then accepts it; the team is told,
// reads the offer, ticks « Offre analysée avec le conseiller » and records
// the avant-contrat in the place of the seller. The offer stays: this spec
// changes the seed for good, and moves the sale of LK-0008 that other specs
// read: project « seed-offers », after « seed-mutations »
// (playwright.config.ts). Needs E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1 and
// a local stack.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec envoie une offre",
);

// One offer, read by everyone in turn: the tests of this file run one after the other.
test.describe.configure({ mode: "serial" });

const LISTING = "/annonce/maison-6-pieces-sainte-genevieve-des-bois-lk0008";
/** Its property, in the seed. */
const PROPERTY = "5eed1000-0000-4000-8000-000000000008";

let offerId = "";
let reference = "";

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => violation.id),
  ).toEqual([]);
}

/** Signs a seed account in, accepts the terms when asked, and lands on `path`. */
async function signIn(
  page: Page,
  account: "seller_a" | "seller_b" | "buyer_c" | "admin",
  path: string,
) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  // A listing is public: the terms are asked on a page of the signed-in areas.
  await page.goto("/compte");
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page
      .waitForURL((url) => url.pathname !== "/conditions", { timeout: 5_000 })
      .catch(() => {
        // Accepted by a parallel test in between: the page itself opens now.
      });
  }
  await page.goto(path);
}

/** Captures at 390, 768 and 1 280 px when SHOTS_DIR is set (the review of the screens). */
async function shots(page: Page, name: string) {
  const directory = process.env.SHOTS_DIR;
  if (!directory) return;
  const size = page.viewportSize();
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `${directory}/${name}-${width}.png`, fullPage: true });
  }
  if (size) await page.setViewportSize(size);
}

const bell = (page: Page) =>
  page.getByRole("button", { name: /^Notifications/ }).locator("visible=true");
const bellPanel = (page: Page) => page.getByRole("dialog", { name: "Notifications" });
const step = (page: Page, label: string) => page.getByRole("progressbar", { name: label });
const next = (page: Page) => page.getByRole("button", { name: "Continuer" });
const feedback = (page: Page, text: string | RegExp) =>
  page.getByRole("status").filter({ hasText: text });
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

test("une acquéreuse envoie une offre sur un bien en formule Sérénité", async ({ page }) => {
  await signIn(page, "buyer_c", LISTING);
  await page.getByRole("link", { name: "Faire une offre" }).click();
  await page.waitForURL((address) => address.pathname === "/offres/nouvelle");

  await expect(step(page, "Étape 1 sur 7 · L'acquéreur")).toBeVisible();
  await page.getByLabel("Date de naissance").fill("1990-06-15");
  await page.getByLabel("Adresse").fill("8 rue des Écoles");
  await page.getByLabel("Code postal").fill("91600");
  await page.getByLabel("Ville").fill("Savigny-sur-Orge");
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page.getByLabel("Acquisition envisagée").selectOption("own_name");
  await next(page).click();

  await expect(step(page, "Étape 2 sur 7 · Le bien concerné")).toBeVisible();
  await page.getByRole("link", { name: "Continuer" }).click();

  await expect(step(page, "Étape 3 sur 7 · Mon offre")).toBeVisible();
  await page.getByLabel("Prix proposé").fill("470 000");
  await next(page).click();

  await expect(step(page, "Étape 4 sur 7 · Financement")).toBeVisible();
  await page.locator("label").filter({ hasText: "Sans prêt" }).click();
  await next(page).click();

  await expect(step(page, "Étape 5 sur 7 · Conditions de l'offre")).toBeVisible();
  await next(page).click();

  await expect(step(page, "Étape 6 sur 7 · Durée de validité")).toBeVisible();
  await next(page).click();

  await expect(step(page, "Étape 7 sur 7 · Déclarations et envoi")).toBeVisible();
  await page.locator("label").filter({ hasText: "Bien visité" }).click();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Relire mon offre" }).click();
  await expect(step(page, "Relecture de votre offre")).toBeVisible();
  await page.getByRole("button", { name: "Envoyer mon offre au vendeur" }).click();
  await page.waitForURL((address) => /^\/offres\/[0-9a-f-]{36}$/.test(address.pathname));
  offerId = new URL(page.url()).pathname.split("/")[2] ?? "";
  const document = page.getByRole("article").filter({ hasText: "OFFRE D'ACHAT LEENKEY" });
  reference = /LK-\d{4}-\d{5}/.exec(await document.innerText())?.[0] ?? "";
  expect(reference).not.toBe("");
});

test("le vendeur lit ses offres reçues avec l'assistant, puis accepte", async ({ page }) => {
  expect(offerId).not.toBe("");
  await signIn(page, "seller_b", `/assistant?bien=${PROPERTY}`);
  const thread = page.getByRole("log", { name: "Conversation avec l'assistant" });
  const intro = page.getByText("Posez vos questions sur votre vente");
  // A new conversation: a click before the page is hydrated does nothing, clicked again until it does.
  await expect(async () => {
    await page.getByRole("button", { name: "Nouvelle conversation" }).click();
    await expect(intro).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByLabel("Votre question").fill("Que disent les offres reçues ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  // The test model says what summarize_offer gave it: the offers of this property, their price.
  await expect(
    thread.getByText(
      /^Vous avez reçu 1 offre\(s\) pour ce bien\. La plus récente propose 470\s000\s€\.$/,
    ),
  ).toBeVisible();
  // A reading: nothing to confirm.
  await expect(thread.getByRole("button", { name: "Confirmer" })).toHaveCount(0);
  await shots(page, "seller-assistant-offers");

  await page.goto(`/offres/${offerId}`);
  // Sérénité: no plan proposed, never (L2-09, SPEC 11 bis).
  await expect(page.getByRole("button", { name: "Masquer cette proposition" })).toHaveCount(0);
  await page.getByRole("link", { name: "Accepter l'offre" }).click();
  await page.waitForURL((address) => address.pathname === `/offres/${offerId}/accepter`);
  await page
    .getByLabel("J'ai lu l'intégralité de l'offre et souhaite confirmer mon acceptation.")
    .check();
  await page.getByRole("button", { name: "Confirmer mon acceptation" }).click();
  await page.waitForURL((address) => address.pathname === `/offres/${offerId}`);
  await expect(
    page.getByText(/^Vous avez accepté cette offre le \d{2}\/\d{2}\/\d{4}/),
  ).toBeVisible();
});

test("back office : l'équipe est prévenue, lit l'offre, la marque analysée et enregistre l'avant-contrat", async ({
  page,
}) => {
  expect(offerId).not.toBe("");
  await signIn(page, "admin", "/admin/offres");
  await expect(page.getByRole("heading", { level: 1, name: "Offres" })).toBeVisible();

  await test.step("la cloche : une offre acceptée sur une vente accompagnée", async () => {
    await bell(page).click();
    const notice = bellPanel(page)
      .getByRole("link")
      .filter({ hasText: "Offre acceptée sur une vente avec conseiller" })
      .first();
    await expect(notice).toContainText(/470\s000\s€/);
    await expect(notice).toContainText("LK-0008");
    await expect(notice).toHaveAttribute("href", `/admin/offres/${offerId}`);
    await page.keyboard.press("Escape");
  });

  await test.step("la liste : les filtres, la recherche, jamais un brouillon", async () => {
    const table = page.getByRole("table", { name: "Offres" });
    const row = table.locator("tbody tr").filter({ hasText: reference });
    await expect(row).toContainText("Chloé Dubois");
    await expect(row).toContainText("LK-0008");
    await expect(row).toContainText("Sainte-Geneviève-des-Bois");
    await expect(row).toContainText(/470\s000\s€/);
    await expect(row).toContainText(/−19\s000\s€ · −3,9\s%/);
    await expect(row).toContainText("Acceptée");
    await expect(row).toContainText("Sérénité");
    // Beside the menu at 1 280 px, the table shows all its columns: nothing to scroll sideways.
    expect(
      await table.evaluate((element) => {
        const box = element.parentElement;
        return box ? box.scrollWidth <= box.clientWidth : false;
      }),
    ).toBe(true);
    await expectNoSeriousViolation(page);
    await shots(page, "admin-offers-list");

    await page.getByRole("link", { name: /^Acceptées/ }).click();
    await expect(page).toHaveURL("/admin/offres?statut=acceptees");
    await expect(table.locator("tbody tr").filter({ hasText: reference })).toHaveCount(1);
    await page.getByRole("link", { name: /^Refusées/ }).click();
    await expect(page).toHaveURL("/admin/offres?statut=refusees");
    await expect(page.getByText(reference)).toHaveCount(0);

    await page.goto("/admin/offres");
    await page.getByLabel("Rechercher une offre").fill(reference);
    await page.getByRole("button", { name: "Rechercher" }).click();
    await expect(page).toHaveURL(`/admin/offres?q=${reference}`);
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await page.goto("/admin/offres?q=introuvable-zzz");
    await expect(page.getByText("Aucune offre ne correspond à « introuvable-zzz ».")).toBeVisible();

    // On a phone: cards, and a page never wider than the screen.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/offres");
    const card = page
      .getByRole("list", { name: "Offres" })
      .getByRole("link")
      .filter({ hasText: reference });
    await expect(card).toContainText("Chloé Dubois");
    await expect(card).toContainText("Sérénité");
    await expect(card).toHaveAttribute("href", `/admin/offres/${offerId}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await test.step("la fiche : lecture seule, la synthèse du vendeur, le document, le PDF, le journal", async () => {
    await page.goto(`/admin/offres/${offerId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`Offre ${reference}`);
    const facts = page.getByRole("region", { name: "Offre", exact: true });
    await expect(facts).toContainText("Acceptée");
    await expect(facts).toContainText("Sérénité");
    await expect(facts).toContainText("Chloé Dubois");
    await expect(facts).toContainText("LK-0008 · Sainte-Geneviève-des-Bois");
    await expect(facts).toContainText("Lecture seule");
    // Never an answer in the place of the seller.
    await expect(page.getByRole("link", { name: "Accepter l'offre" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Refuser l'offre" })).toHaveCount(0);

    const summary = page.getByRole("region", { name: "Synthèse lue par le vendeur" });
    await expect(summary).toContainText(/470\s000\s€/);
    await expect(summary).toContainText("Analyse Leenkey");
    await expect(summary).not.toContainText(/financement validé/i);
    const document = page.getByRole("article").filter({ hasText: "OFFRE D'ACHAT LEENKEY" });
    await expect(document).toContainText("8 rue des Écoles");
    const history = page.getByRole("region", { name: "Historique" });
    await expect(history).toContainText("Offre envoyée");
    await expect(history).toContainText("Offre acceptée par le vendeur");
    const pdf = await page.request.get(`/offres/${offerId}/pdf`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    await expectNoSeriousViolation(page);
    await shots(page, "admin-offer-sheet");
  });

  await test.step("« Marquer comme analysée » coche la tâche de la vente, une seule fois", async () => {
    const analysis = page.getByRole("region", { name: "Analyse avec le conseiller" });
    await analysis.getByRole("button", { name: "Marquer comme analysée" }).click();
    await expect(
      feedback(page, "La tâche « Offre analysée avec le conseiller » est cochée sur la vente."),
    ).toBeVisible();
    await expect(analysis).toContainText(
      /Offre analysée avec le conseiller le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}\./,
    );
    await expect(analysis.getByRole("button", { name: "Marquer comme analysée" })).toHaveCount(0);
  });

  await test.step("l'avant-contrat, enregistré à la place du vendeur (formule avec suivi jusqu'à la signature)", async () => {
    const section = page.getByRole("region", { name: "Avant-contrat" });
    await expect(section).toContainText("Aucun avant-contrat enregistré pour cette offre.");
    await section.getByLabel("Date de signature de l'avant-contrat").fill(today());
    await section.getByRole("button", { name: "Enregistrer" }).click();
    await expect(section).toContainText(/Avant-contrat signé le \d{2}\/\d{2}\/\d{4}\./);
    await expect(page.getByRole("region", { name: "Historique" })).toContainText(/avant-contrat/i);
    await shots(page, "admin-offer-sheet-done");
  });

  await test.step("la fiche du compte mène à ses offres", async () => {
    await page
      .getByRole("region", { name: "Offre", exact: true })
      .getByRole("link", { name: "Chloé Dubois" })
      .click();
    await page.waitForURL((address) =>
      /^\/admin\/utilisateurs\/[0-9a-f-]{36}$/.test(address.pathname),
    );
    await page.getByRole("link", { name: "Voir ses offres" }).click();
    await page.waitForURL((address) => address.pathname === "/admin/offres");
    expect(new URL(page.url()).searchParams.get("compte")).toMatch(/^[0-9a-f-]{36}$/);
    await expect(page.getByText("Offres envoyées ou reçues par ce compte.")).toBeVisible();
    await expect(
      page
        .getByRole("table", { name: "Offres" })
        .locator("tbody tr")
        .filter({ hasText: reference }),
    ).toHaveCount(1);
  });
});

test("le vendeur voit la tâche cochée ; personne d'autre n'ouvre le back office des offres", async ({
  page,
  browser,
  baseURL,
}) => {
  expect(offerId).not.toBe("");
  await signIn(page, "seller_b", `/vendeur/biens/${PROPERTY}/etapes`);
  // The task of the team, ticked on the step of the offers of the sale.
  const offers = page
    .getByRole("main")
    .getByRole("region", { name: "Étape 4 sur 6 · Recevoir et négocier mes offres" });
  const task = offers
    .getByRole("listitem")
    .filter({ hasText: "Offre analysée avec le conseiller" });
  await expect(task).toContainText(/Fait/);
  // The offers of the back office do not exist for a seller, nor for a visitor.
  expect((await page.goto("/admin/offres"))?.status()).toBe(404);
  expect((await page.goto(`/admin/offres/${offerId}`))?.status()).toBe(404);

  const anonymous = await browser.newContext({ baseURL });
  const visitor = await anonymous.newPage();
  await visitor.goto(`/admin/offres/${offerId}`);
  expect(new URL(visitor.url()).pathname).toBe("/connexion");
  await anonymous.close();
});
