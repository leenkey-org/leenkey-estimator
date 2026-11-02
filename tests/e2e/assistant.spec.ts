import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-28: the assistant of the seller (SPEC-V2 section 12, DESIGN.md 10.5 and
// 12), on the seed with the deterministic model (AI_MOCK=1 on the server and
// in the run: never the real model). Its panel from 768 px (AssistantFab),
// its page on a phone (the button of the header of « Ma vente »), an answer
// streamed, a change proposed with its before and after, cancelled: the
// listing stays as it is. The change confirmed: assistant-live.spec.ts.
// Only conversations of the assistant are written (and its count of the day).

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mocked = process.env.AI_MOCK === "1";

test.skip(
  !seeded || !SEED_PASSWORD || !mocked,
  "comptes de seed et modèle déterministe requis (E2E_SEED=1, SEED_PASSWORD, AI_MOCK=1)",
);

const property = (n: number) => `5eed1000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function signIn(page: Page, account: string, path: string) {
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

/** Opens the panel: a click before the page is hydrated opens nothing, clicked again until it does. */
async function openPanel(page: Page) {
  const panel = page.getByRole("dialog", { name: "Assistant Leenkey" });
  await expect(async () => {
    await page.getByRole("button", { name: "Assistant Leenkey" }).click();
    await expect(panel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return panel;
}

async function seriousViolations(page: Page, include?: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const builder = new AxeBuilder({ page });
  if (include) builder.include(include);
  const results = await builder.analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
}

test("le panneau de l'assistant : une question, un prix proposé puis annulé @a11y", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "le panneau s'ouvre à partir de 768 px");
  await signIn(page, "seller_a", `/vendeur?bien=${property(2)}`);
  const price = page.getByText("429 000 €", { exact: false }).first();
  await expect(price).toBeVisible();

  const panel = await openPanel(page);
  const fresh = panel.getByRole("button", { name: "Nouvelle conversation" });
  await expect(fresh).toBeEnabled();
  await fresh.click();
  await expect(panel.getByText("Posez vos questions sur votre vente")).toBeVisible();
  expect(await seriousViolations(page, '[role="dialog"]')).toEqual([]);

  await panel.getByLabel("Votre question").fill("Peux-tu baisser le prix de mon annonce ?");
  await panel.getByRole("button", { name: "Envoyer" }).click();
  const card = panel.getByRole("region", { name: "Modifier le prix de l'annonce" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Bien : Maison familiale 5 pièces avec jardin")).toBeVisible();
  await expect(card.getByText("Actuellement")).toBeVisible();
  await expect(card.getByText("424 000 €", { exact: false })).toBeVisible();
  expect(await seriousViolations(page, '[role="dialog"]')).toEqual([]);

  await card.getByRole("button", { name: "Annuler" }).click();
  await expect(card.getByText("Modification annulée : rien n'a changé.")).toBeVisible();
  await expect(panel.getByText("Très bien, je ne change rien.")).toBeVisible();

  // Opened again: the same conversation, the action answered.
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await openPanel(page);
  await expect(panel.getByText("Peux-tu baisser le prix de mon annonce ?")).toBeVisible();
  await expect(panel.getByText("Modification annulée : rien n'a changé.")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByText("429 000 €", { exact: false }).first()).toBeVisible();
});

test("la page de l'assistant sur téléphone : depuis Ma vente, une suggestion, une réponse @a11y", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "la page s'ouvre depuis l'en-tête sur téléphone");
  await signIn(page, "seller_a", `/vendeur?bien=${property(2)}`);
  await expect(page.getByRole("button", { name: "Assistant Leenkey" })).toBeHidden();
  await page.getByRole("link", { name: "Ouvrir l'assistant Leenkey" }).click();
  await expect(page).toHaveURL(`/assistant?bien=${property(2)}`);
  await expect(page).toHaveTitle("Assistant · Leenkey");
  await expect(page.getByRole("heading", { level: 1, name: "Assistant Leenkey" })).toBeVisible();

  await page.goto(`/assistant?nouvelle=1&bien=${property(2)}`);
  await expect(page.getByRole("button", { name: "Que dois-je faire maintenant ?" })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  const thread = page.getByRole("log", { name: "Conversation avec l'assistant" });
  // A click before the page is hydrated sends nothing: clicked again until it does.
  await expect(async () => {
    await page.getByRole("button", { name: "Que dois-je faire maintenant ?" }).click();
    await expect(thread.getByText("Vous", { exact: true })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect(
    thread.getByText("Réponse de test de l'assistant à : Que dois-je faire maintenant ?"),
  ).toBeVisible();
  // The field stays on the screen, above nothing (no tabs on this page).
  await expect(page.getByLabel("Votre question")).toBeInViewport();
  await expect(page.getByRole("link", { name: "Comment fonctionne l'assistant" })).toHaveAttribute(
    "href",
    "/intelligence-artificielle",
  );
  expect(await seriousViolations(page)).toEqual([]);
});

test("un acquéreur : pas de bouton de l'assistant, la page annonce celui qui arrive", async ({
  page,
}) => {
  await signIn(page, "buyer_c", "/acquereur");
  await expect(page.getByRole("button", { name: "Assistant Leenkey" })).toHaveCount(0);
  await page.goto("/assistant");
  await expect(page.getByText("L'assistant de l'espace acquéreur arrive")).toBeVisible();
  await expect(page.getByLabel("Votre question")).toHaveCount(0);
  // The route refuses the context of the seller to an account that does not sell.
  const response = await page.request.post("/api/ai/chat", {
    data: { context: "seller", message: "Bonjour" },
  });
  expect(response.status()).toBe(403);
});

test("la route : une session, une demande valide, sa propre conversation", async ({
  page,
  request,
}) => {
  const anonymous = await request.post("/api/ai/chat", {
    data: { context: "seller", message: "Bonjour" },
  });
  expect(anonymous.status()).toBe(401);

  // seller_a: seller_b and buyer_d are left to the gate of the terms (auth-journey.spec.ts).
  await signIn(page, "seller_a", "/vendeur");
  const invalid = await page.request.post("/api/ai/chat", {
    data: { context: "seller", message: "" },
  });
  expect(invalid.status()).toBe(400);
  const notTheirs = await page.request.post("/api/ai/chat", {
    data: {
      context: "seller",
      conversationId: "00000000-0000-4000-8000-000000000000",
      message: "Bonjour",
    },
  });
  expect(notTheirs.status()).toBe(404);
  // Someone else's property (15, of seller_b) for a new conversation.
  const othersProperty = await page.request.post("/api/ai/chat", {
    data: { context: "seller", propertyId: property(15), message: "Bonjour" },
  });
  expect(othersProperty.status()).toBe(400);
});
