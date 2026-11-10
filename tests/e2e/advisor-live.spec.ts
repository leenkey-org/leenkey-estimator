import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L1-34: the conversation with the Leenkey adviser (SPEC-V2 8.6, 12, 17) on
// the seed. seller_a writes to their adviser on a desktop, the team answers
// from the shared inbox on a phone, in real time, signed with the first name
// of the admin; then the assistant passes a question on (contact_advisor),
// once confirmed. The messages stay, so this file runs only on a local stack
// just made by `scripts/local-stack.sh up`, with E2E_SEED=1, SEED_PASSWORD
// and E2E_MUTATE=1 (project « seed-mutations »). Seed used here only: the
// advisor conversation of LK-0001 (Accompagné, seller_a).

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

const LK0001 = "5eed1000-0000-4000-8000-000000000001";

// One conversation, read by its last message: each test in turn (the question
// passed on by the assistant must not land while the team reads the first one).
test.describe.configure({ mode: "serial" });
const ADVISOR = "/messages/5eed2000-0000-4000-8000-000000000001";
const ADMIN_ADVISOR = "/admin/messages/5eed2000-0000-4000-8000-000000000001";
const plain = (value: string) => value.replace(/\u00A0/g, " ");

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

async function signIn(page: Page, account: "seller_a" | "admin", path: string) {
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
  expect(
    results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => violation.id),
  ).toEqual([]);
}

const thread = (page: Page) => page.getByRole("log", { name: "Messages de la conversation" });
const field = (page: Page) => page.getByRole("textbox", { name: "Votre message" });

/** Sends a message once the page is hydrated (a click before does nothing). */
async function send(page: Page, text: string) {
  await field(page).fill(text);
  await expect(async () => {
    if ((await field(page).inputValue()) !== "") {
      await page.getByRole("button", { name: "Envoyer" }).click();
    }
    await expect(thread(page).getByText(text)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
}

test("le vendeur écrit à son conseiller, l'équipe répond en temps réel, signée de son prénom @a11y", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const team = await openBrowser(browser, base, true);
  const run = Date.now().toString(36);
  const question = `Bonjour, faut-il baisser le prix ? (${run})`;
  const answer = `Bonjour Alice, regardons cela ensemble demain. (${run})`;

  await test.step("le vendeur ouvre « Mon conseiller Leenkey » et écrit", async () => {
    await signIn(seller, "seller_a", ADVISOR);
    await expect(seller.getByRole("heading", { level: 1 })).toHaveText("Mon conseiller Leenkey");
    await expect(seller.getByText(/^Accompagné\s· Réponse sous 24\sh$/)).toBeVisible();
    await expect(
      thread(seller).getByText(/Bonjour, je suis votre conseiller Leenkey/),
    ).toBeVisible();
    // Its way back is the plan of the property, and it is never reported.
    await expect(seller.getByRole("link", { name: "Voir ma formule" })).toHaveAttribute(
      "href",
      `/vendeur/formule?bien=${LK0001}`,
    );
    await seller.getByRole("button", { name: "Plus d'actions" }).click();
    await expect(seller.getByRole("menuitem", { name: "Signaler la conversation" })).toHaveCount(0);
    await seller.keyboard.press("Escape");
    await expectNoSeriousViolation(seller);
    await send(seller, question);
  });

  await test.step("l'équipe le voit non lu en tête de sa boîte, sur téléphone, et répond", async () => {
    await signIn(team, "admin", "/admin/messages");
    const line = team
      .getByRole("list", { name: "Conversations avec les vendeurs" })
      .getByRole("link")
      .first();
    await expect(line).toContainText("LK-0001");
    await expect(line).toContainText(question);
    await expect(line.getByText("Non lu")).toBeAttached();
    await line.click();
    await expect(team).toHaveURL(ADMIN_ADVISOR);
    await expect(team.getByRole("heading", { level: 1 })).toContainText("Alice");
    await expect(thread(team).getByText(question)).toBeVisible();
    // The author of the message received: the seller.
    await expect(
      thread(team)
        .getByText(/^Alice\s· \d{1,2}:\d{2}$/)
        .last(),
    ).toBeVisible();
    await expectNoSeriousViolation(team);
    await send(team, answer);
  });

  await test.step("le vendeur reçoit la réponse sans recharger, du prénom de l'admin", async () => {
    await expect(thread(seller).getByText(answer)).toBeVisible({ timeout: 15_000 });
    await expect(
      thread(seller)
        .getByText(/^Cédric, équipe Leenkey\s· \d{1,2}:\d{2}$/)
        .last(),
    ).toBeVisible();
  });

  await test.step("lue par l'équipe : plus en attente dans la boîte", async () => {
    await team.goto("/admin/messages");
    const line = team
      .getByRole("list", { name: "Conversations avec les vendeurs" })
      .getByRole("link", { name: /LK-0001/ });
    await expect(line.getByText("Non lu")).toHaveCount(0);
    await expect(line).toContainText(plain(`Leenkey : ${answer}`));
  });

  await seller.context().close();
  await team.context().close();
});

test("l'assistant transmet la question au conseiller, après confirmation (contact_advisor)", async ({
  page,
}) => {
  await signIn(page, "seller_a", `/assistant?bien=${LK0001}`);
  const chat = page.getByRole("log", { name: "Conversation avec l'assistant" });
  const intro = page.getByText("Posez vos questions sur votre vente");
  await expect(async () => {
    await page.getByRole("button", { name: "Nouvelle conversation" }).click();
    await expect(intro).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  const run = Date.now().toString(36);
  await page
    .getByLabel("Votre question")
    .fill(`Transmettez à mon conseiller : faut-il accepter une offre basse ? (${run})`);
  await page.getByRole("button", { name: "Envoyer" }).click();
  const card = chat.getByRole("region", { name: "Écrire à mon conseiller" });
  await expect(card.getByText("Message à votre conseiller")).toBeVisible();
  await expect(card).toContainText(run);

  // Nothing leaves before the confirmation.
  const sent = `faut-il accepter une offre basse ? (${run})`;
  await card.getByRole("button", { name: "Envoyer" }).click();
  await expect(card.getByText(/Message envoyé à votre conseiller Leenkey/)).toBeVisible();
  await expect(chat.getByText("C'est transmis à votre conseiller.")).toBeVisible();

  await page.goto(ADVISOR);
  await expect(thread(page).getByText(sent, { exact: false })).toBeVisible();
  await expect(
    thread(page)
      .getByText(/^Vous, via l'assistant\s· \d{1,2}:\d{2}$/)
      .last(),
  ).toBeVisible();
});
