import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L2-06: the assistant of the buyer, from a listing (SPEC-V2 section 12:
// « page annonce »), with the deterministic model (AI_MOCK=1): a question
// about the listing being read, an offer prepared then cancelled (nothing
// written), prepared and confirmed (the form of the offer opens, its price
// filled at its step, nothing sent to the seller), a request handed to the
// team. buyer_c (Chloé) has declared her project in the seed; the listing is
// the 3 pièces of seller_b in Viry-Châtillon (LK-0009, 199 000 €), which no
// other spec makes an offer on. The draft and the request stay: this spec
// changes the seed for good (project « seed-mutations »). Needs E2E_SEED=1,
// SEED_PASSWORD, E2E_MUTATE=1, AI_MOCK=1 and a local stack.

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

const LISTING = "/annonce/appartement-3-pieces-viry-chatillon-lk0009";

async function signIn(page: Page, account: "buyer_c", path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  // A listing is public: the terms are asked on a page of the signed-in areas.
  await page.goto("/compte");
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL((url) => url.pathname !== "/conditions");
  }
  await page.goto(path);
}

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
}

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

const thread = (page: Page) => page.getByRole("log", { name: "Conversation avec l'assistant" });

async function ask(page: Page, question: string) {
  await page.getByLabel("Votre question").fill(question);
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
}

test("un acquéreur, depuis une annonce : une question, une offre préparée puis ouverte, une demande à l'équipe @a11y", async ({
  page,
}) => {
  test.setTimeout(180_000);
  let listingId = "";

  await test.step("l'annonce propose l'assistant à un acquéreur connecté, pas à un visiteur", async () => {
    await page.goto(LISTING);
    await expect(page.getByRole("link", { name: "Demander à l'assistant" })).toHaveCount(0);
    await signIn(page, "buyer_c", LISTING);
    const link = page.getByRole("link", { name: "Demander à l'assistant" }).locator("visible=true");
    await expect(link).toBeVisible();
    await shots(page, "listing-ask-assistant");
    await link.click();
    await page.waitForURL((address) => address.pathname === "/assistant");
    listingId = new URL(page.url()).searchParams.get("annonce") ?? "";
    expect(listingId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(page.getByRole("link", { name: "Retour à l'annonce" })).toHaveAttribute(
      "href",
      LISTING,
    );
  });

  await test.step("une question sur le bien consulté", async () => {
    const suggestion = page.getByRole("button", { name: "Que faut-il savoir sur ce bien ?" });
    // A new conversation: a click before the page is hydrated does nothing, clicked again until it does.
    await expect(async () => {
      await page.getByRole("button", { name: "Nouvelle conversation" }).click();
      await expect(suggestion).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(async () => {
      await suggestion.click();
      await expect(thread(page).getByText("Vous", { exact: true })).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    // Read from the listing itself (get_listing_public), the one of the page.
    await expect(thread(page).getByText(/^Cette annonce : .*3 pièces/)).toBeVisible();
  });

  await test.step("une offre préparée, relue, annulée : rien n'est écrit", async () => {
    await ask(page, "Je veux faire une offre à 185 000 € sur ce bien");
    const card = page.getByRole("region", { name: "Préparer mon offre d'achat" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Viry-Châtillon")).toBeVisible();
    await expect(card.getByText("Prix affiché", { exact: true })).toBeVisible();
    await expect(card.getByText("199 000 €")).toBeVisible();
    await expect(card.getByText("Votre prix")).toBeVisible();
    await expect(card.getByText("185 000 €")).toBeVisible();
    await expect(card.getByText("Écart avec le prix affiché : -7 %")).toBeVisible();
    await expect(
      card.getByText("Rien n'est envoyé au vendeur : vous complétez et relisez votre offre"),
    ).toBeVisible();
    // Never a judgement on the financing of the buyer.
    await expect(page.getByText(/financement validé|peut financer/i)).toHaveCount(0);
    expect(await seriousViolations(page)).toEqual([]);
    await shots(page, "assistant-offer-card");
    await card.getByRole("button", { name: "Annuler" }).click();
    await expect(card.getByText("Préparation annulée : rien n'a changé.")).toBeVisible();
    await expect(thread(page).getByText("Très bien, je ne prépare rien.")).toBeVisible();
    await page.goto("/acquereur");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Vos offres d'achat" }).getByText("Viry-Châtillon"),
    ).toHaveCount(0);
  });

  await test.step("confirmée : le formulaire de l'offre s'ouvre, son prix repris à son étape", async () => {
    await page.goto(`/assistant?annonce=${listingId}`);
    await expect(page.getByText("Préparation annulée : rien n'a changé.")).toBeVisible();
    await expect(async () => {
      await ask(page, "Je veux faire une offre à 185 000 € sur ce bien");
      await expect(
        page.getByRole("region", { name: "Préparer mon offre d'achat" }).last(),
      ).toContainText("Votre prix", { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    const card = page.getByRole("region", { name: "Préparer mon offre d'achat" }).last();
    await card.getByRole("button", { name: "Préparer mon offre" }).click();
    await page.waitForURL((address) => address.pathname === "/offres/nouvelle");
    expect(new URL(page.url()).searchParams.get("listing")).toBe(listingId);
    // The first step, from the account of the buyer: the assistant filled the price only.
    await expect(
      page.getByRole("progressbar", { name: "Étape 1 sur 7 · L'acquéreur" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Dubois");
    await expect(page.getByLabel("Prénom")).toHaveValue("Chloé");
    await page.getByLabel("Date de naissance").fill("1990-06-15");
    await page.getByLabel("Adresse").fill("8 rue des Écoles");
    await page.getByLabel("Code postal").fill("91600");
    await page.getByLabel("Ville").fill("Savigny-sur-Orge");
    await page.getByLabel("Téléphone").fill("06 12 34 56 78");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(
      page.getByRole("progressbar", { name: "Étape 2 sur 7 · Le bien concerné" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Continuer" }).click();
    await expect(
      page.getByRole("progressbar", { name: "Étape 3 sur 7 · Mon offre" }),
    ).toBeVisible();
    await expect(page.getByLabel("Prix proposé")).toHaveValue(/^185\s?000$/);
    await expect(page.getByText("cent quatre-vingt-cinq mille euros")).toBeVisible();
  });

  await test.step("un brouillon, jamais une offre envoyée ; la conversation y ramène", async () => {
    await page.goto("/acquereur");
    const line = page
      .getByRole("list", { name: "Vos offres d'achat" })
      .getByRole("link")
      .filter({ hasText: "Viry-Châtillon" });
    await expect(line).toContainText("Brouillon");
    await expect(line).toContainText("185 000 €");
    await page.goto(`/assistant?annonce=${listingId}`);
    const card = page.getByRole("region", { name: "Préparer mon offre d'achat" }).last();
    await expect(card.getByText("Votre offre est préparée avec ce prix.")).toBeVisible();
    await expect(card.getByRole("link", { name: "Continuer mon offre" })).toHaveAttribute(
      "href",
      `/offres/nouvelle?listing=${listingId}`,
    );
  });

  await test.step("une demande transmise à l'équipe, relue avant de partir", async () => {
    await ask(page, "Je voudrais écrire à l'équipe Leenkey au sujet de cette annonce");
    const card = page.getByRole("region", { name: "Écrire à l'équipe Leenkey" });
    await expect(card.getByText("Demande d'un acquéreur")).toBeVisible();
    await expect(card.getByText(/^Demande transmise par l'assistant : Je voudrais/)).toBeVisible();
    // A buyer has no adviser: nothing about a plan.
    await expect(card.getByText(/^Bien :/)).toHaveCount(0);
    await card.getByRole("button", { name: "Envoyer" }).click();
    await expect(card.getByText(/^Demande transmise à l'équipe Leenkey/)).toBeVisible();
    await expect(thread(page).getByText("C'est transmis à l'équipe Leenkey.")).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await shots(page, "assistant-buyer-conversation");
  });
});
