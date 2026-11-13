import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L2-03: a buyer makes an offer on a listing, in seven steps (SPEC-V2 13):
// the draft is saved at each step, the document is read again, then sent and
// frozen; its PDF is drawn for the buyer only. buyer_c (Chloé) has declared
// her project in the seed (down payment 60 000 €, loan 320 000 €); the listing
// is the 2 pièces of seller_a in Morsang-sur-Orge (159 000 €). The offer
// stays: this spec changes the seed for good (project « seed-mutations »).
// Needs E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1 and a local stack.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec envoie une offre",
);

const LISTING = "/annonce/appartement-2-pieces-morsang-sur-orge-lk0003";

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
}

/** Signs a seed account in, accepts the terms when asked, and lands on `path`. */
async function signIn(page: Page, account: "seller_a" | "seller_b" | "buyer_c", path: string) {
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

const step = (page: Page, label: string) => page.getByRole("progressbar", { name: label });
const next = (page: Page) => page.getByRole("button", { name: "Continuer" });

test("un acquéreur fait une offre en sept étapes, la relit, l'envoie ; elle est figée", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const url = baseURL ?? "http://localhost:3100";
  let listingId = "";
  let offerPath = "";

  await test.step("« Faire une offre » depuis l'annonce ouvre le formulaire", async () => {
    await signIn(page, "buyer_c", LISTING);
    await page.getByRole("link", { name: "Faire une offre" }).click();
    await page.waitForURL((address) => address.pathname === "/offres/nouvelle");
    listingId = new URL(page.url()).searchParams.get("listing") ?? "";
    expect(listingId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Faire une offre" })).toBeVisible();
    await expect(step(page, "Étape 1 sur 7 · L'acquéreur")).toBeVisible();
  });

  await test.step("étape 1 : l'identité, reprise du compte, complétée et contrôlée", async () => {
    await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Dubois");
    await expect(page.getByLabel("Prénom")).toHaveValue("Chloé");
    await expect(page.getByLabel("E-mail")).toHaveValue("buyer_c@test.leenkey.fr");
    await next(page).click();
    await expect(page.getByText("Indiquez une date de naissance valide.")).toBeVisible();
    await expect(page.getByLabel("Date de naissance")).toBeFocused();
    await page.getByLabel("Date de naissance").fill("1990-06-15");
    await page.getByLabel("Adresse").fill("8 rue des Écoles");
    await page.getByLabel("Code postal").fill("91600");
    await page.getByLabel("Ville").fill("Savigny-sur-Orge");
    await page.getByLabel("Téléphone").fill("06 12 34 56 78");

    // « À deux / indivision » asks for a co-buyer.
    await page.getByLabel("Acquisition envisagée").selectOption("joint");
    await next(page).click();
    await expect(
      page.getByText(
        "Pour une acquisition à deux ou en indivision, ajoutez au moins un co-acquéreur.",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ajouter un co-acquéreur" }).click();
    const coBuyer = page.getByRole("group", { name: "Co-acquéreur 1" });
    await coBuyer.getByLabel("Nom", { exact: true }).fill("Dubois");
    await coBuyer.getByLabel("Prénom").fill("Marc");
    await coBuyer.getByLabel("Date de naissance").fill("1989-02-01");
    await coBuyer.getByLabel("Adresse").fill("8 rue des Écoles");
    await coBuyer.getByLabel("Code postal").fill("91600");
    await coBuyer.getByLabel("Ville").fill("Savigny-sur-Orge");
    await coBuyer.getByLabel("E-mail").fill("marc.dubois@example.fr");
    await coBuyer.getByLabel("Téléphone").fill("06 98 76 54 32");
    expect(await seriousViolations(page)).toEqual([]);
    await next(page).click();
  });

  await test.step("étape 2 : le bien, repris de l'annonce, rien à saisir", async () => {
    await expect(step(page, "Étape 2 sur 7 · Le bien concerné")).toBeVisible();
    await expect(page.getByText("Repris de l'annonce, non modifiable")).toBeVisible();
    await expect(page.getByText("91390 Morsang-sur-Orge")).toBeVisible();
    await expect(page.getByText("Cave", { exact: true })).toBeVisible();
    await expect(page.locator("main input, main textarea, main select")).toHaveCount(0);
    await page.getByRole("link", { name: "Continuer" }).click();
  });

  await test.step("étape 3 : le prix, en lettres, et l'écart au prix affiché", async () => {
    await expect(step(page, "Étape 3 sur 7 · Mon offre")).toBeVisible();
    await next(page).click();
    await expect(page.getByText("Ce champ est obligatoire.")).toBeVisible();
    await page.getByLabel("Prix proposé").fill("150 000");
    await expect(page.getByText("cent cinquante mille euros")).toBeVisible();
    const gap = page.locator("dl").filter({ hasText: "Prix affiché" });
    await expect(gap).toContainText("159 000 €");
    await expect(gap).toContainText("−9 000 € · −5,7 %");
    await next(page).click();
  });

  await test.step("étape 4 : le financement déclaré, le budget estimé, sans verdict", async () => {
    await expect(step(page, "Étape 4 sur 7 · Financement")).toBeVisible();
    // The project declared on the profile, to confirm.
    await expect(page.getByRole("radio", { name: /Avec prêt/ })).toBeChecked();
    // Thousands are separated by a narrow no-break space (lib/format.ts).
    await expect(page.getByLabel("Apport personnel")).toHaveValue(/^60\s000$/);
    await expect(page.getByLabel("Montant prévisionnel du prêt")).toHaveValue(/^320\s000$/);
    await next(page).click();
    await expect(page.getByText("Indiquez une durée de 1 à 40 ans.")).toBeVisible();
    await page.getByLabel("Montant prévisionnel du prêt").fill("100 000");
    await page.getByLabel("Durée envisagée").fill("25");
    await page.getByLabel("Taux maximal envisagé").fill("3,85");
    await page.getByLabel("Situation du financement").selectOption("simulation_done");
    const budget = page.locator("div").filter({ hasText: /^Budget global estimé du projet/ });
    await expect(budget).toContainText("Frais d'acquisition indicatifs (7,5 %)");
    await expect(budget).toContainText("11 250 €");
    await expect(budget).toContainText("161 250 €");
    await expect(budget).toContainText(
      "Votre apport et votre prêt représentent 160 000 € pour un budget global estimé à 161 250 €.",
    );
    await expect(page.getByRole("heading", { name: "Justificatif de financement" })).toBeVisible();
    await expect(page.getByText(/financement validé/i)).toHaveCount(0);
    expect(await seriousViolations(page)).toEqual([]);
    await next(page).click();
  });

  await test.step("étape 5 : les conditions, l'avertissement affiché d'emblée", async () => {
    await expect(step(page, "Étape 5 sur 7 · Conditions de l'offre")).toBeVisible();
    await expect(
      page.getByText(/^Attention : les conditions juridiques définitives de la vente/),
    ).toContainText("la condition suspensive de financement devra notamment");
    await expect(page.getByText("Offre formulée avec recours à un prêt immobilier.")).toBeVisible();
    await page.getByLabel("Autre situation à préciser").check();
    await next(page).click();
    await expect(page.getByText("Précisez la situation.")).toBeVisible();
    await page.getByLabel("Autre situation à préciser").uncheck();
    await page.getByLabel("Vente préalable d'un autre bien").check();
    await page.getByLabel("Précisions").fill("Compromis signé sur notre appartement actuel.");
    await next(page).click();
  });

  await test.step("étape 6 : la validité, 5 jours proposés", async () => {
    await expect(step(page, "Étape 6 sur 7 · Durée de validité")).toBeVisible();
    await expect(page.getByLabel("Votre offre est valable")).toHaveValue("5");
    await expect(
      page.getByText(/^La présente offre est valable jusqu'au : \d{2}\/\d{2}\/\d{4} à \d{2}:00$/),
    ).toBeVisible();
    await next(page).click();
  });

  await test.step("étape 7 : la visite et les quatre déclarations avant de relire", async () => {
    await expect(step(page, "Étape 7 sur 7 · Déclarations et envoi")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Avant d'envoyer votre offre" })).toBeVisible();
    const review = page.getByRole("button", { name: "Relire mon offre" });
    await expect(review).toBeDisabled();
    // The radio is under its card: the card is what a buyer clicks.
    await page.locator("label").filter({ hasText: "Bien visité" }).click();
    await expect(page.getByRole("radio", { name: /Bien visité/ })).toBeChecked();
    for (const box of await page.getByRole("checkbox").all()) await box.check();
    expect(await seriousViolations(page)).toEqual([]);
    await expect(review).toBeEnabled();
    await review.click();
  });

  await test.step("relecture : le document, sans écart ni statut, puis l'envoi", async () => {
    await expect(step(page, "Relecture de votre offre")).toBeVisible();
    const document = page.getByRole("article");
    await expect(document.getByRole("heading", { name: "OFFRE D'ACHAT LEENKEY" })).toBeVisible();
    await expect(document).toContainText(/Référence de l'offre : LK-\d{4}-\d{5}/);
    await expect(document).toContainText(
      "Nous soussignés Chloé Dubois et Marc Dubois formulons une offre d'achat",
    );
    await expect(document).toContainText("150 000 €");
    await expect(document).toContainText("cent cinquante mille euros");
    await expect(document).toContainText("À deux / indivision");
    await expect(document).toContainText("Vente préalable d'un autre bien");
    await expect(document).not.toContainText(/Écart|Prix affiché|159 000|vérifié par|validé/);
    expect(await seriousViolations(page)).toEqual([]);

    // A step changed after the declarations unticks them.
    await page.getByRole("link", { name: "Modifier" }).click();
    await expect(step(page, "Étape 1 sur 7 · L'acquéreur")).toBeVisible();
    await expect(page.getByLabel("Date de naissance").first()).toHaveValue("1990-06-15");
    await next(page).click();
    await expect(step(page, "Étape 2 sur 7 · Le bien concerné")).toBeVisible();
    await page.goto(`/offres/nouvelle?listing=${listingId}&etape=relecture`);
    await expect(step(page, "Étape 7 sur 7 · Déclarations et envoi")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Bien visité/ })).toBeChecked();
    for (const box of await page.getByRole("checkbox").all()) {
      await expect(box).not.toBeChecked();
      await box.check();
    }
    await page.getByRole("button", { name: "Relire mon offre" }).click();
    await page.getByRole("button", { name: "Envoyer mon offre au vendeur" }).click();
    await page.waitForURL((address) => /^\/offres\/[0-9a-f-]{36}$/.test(address.pathname));
    offerPath = new URL(page.url()).pathname;
  });

  await test.step("l'offre envoyée : son statut, son document, son PDF", async () => {
    await expect(
      page.getByRole("heading", { level: 1, name: "Votre offre d'achat" }),
    ).toBeVisible();
    await expect(page.getByText("Votre offre a été envoyée au vendeur.")).toBeVisible();
    await expect(page.getByText("Envoyée", { exact: true })).toBeVisible();
    await expect(page.getByRole("article")).toContainText(
      /Date et heure d'émission : \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}/,
    );
    await expect(page.getByRole("article")).toContainText(/Déclarations acceptées le/);
    expect(await seriousViolations(page)).toEqual([]);
    await expect(page.getByRole("link", { name: "Télécharger le PDF" })).toHaveAttribute(
      "href",
      `${offerPath}/pdf`,
    );
    const pdf = await page.request.get(`${offerPath}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect(pdf.headers()["cache-control"]).toContain("no-store");
    expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  await test.step("une nouvelle offre reste possible : elle remplacera celle en cours", async () => {
    await page.goto(`/offres/nouvelle?listing=${listingId}`);
    await expect(step(page, "Étape 1 sur 7 · L'acquéreur")).toBeVisible();
    await expect(page.getByText("Vous avez déjà une offre en cours sur ce bien.")).toBeVisible();
    // A step not reached yet goes back to the first one to fill.
    await page.goto(`/offres/nouvelle?listing=${listingId}&etape=relecture`);
    await expect(step(page, "Étape 1 sur 7 · L'acquéreur")).toBeVisible();
  });

  await test.step("personne d'autre ne lit l'offre ni son PDF", async () => {
    const anonymous = await browser.newContext({ baseURL: url });
    const refused = await anonymous.request.get(`${offerPath}/pdf`, { maxRedirects: 0 });
    // Sent to the sign-in page, by the middleware or by the route.
    expect([303, 307]).toContain(refused.status());
    expect(refused.headers().location).toContain("/connexion");
    await anonymous.close();

    const sellerContext = await browser.newContext({ baseURL: url });
    const seller = await sellerContext.newPage();
    await signIn(seller, "seller_a", "/vendeur");
    // The seller reads an offer on their own page, with L2-04; never the PDF before acceptance.
    expect((await seller.request.get(`${offerPath}/pdf`)).status()).toBe(404);
    expect((await seller.goto(offerPath))?.status()).toBe(404);
    // Their own listing takes no offer from them.
    expect((await seller.goto(`/offres/nouvelle?listing=${listingId}`))?.status()).toBe(404);
    await sellerContext.close();
  });
});

test("sans projet d'achat déclaré, le formulaire renvoie au profil acquéreur", async ({ page }) => {
  // seller_b has never bought: no buying project.
  await signIn(page, "seller_b", LISTING);
  await page.getByRole("link", { name: "Faire une offre" }).click();
  await expect(
    page.getByRole("heading", { name: "Renseignez d'abord votre projet d'achat" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Renseigner mon projet d'achat" })).toHaveAttribute(
    "href",
    "/acquereur/profil",
  );
});
