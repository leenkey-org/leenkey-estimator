import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L1-31, the acceptance of the task: « Dossier créé avec résumé, notification
// admin ». A seller without an adviser in their plan asks for a person: the
// assistant (deterministic model, AI_MOCK=1) sums the request up, the seller
// reads it and confirms, and the team finds the case in the back office,
// with its summary and its notification. At the daily limit of the
// assistant, the seller writes the request themselves. The cases stay: only
// on a local stack just made by `scripts/local-stack.sh up`, with
// E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1 and AI_MOCK=1 (project
// « seed-mutations »). Seed used here only: the assistant of seller_b, about
// LK-0012 (Autonomie, which no other spec turns into a paid plan) and LK-0008
// (Sérénité).

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const mocked = process.env.AI_MOCK === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !mocked || !localStack,
  "pile locale de seed et modèle déterministe requis (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, AI_MOCK=1)",
);

const LK0008 = "5eed1000-0000-4000-8000-000000000008";
const LK0012 = "5eed1000-0000-4000-8000-000000000012";

// One conversation with the assistant per account: each test in turn.
test.describe.configure({ mode: "serial" });

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

async function signIn(page: Page, account: "seller_b" | "admin", path: string) {
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

const chat = (page: Page) => page.getByRole("log", { name: "Conversation avec l'assistant" });

/** A new conversation: a click before the page is hydrated does nothing, clicked again until it does. */
async function newConversation(page: Page) {
  const intro = page.getByText("Posez vos questions sur votre vente");
  await expect(async () => {
    await page.getByRole("button", { name: "Nouvelle conversation" }).click();
    await expect(intro).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

async function ask(page: Page, question: string) {
  await page.getByLabel("Votre question").fill(question);
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
}

async function expectNoSeriousViolation(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test("l'assistant transmet la demande à l'équipe après confirmation ; l'équipe la lit dans le back office", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(!baseURL, "baseURL requis");
  await signIn(page, "seller_b", `/assistant?bien=${LK0012}`);
  await newConversation(page);
  const card = chat(page).getByRole("region", { name: "Écrire à l'équipe Leenkey" });

  // Cancelled first: nothing leaves.
  const cancelled = `annulee-${Date.now().toString(36)}`;
  await ask(page, `Je voudrais écrire à l'équipe Leenkey (${cancelled})`);
  await expect(card.getByText("Votre demande", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Annuler" }).click();
  await expect(card.getByText("Demande annulée : rien n'a été envoyé.")).toBeVisible();
  await expect(chat(page).getByText("Très bien, je n'envoie rien.")).toBeVisible();

  // Then confirmed, once read: the property, the subject, the request.
  const run = `envoyee-${Date.now().toString(36)}`;
  await ask(
    page,
    `Je voudrais écrire à l'équipe Leenkey : un acquéreur conteste la surface (${run})`,
  );
  const request = card.last();
  await expect(request.getByText(/^Bien : /)).toBeVisible();
  await expect(request.getByText("Objet", { exact: true })).toBeVisible();
  await expect(request).toContainText("Demande d'un vendeur");
  await expect(request).toContainText(run);
  await expectNoSeriousViolation(page);
  await request.getByRole("button", { name: "Envoyer" }).click();
  await expect(
    request.getByText(
      /Demande transmise à l'équipe Leenkey : nous vous répondons par email sous 48\sh, 7\sj\/7\./,
    ),
  ).toBeVisible();
  await expect(chat(page).getByText("C'est transmis à l'équipe Leenkey.")).toBeVisible();
  await expect(page.getByLabel("Votre question")).toBeEnabled();

  // The team: told in the bell, the case in the list, its summary on its sheet.
  const team = await openBrowser(browser, baseURL ?? "", false);
  await signIn(team, "admin", "/admin/dossiers?q=LK-0012");
  await team
    .getByRole("button", { name: /^Notifications/ })
    .locator("visible=true")
    .click();
  const bell = team.getByRole("dialog", { name: "Notifications" });
  await expect(bell.getByText("Nouvelle demande à traiter").first()).toBeVisible();
  await expect(bell.getByText(/Demande d'un vendeur · LK-0012/).first()).toBeVisible();
  await team.keyboard.press("Escape");

  const table = team.getByRole("table", { name: "Dossiers" });
  const row = table.locator("tbody tr").filter({ hasText: "Demande d'un vendeur" });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Assistant");
  await expect(row).toContainText("LK-0012");
  await row.getByRole("link", { name: /^Ouvrir le dossier « Demande d'un vendeur/ }).click();
  await expect(team).toHaveURL(/\/admin\/dossiers\/[0-9a-f-]{36}$/);
  const summary = team.getByRole("region", { name: "Résumé de l'assistant" });
  await expect(summary).toContainText(run);
  await expect(team.getByText(cancelled)).toHaveCount(0);
  await expectNoSeriousViolation(team);
  await team.context().close();
});

test("un bien dont la formule comprend un conseiller : l'assistant et la demande écrite renvoient vers lui", async ({
  page,
}) => {
  await signIn(page, "seller_b", `/assistant?bien=${LK0008}`);
  await newConversation(page);
  await ask(page, "Je voudrais écrire à l'équipe Leenkey");
  await expect(
    chat(page).getByText("Votre formule comprend un conseiller : écrivez-lui plutôt."),
  ).toBeVisible();
  await expect(chat(page).getByRole("region", { name: "Écrire à l'équipe Leenkey" })).toHaveCount(
    0,
  );

  // At the daily limit too: the request written by the seller is for their adviser.
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({ status: 429, contentType: "application/json", body: '{"error":"quota"}' }),
  );
  await ask(page, "Faut-il accepter une offre à 5 % sous le prix ?");
  await page.getByRole("button", { name: "Écrire à un conseiller" }).click();
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(
    page.getByText(
      "La formule de ce bien comprend un conseiller Leenkey : écrivez-lui directement dans la messagerie.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Écrire à mon conseiller" })).toHaveAttribute(
    "href",
    /^\/messages\/[0-9a-f-]{36}$/,
  );
  // Their text is kept, and nothing was sent to the team.
  await expect(page.getByLabel("Votre demande")).toHaveValue(
    "Faut-il accepter une offre à 5 % sous le prix ?",
  );
});

test("à la limite du jour, sur téléphone : le vendeur écrit sa demande lui-même, l'équipe la reçoit", async ({
  browser,
  baseURL,
}) => {
  test.skip(!baseURL, "baseURL requis");
  const seller = await openBrowser(browser, baseURL ?? "", true);
  await signIn(seller, "seller_b", `/assistant?bien=${LK0012}`);
  await newConversation(seller);
  // The limit of the day, as the route says it once reached.
  await seller.route("**/api/ai/chat", (route) =>
    route.fulfill({ status: 429, contentType: "application/json", body: '{"error":"quota"}' }),
  );
  const run = `ecrite-${Date.now().toString(36)}`;
  const question = `Mon annonce n'apparaît plus dans la recherche (${run}).`;
  await ask(seller, question);
  await expect(
    seller.getByText(/Vous avez atteint la limite de messages de l'assistant pour aujourd'hui/),
  ).toBeVisible();

  await seller.getByRole("button", { name: "Écrire à un conseiller" }).click();
  const field = seller.getByLabel("Votre demande");
  // The question the assistant could not take is already there.
  await expect(field).toHaveValue(question);
  await expect(field).toBeFocused();
  // One field at a time: the one of the conversation gives way to the request.
  await expect(seller.getByLabel("Votre question")).toHaveCount(0);
  await expect(
    seller.getByText(/Un membre de l'équipe Leenkey vous répond par email sous 48\sh, 7\sj\/7\./),
  ).toBeVisible();
  await expectNoSeriousViolation(seller);
  const overflow = await seller.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Too short: said under the field, nothing sent.
  await field.fill("Court");
  await seller.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(
    seller.getByText(/Décrivez votre demande en quelques mots \(10\scaractères au moins\)\./),
  ).toBeVisible();
  // The error is read: the focus is back in the field it describes.
  await expect(field).toBeFocused();

  await field.fill(question);
  await seller.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(
    seller.getByText(
      /Votre demande est transmise à l'équipe Leenkey\. Nous vous répondons par email/,
    ),
  ).toBeVisible();
  await expect(seller.getByRole("button", { name: "Envoyer ma demande" })).toHaveCount(0);
  // Sent once: the field of the conversation is back, empty, and no second request is offered.
  await expect(seller.getByLabel("Votre question")).toHaveValue("");
  await expect(seller.getByLabel("Votre question")).toBeFocused();
  await expect(seller.getByRole("button", { name: "Écrire à un conseiller" })).toHaveCount(0);
  await seller.context().close();

  const team = await openBrowser(browser, baseURL ?? "", false);
  await signIn(team, "admin", "/admin/dossiers?q=LK-0012");
  const row = team
    .getByRole("table", { name: "Dossiers" })
    .locator("tbody tr")
    .filter({ hasText: run });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Demande écrite");
  await row.getByRole("link", { name: /^Ouvrir le dossier/ }).click();
  await expect(team.getByRole("region", { name: "Demande de l'utilisateur" })).toContainText(
    question,
  );
  await team.context().close();
});
