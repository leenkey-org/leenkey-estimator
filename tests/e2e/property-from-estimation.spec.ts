import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Page } from "@playwright/test";

// L1-13b: from an analysis of value to a listing waiting for review
// (criterion of L1-13), through /api/estimate as the wizard calls it, with
// the address fixtures of core/geo (GEOCODER=fixtures). Each run adds a
// listing waiting for review to seller_a for good: project « seed-mutations »,
// local stack and E2E_MUTATE=1 only, never on the preprod.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec ajoute une annonce",
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ADDRESS = "12 Rue de la Gare 91360 Épinay-sur-Orge";

/** What the wizard sends (leenkey/estimator/Wizard.tsx, buildPayload). */
const payload = {
  meta: { source: "formulaire_leenkey", timestamp: "2026-10-19T08:00:00.000Z", session_id: "e2e" },
  bien: {
    type: "appartement",
    adresse: ADDRESS,
    code_postal: "91360",
    ville: "Épinay-sur-Orge",
    surface_habitable: 68.5,
    pieces: 3,
    chambres: 2,
    etage: 3,
    nb_etages_batiment: 5,
  },
  exterieur: ["balcon", "cave"],
  energie: { dpe: "C", ges: "D", chauffage: "Gaz naturel", chauffage_mode: "Individuel" },
  situation: { charges_copro_mensuelles: 180 },
  estimation: { prix_estime: 342000, prix_bas: 325000, prix_haut: 360000 },
  comparables_dvf: null,
  contact: { prenom: "Alice", nom: "Recette", email: "seller_a@test.leenkey.fr" },
};

/** Signs in and lands on `path`, past the terms gate of a fresh seed. */
async function signIn(page: Page, email: string, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  // Already on the page after the sign-in: opened again, it would claim the
  // analysis a second time while the first claim runs (token then used).
  const here = new URL(page.url());
  if (`${here.pathname}${here.search}` !== path) await page.goto(path);
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
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
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

test("une analyse de valeur devient une annonce en validation", async ({ page }) => {
  await signIn(page, "seller_a@test.leenkey.fr", "/vendeur");
  // Signed in: the analysis is theirs at once, without a token.
  const response = await page.request.post("/api/estimate", { data: payload });
  expect(response.ok()).toBe(true);
  const kept = await response.json();
  expect(kept.ref).toMatch(/^EST-/);
  expect(kept.estimationId).toMatch(UUID);
  expect(kept.claimToken).toBeNull();

  // Step 1: the address of the analysis, chosen again.
  await page.goto(`/vendeur/biens/nouveau?estimation=${kept.estimationId}`);
  const note = page.getByText(
    /^Repris de votre analyse de valeur du .+\. Vérifiez et complétez\.$/,
  );
  await expect(note).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Adresse du bien" })).toHaveValue(ADDRESS);
  await expectNoSeriousViolation(page);
  await page.getByRole("option", { name: /12 Rue de la Gare/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/vendeur\/biens\/[0-9a-f-]{36}\/caracteristiques$/);
  const id = new URL(page.url()).pathname.split("/")[3];

  // Step 2: the characteristics taken over, to check.
  await expect(note).toBeVisible();
  await expect(page.getByLabel("Type de bien")).toHaveValue("appartement");
  await expect(page.getByLabel("Surface habitable")).toHaveValue("68,5");
  await expect(page.getByLabel("Pièces", { exact: true })).toHaveValue("3");
  await expect(page.getByLabel("Chambres")).toHaveValue("2");
  await expect(page.getByLabel("Étage", { exact: true })).toHaveValue("3");
  await expect(page.getByRole("radio", { name: "DPE classe C" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("button", { name: "Balcon" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Cave" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Chauffage")).toHaveValue("Individuel gaz");
  await expect(page.getByLabel("Charges", { exact: true })).toHaveValue("180");
  await expectNoSeriousViolation(page);
  await page.getByRole("button", { name: "Continuer" }).click();

  // Step 3: the value of the analysis recalled, the gap to the price.
  await expect(page).toHaveURL(`/vendeur/biens/${id}/prix`);
  await expect(page.getByText(/^Votre analyse de valeur du /)).toBeVisible();
  await expect(
    page.getByText("342 000 €, dans une fourchette de 325 000 € à 360 000 €."),
  ).toBeVisible();
  await page.getByLabel("Prix de vente").fill("349 000");
  await expect(page.getByText("Votre prix est 2 % au-dessus de cette valeur.")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("Trois pièces traversant au 3e étage, balcon et cave, à deux pas de la gare.");
  await page.getByRole("button", { name: "Continuer" }).click();

  // Step 4, then sent for review: the criterion of L1-13.
  await expect(page).toHaveURL(`/vendeur/biens/${id}/apercu`);
  await page.getByRole("button", { name: "Envoyer en validation" }).click();
  await expect(page).toHaveURL(`/vendeur/biens/${id}/envoye`);
  await expect(page.getByRole("heading", { level: 1, name: "C'est envoyé." })).toBeVisible();

  // The same analysis never makes a second property.
  await page.goto(`/vendeur/biens/nouveau?estimation=${kept.estimationId}`);
  await expect(page).toHaveURL("/vendeur");
});

test("une analyse faite sans compte est reprise après la connexion, dans ce navigateur", async ({
  page,
  browser,
}) => {
  const anonymous = await page.context().storageState();
  const response = await page.request.post("/api/estimate", { data: payload });
  const kept = await response.json();
  expect(kept.estimationId).toMatch(UUID);
  expect(kept.claimToken).toMatch(/^[0-9a-f]{48}$/);
  // As the wizard keeps it (leenkey/estimator/listing-link.ts).
  await page.goto("/");
  await page.evaluate(
    ([estimationId, token]) =>
      localStorage.setItem("lk_estimation_claim", JSON.stringify({ id: estimationId, token })),
    [kept.estimationId, kept.claimToken],
  );

  // Another browser, without the token: the creation without the answers.
  const other = await browser.newContext({
    storageState: anonymous,
    viewport: { width: 390, height: 844 },
  });
  const otherPage = await other.newPage();
  await signIn(
    otherPage,
    "seller_b@test.leenkey.fr",
    `/vendeur/biens/nouveau?estimation=${kept.estimationId}`,
  );
  await expect(otherPage).toHaveURL("/vendeur/biens/nouveau");
  await expect(otherPage.getByRole("combobox", { name: "Adresse du bien" })).toHaveValue("");
  await other.close();

  // This browser: attached once signed in, then taken over.
  await signIn(
    page,
    "seller_a@test.leenkey.fr",
    `/vendeur/biens/nouveau?estimation=${kept.estimationId}`,
  );
  await expect(
    page.getByText(/^Repris de votre analyse de valeur du .+\. Vérifiez et complétez\.$/),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Adresse du bien" })).toHaveValue(ADDRESS);
  expect(await page.evaluate(() => localStorage.getItem("lk_estimation_claim"))).toBeNull();
});
