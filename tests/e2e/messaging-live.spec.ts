import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L1-21: the messaging (SPEC-V2 8.6) on the seed. Two browsers exchange in
// real time, a buyer writes to a seller for the first time from a listing,
// then reports the conversation: the messages and the reports stay, so this
// file runs only on a local stack just made by `scripts/local-stack.sh up`,
// with E2E_SEED=1, SEED_PASSWORD and E2E_MUTATE=1 (project
// « seed-mutations », after auth-journey.spec.ts, which needs seller_b and
// buyer_d never signed in). Seed used here only: the conversation of
// buyer_c with seller_a on LK-0001, and LK-0010 of seller_b, to which
// buyer_d writes.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec ajoute des messages",
);

const LK0010 = "/annonce/maison-5-pieces-morangis-lk0010";
/** buyer_c and seller_a about LK-0001 (supabase/seed/05_demo_data.sql). */
const SEED_CONVERSATION = "/messages/5eed2000-0000-4000-8000-000000000011";

type Account = "seller_a" | "seller_b" | "buyer_c" | "buyer_d";

/** Cookie consent already answered, as in playwright.config.ts. */
function consentCookie(baseURL: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  return { name: "lk_consent", value: `v1.0.${day}`, url: baseURL };
}

/** A second browser, on a phone (390 px) or a desktop (1280 px). */
async function openBrowser(browser: Browser, baseURL: string, phone: boolean): Promise<Page> {
  const context = await browser.newContext(
    phone
      ? { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, baseURL }
      : { viewport: { width: 1280, height: 900 }, baseURL },
  );
  await context.addCookies([consentCookie(baseURL)]);
  return context.newPage();
}

/** Signs a seed account in and lands on `path` (the terms accepted on the way). */
async function signIn(page: Page, account: Account, path: string) {
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
      .catch(() => {});
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
  expect(serious).toEqual([]);
}

const thread = (page: Page) => page.getByRole("log", { name: "Messages de la conversation" });
const inbox = (page: Page) => page.getByRole("navigation", { name: "Vos conversations" });
const field = (page: Page) => page.getByRole("textbox", { name: "Votre message" });

test("deux navigateurs échangent en temps réel, lu et non lu", async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const base = baseURL ?? "http://localhost:3100";
  const buyer = await openBrowser(browser, base, true);
  const seller = await openBrowser(browser, base, false);
  const run = Date.now().toString(36);

  await test.step("l'acquéreur voit la conversation non lue", async () => {
    await signIn(buyer, "buyer_c", "/messages");
    const line = inbox(buyer).getByRole("link").filter({ hasText: "Alice" });
    await expect(line).toContainText("Appartement 3 p · Savigny-sur-Orge".replace(/ /g, " "));
    await expect(line.getByText("Non lu")).toBeAttached();
    await expectNoSeriousViolation(buyer);
    await line.click();
    await expect(buyer).toHaveURL(SEED_CONVERSATION);
    await expect(buyer.getByRole("heading", { level: 1 })).toContainText("Appartement 3");
    await expect(buyer.getByText("Avec Alice", { exact: true })).toBeVisible();
    await expect(thread(buyer).getByText("la cave sont comprises")).toBeVisible();
    await expectNoSeriousViolation(buyer);
  });

  await test.step("le vendeur voit le financement de l'acquéreur, jamais « validé »", async () => {
    await signIn(seller, "seller_a", SEED_CONVERSATION);
    await expect(seller.getByText("Avec Chloé · Informations déclarées")).toBeVisible();
    await expect(seller.getByRole("main")).not.toContainText(/validé/i);
    // From 1024 px, the list next to the conversation, which is marked.
    await expect(inbox(seller).getByRole("link", { name: /Chloé/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expectNoSeriousViolation(seller);
  });

  await test.step("le message du vendeur arrive chez l'acquéreur sans recharger", async () => {
    const text = `Bonjour Chloé, la visite de samedi est confirmée (${run}).`;
    await field(seller).fill(text);
    await field(seller).press("Enter");
    await expect(field(seller)).toHaveValue("");
    await expect(thread(seller).getByText(text)).toBeVisible();
    await expect(thread(buyer).getByText(text)).toBeVisible({ timeout: 10_000 });
  });

  await test.step("la réponse de l'acquéreur arrive dans le fil et la liste du vendeur", async () => {
    const text = `Parfait, à samedi (${run}).`;
    await field(buyer).fill(text);
    // On a touch screen, the button sends.
    await buyer.getByRole("button", { name: "Envoyer" }).click();
    await expect(field(buyer)).toHaveValue("");
    await expect(thread(seller).getByText(text)).toBeVisible({ timeout: 10_000 });
    await expect(inbox(seller).getByRole("link", { name: /Chloé/ })).toContainText(text, {
      timeout: 10_000,
    });
  });

  await test.step("une fois lue, la conversation n'est plus non lue", async () => {
    await buyer.getByRole("link", { name: "Toutes les conversations" }).click();
    await expect(buyer).toHaveURL("/messages");
    const line = inbox(buyer).getByRole("link").filter({ hasText: "Alice" });
    await expect(line).toContainText("Vous :");
    await expect(line.getByText("Non lu")).toHaveCount(0);
  });

  // Here and not in navigation.spec.ts: opening the conversation reads it,
  // which the first step needs unread.
  await test.step("la conversation mène à l'annonce, l'annonce à la recherche (DECISIONS 2026-10-26)", async () => {
    await inbox(buyer).getByRole("link").filter({ hasText: "Alice" }).click();
    await expect(buyer).toHaveURL(SEED_CONVERSATION);
    // On a phone, the link is in the menu of the conversation.
    await buyer.getByRole("button", { name: "Plus d'actions" }).click();
    const listing = buyer.getByRole("menu").getByRole("menuitem", { name: "Voir l'annonce" });
    await expect(listing).toHaveAttribute("href", /^\/annonce\//);
    await listing.click();
    await expect(buyer).toHaveURL(/\/annonce\//);
    // Never back to the conversation: to the search.
    await buyer.getByRole("link", { name: "Retour aux annonces" }).locator("visible=true").click();
    await expect(buyer).toHaveURL("/acheter");
  });

  await buyer.context().close();
  await seller.context().close();
});

test("premier message depuis une annonce, liste du vendeur, signalement", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const base = baseURL ?? "http://localhost:3100";
  const buyer = await openBrowser(browser, base, true);
  const seller = await openBrowser(browser, base, false);
  let conversation = "";

  await test.step("le vendeur a sa liste ouverte", async () => {
    await signIn(seller, "seller_b", "/messages");
    await expect(inbox(seller).getByRole("link", { name: /David/ })).toHaveCount(1);
  });

  await test.step("« Demander une visite » ouvre le message, déjà écrit", async () => {
    // Through a signed-in page first: the terms gate is passed before (a
    // listing is public, it does not ask).
    await signIn(buyer, "buyer_d", "/messages");
    await buyer.goto(LK0010);
    const visit = buyer.getByRole("link", { name: "Demander une visite" });
    await expect(visit).toHaveAttribute(
      "href",
      /^\/messages\/nouveau\?annonce=[0-9a-f-]{36}&visite=1$/,
    );
    await expect(
      buyer.getByText("Un compte acquéreur est nécessaire pour contacter le vendeur"),
    ).toHaveCount(0);
    await visit.click();
    await expect(buyer).toHaveURL(/\/messages\/nouveau\?annonce=.+&visite=1$/);
    await expect(buyer.getByRole("heading", { level: 1 })).toContainText("Maison 5");
    await expect(buyer.getByText("Avec Bruno", { exact: true })).toBeVisible();
    await expect(buyer.getByText("Bruno vous répond ici.")).toBeVisible();
    await expect(field(buyer)).toHaveValue(
      "Bonjour, je souhaiterais visiter votre bien. Quelles sont vos disponibilités ?",
    );
    await expectNoSeriousViolation(buyer);
  });

  await test.step("le message envoyé ouvre la conversation", async () => {
    await buyer.getByRole("button", { name: "Envoyer" }).click();
    await expect(buyer).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
    conversation = new URL(buyer.url()).pathname;
    await expect(thread(buyer).getByText("je souhaiterais visiter votre bien")).toBeVisible();
  });

  await test.step("la nouvelle conversation arrive dans la liste du vendeur, par bien", async () => {
    await expect(inbox(seller).getByRole("link", { name: /David/ })).toHaveCount(2, {
      timeout: 10_000,
    });
    // Two properties with conversations: one group each.
    await expect(inbox(seller).getByRole("heading")).toHaveCount(2);
    const line = inbox(seller).locator(`a[href="${conversation}"]`);
    await expect(line.getByText("Non lu")).toBeAttached();
  });

  await test.step("revenir de l'annonce retrouve la même conversation", async () => {
    await buyer.goto(LK0010);
    await buyer.getByRole("link", { name: "Contacter le vendeur" }).click();
    await expect(buyer).toHaveURL(conversation);
  });

  await test.step("signaler la conversation, au clavier", async () => {
    const menu = buyer.getByRole("button", { name: "Plus d'actions" });
    await menu.focus();
    await buyer.keyboard.press("Enter");
    await buyer.getByRole("menuitem", { name: "Signaler la conversation" }).press("Enter");
    const dialog = buyer.getByRole("dialog", { name: "Signaler la conversation" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Envoyer le signalement" }).click();
    await expect(dialog.getByText("en 3 caractères au moins")).toBeVisible();
    await expectNoSeriousViolation(buyer);
    await dialog.getByLabel("Motif du signalement").fill("Demande d'acompte hors plateforme.");
    await dialog.getByRole("button", { name: "Envoyer le signalement" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      buyer.getByText("Votre signalement est transmis à l'équipe Leenkey."),
    ).toBeVisible();
    await expect(menu).toBeFocused();
  });

  await test.step("le vendeur ne s'écrit pas à lui-même : sa fiche du bien", async () => {
    await seller.goto(LK0010);
    await seller
      .getByRole("complementary")
      .getByRole("link", { name: "Contacter le vendeur" })
      .click();
    await expect(seller).toHaveURL(/\/vendeur\/biens\/5eed1000-0000-4000-8000-0{10}10$/);
  });

  await buyer.context().close();
  await seller.context().close();
});
