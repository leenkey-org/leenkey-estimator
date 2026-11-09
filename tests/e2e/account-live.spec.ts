import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// L1-39: the changes of « Mon compte » on a new account, with the real emails
// of the local stack: informations, « Je vends » added, password (the current
// one checked, the other sessions closed), address confirmed from both
// addresses. Local stack only (project « seed-mutations »): the spec signs an
// account up and changes it.

const MAILPIT_URL = process.env.MAILPIT_URL;
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !MAILPIT_URL || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale requise (MAILPIT_URL, SEED_PASSWORD, E2E_MUTATE=1) : la spec crée un compte et le modifie",
);
test.describe.configure({ mode: "serial" });

/**
 * The link of the newest email to `to` with `subject`, once there are
 * `count` of them (Mailpit lists the newest first).
 */
async function emailLink(to: string, subject: string, count = 1): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}" subject:"${subject}"`)}`,
    );
    const { messages } = (await search.json()) as { messages?: Array<{ ID: string }> };
    if (messages && messages.length >= count) {
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

const stamp = Date.now();
const email = `dominique.${stamp}@exemple.test`;
const newEmail = `dominique.nouveau.${stamp}@exemple.test`;
const thirdEmail = `dominique.troisieme.${stamp}@exemple.test`;
const password = "Maison-91-Athis";
const newPassword = "Jardin-91-Juvisy";

async function signIn(page: Page, address: string, secret: string, path = "/compte") {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(address);
  await page.getByLabel("Mot de passe").fill(secret);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  // A seed account accepts the terms of the launch first.
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

const PHONE = { width: 390, height: 844 };

test("inscription d'un acquéreur", async ({ page, browser }) => {
  test.slow();
  await page.goto("/inscription");
  await page.getByText("J'achète").click();
  await page.getByLabel("Prénom et nom").fill("Dominique Petit");
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

test("informations, à 390 px : un prénom est demandé, puis retour au compte", async ({
  browser,
}) => {
  const page = await newPage(browser, PHONE);
  await signIn(page, email, password);
  await page.getByRole("link", { name: /Prénom et nom/ }).click();
  await expect(page).toHaveURL("/compte/informations");
  await expect(page.getByLabel("Prénom")).toHaveValue("Dominique");
  await expect(page.getByLabel(/^Nom/)).toHaveValue("Petit");

  await page.getByLabel("Prénom").fill(" ");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Indiquez votre prénom.")).toBeVisible();
  await expect(page.getByLabel("Prénom")).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Prénom").fill("Dominique");
  await page.getByLabel(/^Nom/).fill("Petit-Leroy");
  await page.getByLabel(/^Téléphone/).fill("06 98 76 54 32");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL("/compte");
  await expect(page.locator(":focus")).toContainText("Vos informations sont enregistrées.");
  await expect(page.getByRole("link", { name: /Prénom et nom/ })).toContainText(
    "Dominique Petit-Leroy",
  );
  await expect(page.getByRole("link", { name: /Téléphone/ })).toContainText("06 98 76 54 32");
});

test("« Je vends » ajouté au compte, à 390 px", async ({ browser }) => {
  const page = await newPage(browser, PHONE);
  await signIn(page, email, password);
  const spaces = page.getByRole("region", { name: "Mes espaces" });
  await spaces.getByRole("button", { name: "Ajouter « Je vends »" }).click();
  await expect(page.locator(":focus")).toContainText("« Je vends » est ajouté à votre compte.");
  await expect(spaces.getByRole("link", { name: /Je vends/ })).toHaveAttribute("href", "/vendeur");
  await page.reload();
  await expect(spaces.getByRole("link", { name: /Je vends/ })).toBeVisible();
  await expect(spaces.getByRole("button", { name: /Ajouter/ })).toHaveCount(0);
});

test("mot de passe : l'actuel est vérifié, les autres appareils sont déconnectés", async ({
  page,
  browser,
}) => {
  test.slow();
  // A session opened before, elsewhere.
  const elsewhere = await newPage(browser);
  await signIn(elsewhere, email, password);

  await signIn(page, email, password, "/compte/mot-de-passe");
  await page.getByLabel("Mot de passe actuel").fill("pas-le-bon-mot");
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirmez le nouveau mot de passe").fill(newPassword);
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page.getByText("Ce mot de passe n'est pas le bon.")).toBeVisible();

  await page.getByLabel("Mot de passe actuel").fill(password);
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirmez le nouveau mot de passe").fill("Autre-chose-91");
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page.getByText("Les deux mots de passe sont différents.")).toBeVisible();

  await page.getByLabel("Mot de passe actuel").fill(password);
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirmez le nouveau mot de passe").fill(newPassword);
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page).toHaveURL("/compte");
  await expect(page.locator(":focus")).toContainText(
    "Votre mot de passe est modifié. Vos autres appareils sont déconnectés.",
  );
  // This browser stays signed in; the other one is out.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mon compte");
  await elsewhere.goto("/compte");
  await expect(elsewhere).toHaveURL(/\/connexion/);

  const fresh = await newPage(browser);
  await fresh.goto("/connexion");
  await fresh.getByLabel("Email").fill(email);
  await fresh.getByLabel("Mot de passe").fill(password);
  await fresh.getByRole("button", { name: "Se connecter" }).click();
  await expect(fresh.getByText("Email ou mot de passe incorrect.")).toBeVisible();
  await signIn(fresh, email, newPassword);
});

test("adresse email : confirmée depuis les deux adresses", async ({ page, browser }) => {
  test.slow();
  await signIn(page, email, newPassword, "/compte/email");
  await page.getByLabel("Nouvelle adresse email").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Recevoir les liens de confirmation" }).click();
  await expect(page.getByText("C'est déjà votre adresse.")).toBeVisible();

  await page.getByLabel("Nouvelle adresse email").fill("seller_a@test.leenkey.fr");
  await page.getByRole("button", { name: "Recevoir les liens de confirmation" }).click();
  await expect(page.getByText("Cette adresse est déjà celle d'un autre compte.")).toBeVisible();

  await page.getByLabel("Nouvelle adresse email").fill(newEmail);
  await page.getByRole("button", { name: "Recevoir les liens de confirmation" }).click();
  await expect(page.locator(":focus")).toContainText(
    `Deux liens sont partis, à ${email} et à ${newEmail}.`,
  );
  await page.goto("/compte");
  await expect(page.getByRole("link", { name: /Adresse email/ })).toContainText(
    `Nouvelle adresse à confirmer : ${newEmail}`,
  );

  const subject = "Confirmez le changement d'adresse email";
  const toNew = await emailLink(newEmail, subject);
  const toCurrent = await emailLink(email, subject);
  expect(toNew).toMatch(/\/auth\/confirm\?token_hash=[^&]+&type=email_change$/);

  // The new address first, from another browser: one link of two.
  const other = await newPage(browser);
  await other.goto(toNew);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(
    "Confirmez le changement d'adresse",
  );
  await other.getByRole("button", { name: "Confirmer" }).click();
  await expect(other).toHaveURL("/confirmation/adresse");
  await expect(other.getByRole("heading", { level: 1 })).toHaveText("Plus qu'un lien");

  // Then the current address, in the signed-in browser: done.
  await page.goto(toCurrent);
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page).toHaveURL("/compte");
  await expect(page.locator(":focus")).toContainText(
    "Votre nouvelle adresse email est enregistrée.",
  );
  await expect(page.getByRole("link", { name: /Adresse email/ })).toContainText(newEmail);
  await expect(page.getByText(/Nouvelle adresse à confirmer/)).toHaveCount(0);

  const fresh = await newPage(browser);
  await signIn(fresh, newEmail, newPassword);
});

test("le second lien ouvert dans un navigateur d'un autre compte ne l'y fait jamais entrer", async ({
  browser,
}) => {
  test.slow();
  const page = await newPage(browser);
  await signIn(page, newEmail, newPassword, "/compte/email");
  await page.getByLabel("Nouvelle adresse email").fill(thirdEmail);
  await page.getByRole("button", { name: "Recevoir les liens de confirmation" }).click();
  await expect(page.locator(":focus")).toContainText("Deux liens sont partis");
  const subject = "Confirmez le changement d'adresse email";
  const toNew = await emailLink(thirdEmail, subject);
  // The current address got the first round as its new address: two now.
  const toCurrent = await emailLink(newEmail, subject, 2);

  // The current address first, from a browser without a session.
  const visitor = await newPage(browser);
  await visitor.goto(toCurrent);
  await visitor.getByRole("button", { name: "Confirmer" }).click();
  await expect(visitor).toHaveURL("/confirmation/adresse");
  await expect(visitor.getByRole("link", { name: "Se connecter" })).toBeVisible();

  // The second link in a browser signed in to another account: the address
  // changes, the browser stays in its own account.
  const other = await newPage(browser);
  await signIn(other, "seller_b@test.leenkey.fr", process.env.SEED_PASSWORD ?? "");
  await other.goto(toNew);
  await other.getByRole("button", { name: "Confirmer" }).click();
  await expect(other).toHaveURL("/confirmation/adresse?etat=fait");
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(
    "Votre adresse email est modifiée",
  );
  await other.goto("/compte");
  await expect(other.getByRole("link", { name: /Adresse email/ })).toContainText(
    "seller_b@test.leenkey.fr",
  );

  const fresh = await newPage(browser);
  await signIn(fresh, thirdEmail, newPassword);
});
