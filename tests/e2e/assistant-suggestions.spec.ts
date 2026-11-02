import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L1-29, the acceptance of the task: « AssistantSuggestion conforme,
// ai_suggested enregistré ». In the messaging, the seller asks for a reply
// (deterministic model, AI_MOCK=1): « Ignorer » closes it, « Modifier » puts
// it in the field with the focus, « Utiliser » in the field only; sent, the
// message says it came from a suggestion (ai_suggested, the request of the
// action; stored: supabase/tests/rls_ai_suggestions.sql). The buyer never
// sees the button. At the price step, a description proposed, taken in the
// field, never saved before « Enregistrer ». Adds messages and logs of the
// assistant: only on a local stack just made by `scripts/local-stack.sh up`,
// with E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1 and AI_MOCK=1, never on the
// preprod (project « seed-mutations », after auth-journey.spec.ts, which needs
// seller_b and buyer_d never signed in). Seed used here: the conversation of
// buyer_d with seller_b on LK-0008 (the buyer wrote last), and LK-0001 of
// seller_a (never saved).

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

test.describe.configure({ mode: "serial" });

/** buyer_d and seller_b about LK-0008, the buyer last (supabase/seed/05_demo_data.sql). */
const CONVERSATION = "/messages/5eed2000-0000-4000-8000-000000000018";
const LAST_FROM_BUYER = "Serait-il possible de la visiter la semaine prochaine ?";
const LK0001 = "5eed1000-0000-4000-8000-000000000001";
/** The texts of the model of the tests (leenkey/ai/mock.ts). */
const MOCK_REPLY =
  "Bonjour, merci pour votre message. Je vérifie ce point et je reviens vers vous rapidement avec une réponse précise.";
const MOCK_DESCRIPTION_START = "Proposition de description de l'assistant de test.";

type Account = "seller_a" | "seller_b" | "buyer_d";

/** Cookie consent already answered, as in playwright.config.ts. */
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
  expect(serious).toEqual([]);
}

/** Asks for a suggestion: a click before the page is hydrated does nothing, clicked again until it does. */
async function ask(page: Page, button: string, region: string) {
  const box = page.getByRole("region", { name: region });
  await expect(async () => {
    await page.getByRole("button", { name: button }).click();
    await expect(box).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return box;
}

const thread = (page: Page) => page.getByRole("log", { name: "Messages de la conversation" });
const field = (page: Page) => page.getByRole("textbox", { name: "Votre message" });

test("le vendeur répond à l'acquéreur avec une réponse suggérée par l'assistant", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, true);
  const suggest = seller.getByRole("button", { name: "Suggérer une réponse" });
  const region = "Réponse suggérée par l'assistant";

  await test.step("« Ignorer » ferme la suggestion, le focus revient au bouton", async () => {
    await signIn(seller, "seller_b", CONVERSATION);
    // The buyer wrote last: there is something to answer.
    await expect(thread(seller).getByText(LAST_FROM_BUYER)).toBeVisible();
    const box = await ask(seller, "Suggérer une réponse", region);
    await expect(box.getByText(MOCK_REPLY)).toBeVisible();
    await expect(box).toBeFocused();
    await expectNoSeriousViolation(seller);
    await box.getByRole("button", { name: "Ignorer" }).click();
    await expect(box).toHaveCount(0);
    await expect(suggest).toBeFocused();
    await expect(field(seller)).toHaveValue("");
  });

  await test.step("« Modifier » met la réponse dans le champ, le focus dedans", async () => {
    const box = await ask(seller, "Suggérer une réponse", region);
    await box.getByRole("button", { name: "Modifier" }).click();
    await expect(field(seller)).toHaveValue(MOCK_REPLY);
    await expect(field(seller)).toBeFocused();
    // Nothing sent.
    await expect(thread(seller).getByText(MOCK_REPLY)).toHaveCount(0);
    await field(seller).fill("");
  });

  await test.step("« Utiliser » la met dans le champ ; envoyée, elle porte ai_suggested", async () => {
    const box = await ask(seller, "Suggérer une réponse", region);
    await box.getByRole("button", { name: "Utiliser" }).click();
    await expect(box).toHaveCount(0);
    await expect(field(seller)).toHaveValue(MOCK_REPLY);
    await expect(thread(seller).getByText(MOCK_REPLY)).toHaveCount(0);
    const sent = seller.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        (request.postData() ?? "").includes(MOCK_REPLY) &&
        (request.postData() ?? "").includes('"aiSuggested":true'),
    );
    await seller.getByRole("button", { name: "Envoyer" }).click();
    await sent;
    await expect(thread(seller).getByText(MOCK_REPLY)).toBeVisible();
    await expect(field(seller)).toHaveValue("");
    // The seller wrote last: nothing to answer.
    await expect(suggest).toHaveCount(0);
  });

  await test.step("l'acquéreur reçoit la réponse, jamais le bouton", async () => {
    const buyer = await openBrowser(browser, base, false);
    await signIn(buyer, "buyer_d", CONVERSATION);
    await expect(thread(buyer).getByText(MOCK_REPLY)).toBeVisible();
    await expect(buyer.getByRole("button", { name: "Suggérer une réponse" })).toHaveCount(0);
    await buyer.context().close();
  });

  await seller.context().close();
});

test("une description proposée par l'assistant, dans le champ jusqu'à l'enregistrement", async ({
  page,
}) => {
  const path = `/vendeur/biens/${LK0001}/modifier/annonce`;
  await signIn(page, "seller_a", path);
  await expect(page).toHaveURL(path);
  const description = page.getByRole("textbox", { name: "Description" });
  const saved = await description.inputValue();
  const region = "Proposition de l'assistant";

  const box = await ask(page, "Rédiger avec l'assistant", region);
  await expect(box.getByText(MOCK_DESCRIPTION_START, { exact: false })).toBeVisible();
  await expectNoSeriousViolation(page);
  await box.getByRole("button", { name: "Ignorer" }).click();
  await expect(box).toHaveCount(0);
  await expect(description).toHaveValue(saved);

  const again = await ask(page, "Rédiger avec l'assistant", region);
  await again.getByRole("button", { name: "Utiliser" }).click();
  await expect(again).toHaveCount(0);
  await expect(description).toHaveValue(new RegExp(`^${MOCK_DESCRIPTION_START}`));
  // The form was not sent: same page, the button back with the focus.
  await expect(page).toHaveURL(path);
  await expect(page.getByRole("button", { name: "Rédiger avec l'assistant" })).toBeFocused();

  // Nothing saved before « Enregistrer ».
  await page.reload();
  await expect(description).toHaveValue(saved);
});
