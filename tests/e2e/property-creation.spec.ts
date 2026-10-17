import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Page } from "@playwright/test";

// L1-11: creation of a property, steps 1 (address) and 2 (characteristics),
// on the seed, with the address fixtures of core/geo (GEOCODER=fixtures for
// the server, exported by scripts/local-stack.sh env). Each run adds a draft
// to seller_a for good: project « seed-mutations » (playwright.config.ts),
// local stack and E2E_MUTATE=1 only, never on the preprod.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec ajoute un bien",
);

/** Signs seller_a in and lands on `path` (terms gate as in navigation.spec.ts). */
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
      .catch(() => {
        // Accepted by a parallel test in between: the page itself opens now.
      });
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
  await expect(page).toHaveURL(path);
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

const phone = devices["Pixel 7"];
test.use({
  viewport: { width: 390, height: 844 },
  userAgent: phone.userAgent,
  deviceScaleFactor: phone.deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
});

test("créer un bien en mobile : adresse, caractéristiques, reprise depuis Ma vente", async ({
  page,
}) => {
  await signIn(page, "/vendeur/biens/nouveau");
  await expect(page.getByRole("heading", { level: 1, name: "Mon bien" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Étape 1 sur 4 · Adresse" })).toHaveAttribute(
    "aria-valuenow",
    "25",
  );

  // Step 1: an address chosen in the list, with the keyboard. The actions
  // stay at the bottom of the screen, under a short form too.
  const next = page.getByRole("button", { name: "Continuer" });
  const bar = await next.boundingBox();
  expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeGreaterThan(844 - 60);
  await next.click();
  const field = page.getByRole("combobox", { name: "Adresse du bien" });
  await expect(field).toHaveAccessibleDescription(/Choisissez l'adresse dans la liste\./);
  await expect(field).toBeFocused();
  await field.fill("12 rue de la gare");
  await expect(page.getByRole("option", { name: /12 Rue de la Gare/ })).toBeVisible();
  await expect(field).toHaveAttribute("aria-expanded", "true");
  await expectNoSeriousViolation(page);
  await field.press("ArrowDown");
  await field.press("Enter");
  // The card: the street, then the postal code and the town.
  await expect(page.getByText("12 Rue de la Gare", { exact: true })).toBeVisible();
  await expect(page.getByText("91360 Épinay-sur-Orge", { exact: true })).toBeVisible();
  // The field gives way to the card: the focus goes on, the choice is said.
  await expect(next).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Adresse choisie" })).toHaveText(
    "Adresse choisie : 12 Rue de la Gare 91360 Épinay-sur-Orge.",
  );
  await next.press("Enter");
  await expect(page).toHaveURL(/\/vendeur\/biens\/[0-9a-f-]{36}\/caracteristiques$/);
  const id = new URL(page.url()).pathname.split("/")[3];

  // Step 2: type, surface and rooms needed to go on, values checked.
  await expect(
    page.getByRole("progressbar", { name: "Étape 2 sur 4 · Caractéristiques" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Caractéristiques · Mon bien · Leenkey");
  await expectNoSeriousViolation(page);
  // « Précédent » and « Continuer » side by side, flex 1 and 1.4 (DESIGN 10.1):
  // with their padding, about 1 to 1.3, as in Bien.png.
  const previousBox = await page
    .getByRole("button", { name: "Précédent", exact: true })
    .boundingBox();
  const nextBox = await next.boundingBox();
  const ratio = (nextBox?.width ?? 0) / (previousBox?.width ?? 1);
  expect(ratio).toBeGreaterThan(1.2);
  expect(ratio).toBeLessThan(1.4);
  await next.click();
  await expect(
    page.getByText("Le type, la surface et le nombre de pièces sont nécessaires pour continuer."),
  ).toBeVisible();
  await expect(page.getByLabel("Type de bien")).toBeFocused();
  await page.getByLabel("Type de bien").selectOption("appartement");
  await page.getByLabel("Surface habitable").fill("68,5");
  await page.getByLabel("Pièces", { exact: true }).fill("3");
  await page.getByLabel("Chambres").fill("4");
  await next.click();
  await expect(
    page.getByText("Il ne peut pas y avoir plus de chambres que de pièces."),
  ).toBeVisible();
  await page.getByLabel("Chambres").fill("2");
  await page.getByLabel("Étage", { exact: true }).fill("3");
  await page.getByRole("radio", { name: "DPE classe C" }).click();
  await page.getByRole("button", { name: "Balcon" }).click();
  const charges = page.getByLabel("Charges", { exact: true });
  await charges.fill("180");
  // Enter in a field means « Continuer », never the back button of the header.
  await charges.press("Enter");
  await expect(page).toHaveURL(`/vendeur/biens/${id}/prix`);
  await expect(page.getByText("La suite de votre annonce arrive")).toBeVisible();

  // Back to step 2: everything saved.
  await page.getByRole("link", { name: "Étape précédente" }).click();
  await expect(page).toHaveURL(`/vendeur/biens/${id}/caracteristiques`);
  await expect(page.getByLabel("Surface habitable")).toHaveValue("68,5");
  await expect(page.getByLabel("Chambres")).toHaveValue("2");
  await expect(page.getByRole("radio", { name: "DPE classe C" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("button", { name: "Balcon" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Charges", { exact: true })).toHaveValue("180");

  // A house has levels, not a floor: the field goes, and is saved empty.
  await page.getByLabel("Type de bien").selectOption("maison");
  await expect(page.getByLabel("Étage", { exact: true })).toHaveCount(0);
  await page.getByLabel("Niveaux").fill("2");

  // « Enregistrer »: back to « Ma vente », where the draft resumes.
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL("/vendeur");
  // Earlier runs left drafts of the same name: this one, by its address.
  const draft = page.locator(`a[href^="/vendeur/biens/${id}/"]`);
  await expect(draft).toHaveAccessibleName(/^Continuer : Maison\s3\spièces/);
  await draft.click();
  await expect(page).toHaveURL(`/vendeur/biens/${id}/prix`);
  await page.goto(`/vendeur/biens/${id}/caracteristiques`);
  await expect(page.getByLabel("Type de bien")).toHaveValue("maison");
  await expect(page.getByLabel("Niveaux")).toHaveValue("2");
  await page.getByLabel("Type de bien").selectOption("appartement");
  await expect(page.getByLabel("Étage", { exact: true })).toHaveValue("");

  // The address of a draft changes from step 1.
  await page.goto(`/vendeur/biens/${id}/adresse`);
  await expect(page.getByText("12 Rue de la Gare", { exact: true })).toBeVisible();
  await expect(page.getByText("91360 Épinay-sur-Orge", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Changer d'adresse" }).click();
  await expect(field).toBeFocused();
  await field.fill("8 avenue carnot");
  await page.getByRole("option", { name: /8 Avenue Carnot/ }).click();
  await expect(next).toBeFocused();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL("/vendeur");
  await expect(draft).toContainText("8 Avenue Carnot · Savigny-sur-Orge");
});

test("le bien d'un autre vendeur répond 404, une annonce en ligne ne se reprend pas", async ({
  page,
}) => {
  await signIn(page, "/vendeur");
  // A property of seller_b (seed), then an id that is not one.
  const response = await page.goto(
    "/vendeur/biens/5eed1000-0000-4000-8000-000000000008/caracteristiques",
  );
  expect(response?.status()).toBe(404);
  expect((await page.goto("/vendeur/biens/pas-un-id/adresse"))?.status()).toBe(404);
  // A published listing of seller_a: changed from its page (L1-14), not here.
  await page.goto("/vendeur/biens/5eed1000-0000-4000-8000-000000000001/caracteristiques");
  await expect(page).toHaveURL("/vendeur");
});
