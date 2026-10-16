import { expect, test, type Page } from "@playwright/test";

// L1-09, full journey with real emails: sign-up, confirmation from another
// browser, login, password reset, terms gate of the seed accounts, admin area.
// Needs a stack with an email catcher: `scripts/local-stack.sh up`, the app
// built and started with `eval "$(scripts/local-stack.sh env)"` (which also
// sets MAILPIT_URL, SEED_PASSWORD and BASE_URL for this file).

const MAILPIT_URL = process.env.MAILPIT_URL;
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!MAILPIT_URL || !SEED_PASSWORD, "parcours complet : MAILPIT_URL et SEED_PASSWORD requis");
test.describe.configure({ mode: "serial" });

async function emailLink(to: string, subject: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}" subject:"${subject}"`)}`,
    );
    const { messages } = (await search.json()) as { messages?: Array<{ ID: string }> };
    if (messages?.length) {
      const message = (await (
        await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)
      ).json()) as {
        HTML: string;
      };
      const href = message.HTML.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no "${subject}" email for ${to}`);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

const email = `camille.${Date.now()}@exemple.test`;

test.beforeEach(() => {
  test.skip(test.info().project.name !== "mobile", "un seul passage suffit (comptes créés)");
});

test("inscription, puis confirmation depuis un autre navigateur", async ({ page, browser }) => {
  await page.goto("/inscription?next=%2Facquereur%3Fbienvenue%3D1");
  await page.getByText("J'achète").click();
  await page.getByLabel("Prénom et nom").fill("Camille Martin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page.getByLabel("Mot de passe").fill("Maison-91-Savigny");
  await expect(page.getByText("Robustesse : bonne")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();

  const link = await emailLink(email, "Confirmez votre adresse email");
  expect(link).toMatch(/\/auth\/confirm\?token_hash=[^&]+&type=email$/);
  const other = await (await browser.newContext()).newPage();
  await other.goto(link);
  await expect(other).toHaveURL(/\/acquereur\?bienvenue=1$/);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText("Bonjour Camille");

  // A used link is refused clearly.
  const third = await (await browser.newContext()).newPage();
  await third.goto(link);
  await expect(third).toHaveURL(/\/connexion\?lien=expire$/);
  await expect(third.getByRole("status")).toHaveText(
    "Ce lien n'est plus valable. Connectez-vous, ou demandez un nouveau lien.",
  );
});

test("connexion : mauvais mot de passe, puis le bon", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Next.js has its own (empty) role="alert" region: target ours by its text.
  await expect(
    page.getByRole("alert").filter({ hasText: "Email ou mot de passe incorrect." }),
  ).toBeVisible();
  await page.getByLabel("Mot de passe").fill("Maison-91-Savigny");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/acquereur$/);
  // Already signed in: the login page sends home.
  await page.goto("/connexion");
  await expect(page).toHaveURL(/\/acquereur$/);
  await signOut(page);
});

test("mot de passe oublié, nouveau mot de passe", async ({ page }) => {
  await page.goto("/mot-de-passe-oublie");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();

  await page.goto(await emailLink(email, "Choisissez un nouveau mot de passe"));
  await expect(page).toHaveURL(/\/reinitialiser$/);
  await page.getByLabel("Nouveau mot de passe").fill("Nouveau-mdp-2026");
  await page.getByLabel("Confirmez le mot de passe").fill("Nouveau-mdp-2025");
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page.getByText("Les deux mots de passe sont différents.")).toBeVisible();
  await page.getByLabel("Nouveau mot de passe").fill("Nouveau-mdp-2026");
  await page.getByLabel("Confirmez le mot de passe").fill("Nouveau-mdp-2026");
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page).toHaveURL(/\/acquereur$/);
  await signOut(page);

  // The new password works, and an external `next` is ignored.
  await page.goto(`/connexion?next=${encodeURIComponent("https://evil.example/")}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("Nouveau-mdp-2026");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/acquereur$/);
  await signOut(page);
});

for (const [account, home] of [
  ["seller_a", "/vendeur"],
  ["admin", "/admin"],
] as const) {
  test(`${account} : conditions à accepter, puis ${home}`, async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
    await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(new RegExp(`/conditions\\?next=${encodeURIComponent(home)}$`));
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page).toHaveURL(new RegExp(`${home}$`));
    if (account === "seller_a") {
      const response = await page.goto("/admin");
      expect(response?.status()).toBe(404);
      await page.goto(home);
    }
    await signOut(page);
  });
}
