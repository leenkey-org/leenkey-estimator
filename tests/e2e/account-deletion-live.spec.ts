import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// L2-10: « Mes données » on a new account, with the real emails of the local
// stack: the export downloaded (a JSON file of what the account holds), then
// the deletion (what happens explained, the password and a box first), every
// session closed, the sign-in refused afterwards. An admin account is closed
// by the team. The anonymisation 30 days later: supabase/tests/
// rls_account_deletion.sql and tests/unit/account/anonymize.test.ts. Local
// stack only (project « seed-mutations »): the spec signs an account up and
// closes it.

const MAILPIT_URL = process.env.MAILPIT_URL;
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !MAILPIT_URL || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale requise (MAILPIT_URL, SEED_PASSWORD, E2E_MUTATE=1) : la spec crée un compte et le supprime",
);
test.describe.configure({ mode: "serial" });

async function emailLink(to: string, subject: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}" subject:"${subject}"`)}`,
    );
    const { messages } = (await search.json()) as { messages?: Array<{ ID: string }> };
    if (messages && messages.length > 0) {
      const message = (await (
        await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)
      ).json()) as { HTML: string };
      const href = message.HTML.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no "${subject}" email for ${to}`);
}

const email = `camille.${Date.now()}@exemple.test`;
const password = "Verger-91-Savigny";

async function signIn(page: Page, address: string, secret: string, path = "/compte") {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(address);
  await page.getByLabel("Mot de passe").fill(secret);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
  }
  await expect(page).toHaveURL(path);
}

const opened: BrowserContext[] = [];

async function newPage(browser: Browser, viewport = { width: 1280, height: 900 }): Promise<Page> {
  const context = await browser.newContext({ viewport });
  opened.push(context);
  return context.newPage();
}

test.afterAll(async () => {
  await Promise.all(opened.map((context) => context.close()));
});

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

test("inscription d'un acquéreur", async ({ page, browser }) => {
  test.slow();
  await page.goto("/inscription");
  await page.getByText("J'achète").click();
  await page.getByLabel("Prénom et nom").fill("Camille Roux");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();
  const other = await newPage(browser);
  await other.goto(await emailLink(email, "Confirmez votre adresse email"));
  await other.getByRole("button", { name: "Confirmer mon adresse" }).click();
  await expect(other).toHaveURL(/\/acquereur/);
});

test("« Télécharger mes données » : un fichier JSON de ce que contient le compte", async ({
  browser,
}) => {
  const page = await newPage(browser);
  await signIn(page, email, password);
  const data = page.getByRole("region", { name: "Mes données" });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    data.getByRole("link", { name: /Télécharger mes données/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^leenkey-mes-donnees-\d{4}-\d{2}-\d{2}\.json$/);
  const file = JSON.parse(await readFile((await download.path()) ?? "", "utf8")) as Record<
    string,
    unknown
  >;
  expect(file.account).toMatchObject({ email });
  expect(file.profile).toMatchObject({ first_name: "Camille", last_name: "Roux" });
  for (const key of ["buyer_profile", "offers_sent", "messages", "favorites", "notifications"]) {
    expect(file).toHaveProperty(key);
  }
});

test("la suppression du compte, à 390 px : expliquée, confirmée, puis la connexion refusée", async ({
  browser,
}) => {
  test.slow();
  // Another device, signed in before: closed with the others.
  const elsewhere = await newPage(browser);
  await signIn(elsewhere, email, password, "/acquereur");

  const page = await newPage(browser, { width: 390, height: 844 });
  await signIn(page, email, password);
  await page.getByRole("link", { name: /Supprimer mon compte/ }).click();
  await expect(page).toHaveURL("/compte/supprimer");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Supprimer mon compte");
  for (const section of ["Tout de suite", "Au bout de 30 jours", "Ce que nous gardons"]) {
    await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
  }
  await expect(page.getByText("que la loi nous impose de garder 10 ans")).toBeVisible();
  await expect(page.getByRole("link", { name: "Télécharger mes données" })).toHaveAttribute(
    "href",
    "/compte/export",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => violation.id),
  ).toEqual([]);
  await shots(page, "account-deletion");

  // Nothing without the password and the box.
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page.getByText("Indiquez votre mot de passe.")).toBeVisible();
  await expect(page.getByText("Cochez la case pour confirmer.")).toBeVisible();
  await page.getByLabel("Mot de passe").fill("pas-le-bon-mot");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page.getByText("Ce mot de passe n'est pas le bon.")).toBeVisible();

  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page).toHaveURL("/connexion?compte=ferme");
  await expect(page.getByText("Votre compte est fermé.")).toBeVisible();

  // The other device is signed out.
  await elsewhere.goto("/compte");
  await expect(elsewhere).toHaveURL(/\/connexion\?next=%2Fcompte/);

  // The sign-in is refused, and leaves no session.
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Ce compte est fermé.")).toBeVisible();
  await page.goto("/compte");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fcompte/);
});

test("un compte de l'équipe ne se supprime pas depuis la page", async ({ browser }) => {
  const page = await newPage(browser);
  await signIn(page, "admin@test.leenkey.fr", SEED_PASSWORD ?? "");
  await expect(page.getByRole("region", { name: "Mes données" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Supprimer mon compte/ })).toHaveCount(0);
  await page.goto("/compte/supprimer");
  await expect(page.getByText("Un compte de l'équipe Leenkey se ferme par l'équipe")).toBeVisible();
  await expect(page.getByLabel("Mot de passe")).toHaveCount(0);
});
