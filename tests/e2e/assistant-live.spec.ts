import { expect, test, type Page } from "@playwright/test";

// L1-28, the acceptance of the task: « Modification de description via
// assistant avec confirmation ». The assistant proposes a new description of
// a listing online (deterministic model, AI_MOCK=1), the seller sees the
// current one and the new one, confirms: the listing changes, and the
// assistant says it once the tool has answered. Changes the seed for good:
// only on a local stack just made by `scripts/local-stack.sh up`, with
// E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1 and AI_MOCK=1, never on the
// preprod (project « seed-mutations »). Seed listing used here only: LK-0001
// of seller_a.

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

const id = "5eed1000-0000-4000-8000-000000000001";

async function signIn(page: Page, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill("seller_a@test.leenkey.fr");
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

test("la description de l'annonce modifiée par l'assistant, après confirmation", async ({
  page,
}) => {
  await signIn(page, `/vendeur/biens/${id}/annonce`);
  await expect(page).toHaveURL(`/vendeur/biens/${id}/annonce`);

  // From the page of the property: the conversation is about it.
  const panel = await openPanel(page);
  await panel.getByRole("button", { name: "Nouvelle conversation" }).click();
  await panel.getByLabel("Votre question").fill("Réécris la description de mon annonce");
  await panel.getByRole("button", { name: "Envoyer" }).click();

  const card = panel.getByRole("region", { name: "Modifier la description de l'annonce" });
  const after = card
    .getByText("Proposé", { exact: true })
    .locator("xpath=following-sibling::div[1]");
  await expect(after).toBeVisible();
  const proposed = (await after.innerText()).trim();
  expect(proposed).toMatch(/^Bien (au calme|lumineux)/);
  // Nothing written before the confirmation.
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByText(proposed)).toHaveCount(0);

  await openPanel(page);
  await expect(card.getByRole("button", { name: "Confirmer" })).toBeVisible();
  await card.getByRole("button", { name: "Confirmer" }).click();
  await expect(card.getByText("Modification enregistrée.")).toBeVisible();
  await expect(panel.getByText("C'est fait : votre annonce est à jour.")).toBeVisible();
  await page.keyboard.press("Escape");

  // The page behind shows it (router.refresh), and so does the page read again.
  await expect(page.getByText(proposed).first()).toBeVisible();
  await page.goto(`/vendeur/biens/${id}/annonce`);
  await expect(page.getByText(proposed).first()).toBeVisible();
});
