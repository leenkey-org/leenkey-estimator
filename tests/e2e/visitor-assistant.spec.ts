import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The assistant of the public site (DECISIONS.md 2026-11-07), on the seed
// with the deterministic model (AI_MOCK=1 on the server and in the run: never
// the real model): « Une question ? » on the home page, a question asked
// without an account, its answer streamed, the steps to go further, the
// conversation kept from page to page and when the panel is closed during
// an answer, the limit of the day; not on the other pages, nor for an
// account. Only conversations of visitors are written (and their counts of
// the day): about 28 questions a run (mobile and desktop), so three runs a
// day on the same base before the 100 of the site are used up (« très
// sollicité »); a fresh stack, or the next day, starts again from none.

const seeded = process.env.E2E_SEED === "1";
const mocked = process.env.AI_MOCK === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const answerTo = (question: string) => `Réponse de test de l'assistant du site à : ${question}`;

test.skip(!seeded || !mocked, "base et modèle déterministe requis (E2E_SEED=1, AI_MOCK=1)");

/** Opens the panel: a click before the page is hydrated opens nothing, clicked again until it does. */
async function openPanel(page: Page) {
  const panel = page.getByRole("dialog", { name: "Assistant Leenkey" });
  await expect(async () => {
    await page.getByRole("button", { name: "Une question ?" }).click();
    await expect(panel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return panel;
}

test("une question sans compte, sa réponse, les étapes pour avancer", async ({ page }) => {
  await page.goto("/");
  const panel = await openPanel(page);
  await expect(panel.getByText("je vous aide à choisir la formule adaptée")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Nouvelle conversation" })).toBeDisabled();

  await panel.getByRole("button", { name: "Quelle formule me convient ?" }).click();
  const thread = panel.getByRole("log", { name: "Conversation avec l'assistant Leenkey" });
  await expect(thread.getByText("Quelle formule me convient ?", { exact: true })).toBeVisible();
  await expect(
    thread.getByText("Réponse de test de l'assistant du site à : Quelle formule me convient ?"),
  ).toBeVisible();

  // A question typed, then the steps to go further.
  await panel.getByRole("textbox", { name: "Votre question" }).fill("Comment souscrire ?");
  await panel.getByRole("button", { name: "Envoyer" }).click();
  await expect(
    thread.getByText("Réponse de test de l'assistant du site à : Comment souscrire ?"),
  ).toBeVisible();
  const next = panel.getByRole("navigation", { name: "Pour avancer" });
  await expect(next.getByRole("link", { name: "Valoriser mon bien" })).toHaveAttribute(
    "href",
    "/estimer",
  );
  await expect(next.getByRole("link", { name: "Voir les formules" })).toHaveAttribute(
    "href",
    "/tarifs",
  );
  await expect(next.getByRole("link", { name: "Créer mon compte" })).toHaveAttribute(
    "href",
    "/inscription?role=seller",
  );
  await expect(panel.getByText("sans avis juridique")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);

  // Kept from page to page in the tab: on /tarifs, the same conversation.
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.goto("/tarifs");
  const again = await openPanel(page);
  await expect(again.getByText("Comment souscrire ?", { exact: true })).toBeVisible();
  await again.getByRole("button", { name: "Nouvelle conversation" }).click();
  await expect(again.getByText("Comment souscrire ?", { exact: true })).toHaveCount(0);
  await expect(again.getByRole("button", { name: "Est-ce vraiment gratuit ?" })).toBeVisible();
});

test("le visiteur est reconnu par un cookie posé à sa première question", async ({
  page,
  context,
}) => {
  await page.goto("/faq");
  expect((await context.cookies()).some((cookie) => cookie.name === "lk_visitor")).toBe(false);
  const panel = await openPanel(page);
  await panel.getByRole("button", { name: "Est-ce vraiment gratuit ?" }).click();
  await expect(panel.getByText("Réponse de test de l'assistant du site")).toBeVisible();
  const cookie = (await context.cookies()).find((candidate) => candidate.name === "lk_visitor");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.value).toMatch(/^[0-9a-f]{64}$/);
  // Sent back to the assistant only, never with the pages.
  expect(cookie?.path).toBe("/api/ai/visitor");
});

test("une réponse continue quand le panneau est fermé, et s'affiche à sa réouverture", async ({
  page,
}) => {
  // The answer held back a moment: the panel is closed before it arrives.
  await page.route("**/api/ai/visitor", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.fulfill({ response });
  });
  await page.goto("/");
  const panel = await openPanel(page);
  await panel.getByRole("textbox", { name: "Votre question" }).fill("Et si je ferme ?");
  await panel.getByRole("button", { name: "Envoyer" }).click();
  await expect(panel.getByText("L'assistant écrit…")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  const again = await openPanel(page);
  await expect(again.getByText("Et si je ferme ?", { exact: true })).toBeVisible();
  await expect(again.getByText(answerTo("Et si je ferme ?"))).toBeVisible();

  // « Nouvelle conversation »: the field keeps the focus.
  await again.getByRole("button", { name: "Nouvelle conversation" }).click();
  await expect(again.getByRole("textbox", { name: "Votre question" })).toBeFocused();
});

test("au-delà des questions du jour, la question est rendue et « Nous écrire » proposé", async ({
  page,
}) => {
  await page.goto("/faq");
  const panel = await openPanel(page);
  await panel.getByRole("button", { name: "Est-ce vraiment gratuit ?" }).click();
  await expect(panel.getByText(answerTo("Est-ce vraiment gratuit ?"))).toBeVisible();
  // Nine more by the same visitor (its cookie): 10 in the day.
  for (let n = 2; n <= 10; n += 1) {
    const response = await page.request.post("/api/ai/visitor", {
      data: { message: `Question ${n}` },
    });
    expect(response.status()).toBe(200);
    await response.body();
  }
  const field = panel.getByRole("textbox", { name: "Votre question" });
  await field.fill("Une question de trop");
  await panel.getByRole("button", { name: "Envoyer" }).click();
  await expect(
    panel.getByText("Vous avez posé le nombre de questions possible pour aujourd'hui", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(panel.getByRole("link", { name: "Nous écrire" })).toHaveAttribute(
    "href",
    "/contact",
  );
  await expect(field).toHaveValue("Une question de trop");
  // Refused before it was written: not in the conversation.
  await expect(
    panel
      .getByRole("log", { name: "Conversation avec l'assistant Leenkey" })
      .getByText("Une question de trop", { exact: true }),
  ).toHaveCount(0);
});

test("seulement sur les pages qui le proposent", async ({ page }) => {
  for (const path of ["/concept", "/vendre"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Une question ?" }), path).toBeVisible();
  }
  for (const path of ["/qui-sommes-nous", "/contact", "/acheter", "/cgu"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Une question ?" }), path).toHaveCount(0);
  }
});

test("pas pour un compte connecté : il a l'assistant de son espace", async ({ page }) => {
  test.skip(!SEED_PASSWORD, "comptes de seed requis (SEED_PASSWORD)");
  await page.goto("/connexion?next=%2F");
  await page.getByLabel("Email").fill("buyer_c@test.leenkey.fr");
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  for (const path of ["/", "/tarifs"]) {
    await page.goto(path);
    if (new URL(page.url()).pathname === "/conditions") {
      // The current terms, accepted once (a new version since the seed).
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Continuer" }).click();
      await page.waitForURL((url) => url.pathname !== "/conditions");
      await page.goto(path);
    }
    await expect(page).toHaveURL((url) => url.pathname === path);
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Une question ?" }), path).toHaveCount(0);
  }
});

test("seulement depuis ce site, en JSON", async ({ request }) => {
  const other = await request.post("/api/ai/visitor", {
    data: { message: "Bonjour" },
    headers: { "sec-fetch-site": "cross-site" },
  });
  expect(other.status()).toBe(403);
  expect(other.headers()["set-cookie"]).toBeUndefined();
  const text = await request.post("/api/ai/visitor", {
    data: JSON.stringify({ message: "Bonjour" }),
    headers: { "content-type": "text/plain" },
  });
  expect(text.status()).toBe(415);
});

test("une question vide ou trop longue n'est pas envoyée", async ({ request }) => {
  const empty = await request.post("/api/ai/visitor", { data: { message: "   " } });
  expect(empty.status()).toBe(400);
  const long = await request.post("/api/ai/visitor", { data: { message: "a".repeat(501) } });
  expect(long.status()).toBe(400);
  const other = await request.post("/api/ai/visitor", {
    data: { message: "Bonjour", context: "admin" },
  });
  expect(other.status()).toBe(400);
});
