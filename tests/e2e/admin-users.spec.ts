import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Page } from "@playwright/test";
import { consentValue } from "./google";

// L1-30a: the dashboard and the users of the back office, on the seed. The
// suspension test signs a new account up, suspends it and lifts the
// suspension; the other tests only read. Seed accounts are never suspended
// here (other specs sign them in). Runs only on a local stack just made by
// `scripts/local-stack.sh up`, with E2E_SEED=1, SEED_PASSWORD and
// E2E_MUTATE=1, never on the preprod (project « seed-mutations »). The 404
// of these pages for any other account: tests/e2e/navigation.spec.ts.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec crée un compte et le suspend",
);
test.describe.configure({ mode: "serial" });

/** Signs the admin in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill("admin@test.leenkey.fr");
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

const feedback = (page: Page, text: string | RegExp) =>
  page.getByRole("status").filter({ hasText: text });

// Local stack: no RESEND_API_KEY, or one with EMAIL_TEST_INBOX (.env.local).
const EMAIL_NOTE = /Email non envoyé : environnement local\.|Email envoyé à la boîte de test/;

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test("tableau de bord : compteurs, « À traiter », aucun écart d'accessibilité", async ({
  page,
}) => {
  await signIn(page, "/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Tableau de bord" })).toBeVisible();
  await expect(page.getByText("Bonjour Cédric, voici ce qui vous attend.")).toBeVisible();

  const tiles = page.getByRole("list", { name: "Chiffres du back office" });
  for (const label of [
    "Annonces à valider",
    "Dossiers ouverts",
    "Signalements ouverts",
    "Messages clients non lus",
    "Formules vendues · 30 j",
    "Inscriptions · 30 j",
  ]) {
    await expect(tiles.getByText(label, { exact: true })).toBeVisible();
  }
  // The seed has listings waiting for a review: the oldest with the 24 h target.
  await expect(tiles.getByText(/Plus ancienne : .* · (objectif|au-delà de) 24\sh/)).toBeVisible();

  // The sidebar counts what waits (one read with the dashboard).
  const sidebar = page.getByRole("navigation", { name: "Navigation du back office" });
  await expect(sidebar.getByRole("link", { name: /^Annonces/ })).toContainText(/\d/);

  const todo = page.getByRole("region", { name: "À traiter" });
  await expect(
    todo.getByText("Ce qui attend l'équipe, du plus ancien au plus récent."),
  ).toBeVisible();
  const first = todo.getByRole("link").first();
  await expect(first).toContainText(/(Annonce à valider|Dossier|Signalement) · En attente depuis/);

  // A listing to review opens on its page.
  const listing = todo.getByRole("link").filter({ hasText: "Annonce à valider" }).first();
  const href = await listing.getAttribute("href");
  expect(href).toMatch(/^\/admin\/annonces\/[0-9a-f-]{36}$/);
  await expectNoSeriousViolation(page);
  await listing.click();
  await expect(page).toHaveURL(href ?? "");

  // The tile of the listings opens the list of those to review.
  await page.goto("/admin");
  await tiles.getByRole("link").filter({ hasText: "Annonces à valider" }).click();
  await expect(page).toHaveURL("/admin/annonces?statut=a-valider");
});

test("téléphone : trois tuiles sous le titre", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
    baseURL,
  });
  await context.addCookies([
    { name: "lk_consent", value: consentValue(false), url: baseURL ?? "" },
  ]);
  const page = await context.newPage();
  await signIn(page, "/admin");
  const header = page.getByRole("navigation", { name: "Compteurs du back office" });
  await expect(header.getByRole("link")).toHaveCount(3);
  await expect(header.getByRole("link", { name: /À valider/ })).toHaveAttribute(
    "href",
    "/admin/annonces?statut=a-valider",
  );
  await expect(header.getByRole("link", { name: /Dossiers/ })).toHaveAttribute(
    "href",
    "/admin/dossiers",
  );
  await expect(header.getByRole("link", { name: /Signalements/ })).toHaveAttribute(
    "href",
    "/admin/signalements",
  );
  // Nothing wider than the screen.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.goto("/admin/utilisateurs?q=buyer_c%40test.leenkey.fr");
  const cards = page.getByRole("list", { name: "Comptes" });
  await expect(cards.getByRole("link")).toHaveCount(1);
  await expect(cards.getByRole("link")).toContainText("buyer_c@test.leenkey.fr");
  await expect(page.getByRole("table", { name: "Comptes" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectNoSeriousViolation(page);

  // 768 px: the sidebar, still the cards (the table from 1 024 px).
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("navigation", { name: "Navigation du back office" })).toBeVisible();
  await expect(cards.getByRole("link")).toHaveCount(1);
  await expect(page.getByRole("table", { name: "Comptes" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
  await context.close();
});

test("utilisateurs : recherche, filtres, fiche d'un compte", async ({ page }) => {
  await signIn(page, "/admin/utilisateurs");
  await expect(page.getByRole("heading", { level: 1, name: "Utilisateurs" })).toBeVisible();
  const filters = page.getByRole("navigation", { name: "Type de compte" });
  await expect(filters.getByRole("link", { name: /^Tous/ })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Team filter: the admin only, with its role badge.
  await filters.getByRole("link", { name: /^Équipe/ }).click();
  await expect(page).toHaveURL("/admin/utilisateurs?filtre=equipe");
  const table = page.getByRole("table", { name: "Comptes" });
  await expect(table.getByText("admin@test.leenkey.fr")).toBeVisible();
  await expect(table.getByText("seller_a@test.leenkey.fr")).toHaveCount(0);

  // A search keeps the filter; another one finds nothing, then all again.
  await page.getByRole("searchbox", { name: "Rechercher un compte" }).fill("nobody-here");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await expect(page).toHaveURL("/admin/utilisateurs?filtre=equipe&q=nobody-here");
  await expect(page.getByText("Aucun compte ne correspond à « nobody-here ».")).toBeVisible();
  await page.getByRole("link", { name: "Voir tous les comptes" }).click();
  await expect(page).toHaveURL("/admin/utilisateurs");

  // The sheet of a seller: their properties, the conversations without their messages.
  await page.getByRole("searchbox", { name: "Rechercher un compte" }).fill("seller_a@test");
  await page.getByRole("button", { name: "Rechercher" }).click();
  const sellerRow = table.locator("tbody tr").filter({ hasText: "seller_a@test.leenkey.fr" });
  await expect(sellerRow).toHaveCount(1);
  await expect(sellerRow.getByText("Vendeur", { exact: true })).toBeVisible();
  await sellerRow.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/admin\/utilisateurs\/[0-9a-f-]{36}$/);
  const info = page.getByRole("region", { name: "Informations" });
  await expect(info).toContainText("seller_a@test.leenkey.fr");
  // Read in auth.users (admin_user_contact): the seed accounts are confirmed.
  await expect(info.getByText("Email confirmé", { exact: true })).toBeVisible();
  const properties = page.getByRole("region", { name: "Biens" });
  await expect(properties.getByRole("listitem").first()).toBeVisible();
  await expect(properties.getByRole("link").first()).toHaveAttribute(
    "href",
    /^\/admin\/annonces\/[0-9a-f-]{36}$/,
  );
  const conversations = page.getByRole("region", { name: "Conversations" });
  await expect(
    conversations.getByText(
      "Les métadonnées seulement : le contenu des messages n'est lu qu'en cas de signalement.",
    ),
  ).toBeVisible();
  // Who the seller talks with, never what they wrote (seed conversations of LK-0001).
  await expect(
    conversations.getByText("Échange avec David Moreau, acquéreur").first(),
  ).toBeVisible();
  await expect(conversations.getByText(/Dernier message : /).first()).toBeVisible();
  await expect(page.getByRole("group", { name: /Décisions sur le compte de/ })).toBeVisible();
  await expectNoSeriousViolation(page);

  // Their own account: no suspension.
  await page.goto("/admin/utilisateurs?filtre=equipe");
  await table
    .locator("tbody tr")
    .filter({ hasText: "admin@test.leenkey.fr" })
    .getByRole("link")
    .first()
    .click();
  await expect(
    page.getByText("C'est votre compte : vous ne pouvez pas le suspendre."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Suspendre le compte" })).toHaveCount(0);

  // An unknown sheet is a 404.
  expect(
    (await page.request.get("/admin/utilisateurs/00000000-0000-4000-8000-000000000000")).status(),
  ).toBe(404);
  expect((await page.request.get("/admin/utilisateurs/pas-un-id")).status()).toBe(404);
});

test("suspendre un nouveau compte avec un motif, puis le réactiver", async ({
  page,
  browser,
  baseURL,
}) => {
  // A new account, so that no seed account used elsewhere is suspended.
  const email = `suspendu.${Date.now()}@exemple.test`;
  const visitorContext = await browser.newContext({ baseURL });
  await visitorContext.addCookies([
    { name: "lk_consent", value: consentValue(false), url: baseURL ?? "" },
  ]);
  const visitor = await visitorContext.newPage();
  await visitor.goto("/inscription");
  await visitor.getByLabel("Prénom et nom").fill("Sacha Suspendu");
  await visitor.getByLabel("Email").fill(email);
  await visitor.getByLabel("Mot de passe").fill("Maison-91-Savigny");
  await visitor.getByRole("checkbox").check();
  await visitor.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(visitor.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();
  await visitor.context().close();

  await signIn(page, `/admin/utilisateurs?q=${encodeURIComponent(email)}`);
  const table = page.getByRole("table", { name: "Comptes" });
  const accountRow = table.locator("tbody tr").filter({ hasText: email });
  await expect(accountRow).toHaveCount(1);
  await expect(accountRow.getByText("Actif", { exact: true })).toBeVisible();
  await accountRow.getByRole("link", { name: "Voir la fiche de Sacha Suspendu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sacha Suspendu" })).toBeVisible();
  await expect(page.getByText("Email non confirmé")).toBeVisible();
  await expect(page.getByText("Aucune décision pour l'instant.")).toBeVisible();

  // The motive is required; a template fills it.
  const opener = page.getByRole("button", { name: "Suspendre le compte" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Suspendre le compte" });
  await expect(dialog).toContainText("ses annonces restent en ligne");
  await dialog.getByRole("button", { name: "Suspendre le compte" }).click();
  await expect(dialog.getByText("Le motif doit faire au moins 3 caractères.")).toBeVisible();
  await dialog.getByRole("button", { name: "Informations du compte inexactes." }).click();
  await expect(dialog.getByLabel("Motif envoyé au titulaire du compte")).toHaveValue(
    "Informations du compte inexactes.",
  );
  await dialog.getByRole("button", { name: "Suspendre le compte" }).click();
  await expect(dialog).toBeHidden();
  await expect(feedback(page, "Compte suspendu.")).toContainText(EMAIL_NOTE);

  // The sheet: the badge, the motive, the history.
  await expect(page.getByText("Suspendu", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Motif de la suspension")).toBeVisible();
  const history = page.getByRole("region", { name: "Historique" });
  await expect(history.getByText("Compte suspendu")).toBeVisible();
  await expect(history.getByText("Motif : Informations du compte inexactes.")).toBeVisible();
  await expect(history.getByText("Compte suspendu par Cédric")).toBeVisible();

  // The « Suspendus » filter lists it.
  await page.goto(`/admin/utilisateurs?filtre=suspendus&q=${encodeURIComponent(email)}`);
  await expect(table.locator("tbody tr").filter({ hasText: email })).toHaveCount(1);
  await table.getByRole("link", { name: "Voir la fiche de Sacha Suspendu" }).click();

  // Lift the suspension: no email, the history keeps both decisions.
  await page.getByRole("button", { name: "Réactiver le compte" }).click();
  await expect(feedback(page, "Compte réactivé.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Suspendre le compte" })).toBeVisible();
  await expect(page.getByText("Motif de la suspension")).toHaveCount(0);
  await expect(history.getByText("Compte réactivé")).toBeVisible();
  await expect(history.getByText("Compte suspendu")).toBeVisible();
  await page.goto(`/admin/utilisateurs?filtre=suspendus&q=${encodeURIComponent(email)}`);
  await expect(page.getByText(`Aucun compte ne correspond à « ${email} ».`)).toBeVisible();
});
