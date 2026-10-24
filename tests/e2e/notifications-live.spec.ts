import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L1-22: the bell (SPEC-V2 section 10, docs/DESIGN.md 10.7) on the seed. A
// buyer writes to a seller: the bell of the seller lights up without a
// reload, its panel lists the message, opening it reads it; the answer
// reaches the bell of the buyer on a phone; the email preferences; the bell
// of the back office; the door of the cron. The messages stay, so this file
// runs only on a local stack just made by `scripts/local-stack.sh up`, with
// E2E_SEED=1, SEED_PASSWORD and E2E_MUTATE=1 (project « seed-mutations »).
// Seed used here only: buyer_d writes to seller_a about LK-0002 (the other
// specs use LK-0001 and LK-0010); assertions on its own notifications only,
// the other specs of the project write meanwhile.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const CRON_SECRET = process.env.CRON_SECRET;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec ajoute des messages",
);

const LK0002 = "/annonce/maison-5-pieces-epinay-sur-orge-lk0002";

type Account = "seller_a" | "buyer_d" | "admin";

function consentCookie(baseURL: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  return { name: "lk_consent", value: `v1.0.${day}`, url: baseURL };
}

async function openBrowser(browser: Browser, baseURL: string, phone: boolean): Promise<Page> {
  const context = await browser.newContext(
    phone
      ? { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, baseURL }
      : { viewport: { width: 1280, height: 900 }, baseURL },
  );
  await context.addCookies([consentCookie(baseURL)]);
  return context.newPage();
}

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
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
  expect(serious).toEqual([]);
}

/** The bell visible on the page (one per header; the other one hidden by its breakpoint). */
const bell = (page: Page) =>
  page.getByRole("button", { name: /^Notifications/ }).locator("visible=true");
const panel = (page: Page) => page.getByRole("dialog", { name: "Notifications" });
const field = (page: Page) => page.getByRole("textbox", { name: "Votre message" });

test("la cloche s'allume en direct, le panneau lit, la réponse arrive sur le téléphone", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(150_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);
  const run = Date.now().toString(36);
  const question = `Bonjour, le jardin est-il clos ? (${run})`;
  const answer = `Oui, entièrement clos, avec un portail (${run}).`;
  let conversation = "";

  await test.step("le vendeur attend sur son espace", async () => {
    await signIn(seller, "seller_a", "/vendeur");
    await expect(bell(seller)).toBeVisible();
  });

  await test.step("l'acquéreur écrit depuis l'annonce", async () => {
    await signIn(buyer, "buyer_d", "/acquereur");
    await buyer.goto(LK0002);
    await buyer.getByRole("link", { name: "Contacter le vendeur" }).click();
    await expect(buyer).toHaveURL(/\/messages\/nouveau\?annonce=/);
    await field(buyer).fill(question);
    await buyer.getByRole("button", { name: "Envoyer" }).click();
    await expect(buyer).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
    conversation = new URL(buyer.url()).pathname;
  });

  await test.step("la cloche du vendeur s'allume sans recharger", async () => {
    await expect(bell(seller)).toHaveAccessibleName(/^Notifications, \d+ nouvelles?$/, {
      timeout: 10_000,
    });
    await bell(seller).click();
    await expect(panel(seller)).toBeVisible();
    const item = panel(seller).getByRole("link").filter({ hasText: run });
    await expect(item).toContainText("Nouveau message de David");
    await expect(item).toContainText(`«\u00A0${question}\u00A0»`);
    await expect(item).toContainText(/, non lue/);
    await expect(item).toHaveAttribute("href", conversation);
    await expect(panel(seller).getByRole("heading", { name: "Aujourd'hui" })).toBeVisible();
    // 420 px on the right from 768 px (DESIGN.md 10.7).
    expect((await panel(seller).boundingBox())?.width).toBeCloseTo(420, 0);
    await expectNoSeriousViolation(seller);
  });

  await test.step("les filtres du vendeur", async () => {
    const filters = panel(seller).getByRole("group", { name: "Filtrer les notifications" });
    await expect(filters.getByRole("button")).toHaveText([
      "Toutes",
      "Messages",
      "Offres et visites",
    ]);
    await expect(filters.getByRole("button", { name: "Toutes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await filters.getByRole("button", { name: "Offres et visites" }).click();
    await expect(
      panel(seller).getByText("Aucune notification de ce type pour l'instant."),
    ).toBeVisible();
    await filters.getByRole("button", { name: "Messages" }).click();
    await expect(panel(seller).getByRole("link").filter({ hasText: run })).toBeVisible();
  });

  await test.step("ouvrir la notification mène à la conversation et la lit", async () => {
    await panel(seller).getByRole("link").filter({ hasText: run }).click();
    await expect(seller).toHaveURL(conversation);
    await expect(panel(seller)).toBeHidden();
    await bell(seller).click();
    const item = panel(seller).getByRole("link").filter({ hasText: run });
    await expect(item).toBeVisible();
    await expect(item).not.toContainText("non lue");
    await panel(seller).getByRole("button", { name: "Fermer les notifications" }).click();
  });

  await test.step("la réponse du vendeur arrive dans la cloche de l'acquéreur (téléphone)", async () => {
    await buyer.goto("/acquereur");
    await expect(bell(buyer)).toBeVisible();
    await field(seller).fill(answer);
    await field(seller).press("Enter");
    await expect(bell(buyer)).toHaveAccessibleName(/^Notifications, \d+ nouvelles?$/, {
      timeout: 10_000,
    });
    await bell(buyer).click();
    // Full screen below 768 px.
    expect((await panel(buyer).boundingBox())?.width).toBeCloseTo(390, 0);
    const item = panel(buyer).getByRole("link").filter({ hasText: run });
    await expect(item).toContainText("Nouveau message de Alice");
    const filters = panel(buyer).getByRole("group", { name: "Filtrer les notifications" });
    await expect(filters.getByRole("button")).toHaveText([
      "Toutes",
      "Mes recherches",
      "Visites et offres",
    ]);
    await expectNoSeriousViolation(buyer);
  });

  await test.step("« Tout marquer comme lu »", async () => {
    await panel(buyer).getByRole("button", { name: "Tout marquer comme lu" }).click();
    await expect(panel(buyer).getByRole("link").filter({ hasText: run })).not.toContainText(
      "non lue",
    );
    await expect(
      panel(buyer).getByRole("button", { name: "Tout marquer comme lu" }),
    ).toBeDisabled();
    // Read in the database too: the same after a reload.
    await buyer.reload();
    await bell(buyer).click();
    await expect(panel(buyer).getByRole("link").filter({ hasText: run })).not.toContainText(
      "non lue",
    );
  });

  await seller.context().close();
  await buyer.context().close();
});

test("préférences des emails, depuis la roue du panneau", async ({ browser, baseURL }) => {
  const page = await openBrowser(browser, baseURL ?? "http://localhost:3100", true);
  await signIn(page, "buyer_d", "/acquereur");
  await bell(page).click();
  await panel(page).getByRole("link", { name: "Réglages des notifications" }).click();
  await expect(page).toHaveURL("/compte/notifications");
  await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible();
  const messages = page.getByRole("checkbox", { name: /Nouveaux messages/ });
  await expect(messages).toBeChecked();
  // A buyer: no line about the emails of a listing.
  await expect(page.getByText("Les emails sur votre annonce")).toHaveCount(0);
  await messages.uncheck();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Vos préférences sont enregistrées.")).toBeVisible();
  await page.reload();
  await expect(messages).not.toBeChecked();
  await expectNoSeriousViolation(page);
  await messages.check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Vos préférences sont enregistrées.")).toBeVisible();
  // Back to the account.
  await page.getByRole("link", { name: "Mon compte" }).click();
  await expect(page).toHaveURL("/compte");
  await expect(page.getByRole("link", { name: "Notifications" })).toHaveAttribute(
    "href",
    "/compte/notifications",
  );
  await page.context().close();
});

test("la cloche du back office : les annonces envoyées en relecture", async ({
  browser,
  baseURL,
}) => {
  const page = await openBrowser(browser, baseURL ?? "http://localhost:3100", false);
  await signIn(page, "admin", "/admin");
  // The seed has listings waiting for review: their notifications are unread.
  await expect(bell(page)).toHaveAccessibleName(/^Notifications, \d+ nouvelles?$/);
  await bell(page).click();
  const item = panel(page)
    .getByRole("link")
    .filter({ hasText: "Une annonce attend votre relecture" });
  await expect(item.first()).toBeVisible();
  await expect(item.first()).toHaveAttribute("href", /^\/admin\/annonces\/[0-9a-f-]{36}$/);
  // A single filter in the back office: none shown.
  await expect(panel(page).getByRole("group", { name: "Filtrer les notifications" })).toHaveCount(
    0,
  );
  await expectNoSeriousViolation(page);
  await item.first().click();
  await expect(page).toHaveURL(/\/admin\/annonces\/[0-9a-f-]{36}$/);
  await page.context().close();
});

test("la route du cron n'ouvre qu'avec CRON_SECRET", async ({ request }) => {
  const closed = await request.get("/api/cron/send-notification-emails");
  expect(closed.status()).toBe(401);
  const wrong = await request.get("/api/cron/send-notification-emails", {
    headers: { Authorization: "Bearer pas-le-bon" },
  });
  expect(wrong.status()).toBe(401);
  test.skip(!CRON_SECRET, "CRON_SECRET requis pour l'appel autorisé");
  const open = await request.post("/api/cron/send-notification-emails", {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(open.status()).toBe(200);
  expect(await open.json()).toMatchObject({ ok: true, due: expect.any(Number) });
});
