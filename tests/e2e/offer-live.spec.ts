import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L2-03 and L2-04a: a buyer makes an offer on a listing, in seven steps
// (SPEC-V2 13), and its seller answers it:
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

// One buyer, one seller: the tests of this file run one after the other.
test.describe.configure({ mode: "default" });

const LISTING = "/annonce/appartement-2-pieces-morsang-sur-orge-lk0003";
/** Its property, in the seed. */
const PROPERTY = "5eed1000-0000-4000-8000-000000000003";

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
}

/** Signs a seed account in, accepts the terms when asked, and lands on `path`. */
async function signIn(
  page: Page,
  account: "seller_a" | "seller_b" | "buyer_c" | "buyer_d",
  path: string,
) {
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

/** The bell visible on the page (one per header; the other one hidden by its breakpoint). */
const bell = (page: Page) =>
  page.getByRole("button", { name: /^Notifications/ }).locator("visible=true");
const bellPanel = (page: Page) => page.getByRole("dialog", { name: "Notifications" });

const step = (page: Page, label: string) => page.getByRole("progressbar", { name: label });
const next = (page: Page) => page.getByRole("button", { name: "Continuer" });

test("un acquéreur fait une offre en sept étapes et l'envoie ; son vendeur la lit et l'accepte", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
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
    // A dot between thousands is read as thousands, never as 150 euros.
    await page.getByLabel("Prix proposé").fill("150.000");
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

    // « Sans prêt »: what was typed for a loan, even wrong, is hidden and stops nothing.
    await page.getByLabel("Taux maximal envisagé").fill("3,5%");
    await page.locator("label").filter({ hasText: "Sans prêt" }).click();
    await expect(page.getByLabel("Apport personnel")).toHaveCount(0);
    await next(page).click();
    await expect(step(page, "Étape 5 sur 7 · Conditions de l'offre")).toBeVisible();
    await expect(page.getByText("Offre formulée sans recours à un prêt immobilier.")).toBeVisible();
    // Exact: the arrow of the header is « Étape précédente ».
    await page.getByRole("link", { name: "Précédent", exact: true }).click();
    await expect(page.getByRole("radio", { name: /Sans prêt/ })).toBeChecked();
    await page.locator("label").filter({ hasText: "Avec prêt" }).click();
    await page.getByLabel("Apport personnel").fill("60 000");
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
    // While it waits: it may be withdrawn, or changed by a new offer (L2-04b).
    await expect(page.getByRole("button", { name: "Retirer mon offre" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Faire une nouvelle offre" })).toBeVisible();
    await expect(
      page.getByText(/^Pour modifier un élément de votre offre, faites-en une nouvelle/),
    ).toBeVisible();
  });

  await test.step("une nouvelle offre reste possible : elle remplacera celle en cours", async () => {
    await page.goto(`/offres/nouvelle?listing=${listingId}`);
    await expect(step(page, "Étape 1 sur 7 · L'acquéreur")).toBeVisible();
    await expect(page.getByText("Vous avez déjà une offre en cours sur ce bien.")).toBeVisible();
    // A step not reached yet goes back to the first one to fill.
    await page.goto(`/offres/nouvelle?listing=${listingId}&etape=relecture`);
    await expect(step(page, "Étape 1 sur 7 · L'acquéreur")).toBeVisible();
  });

  // The seller of the listing, in a browser of their own.
  const sellerContext = await browser.newContext({ baseURL: url });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  await sellerContext.addCookies([{ name: "lk_consent", value: `v1.0.${day}`, url }]);
  const seller = await sellerContext.newPage();

  await test.step("le vendeur reçoit l'offre : sa synthèse, les coordonnées masquées (L2-04a)", async () => {
    await signIn(seller, "seller_a", `/vendeur?bien=${PROPERTY}`);
    // Their own listing takes no offer from them.
    expect((await seller.request.get(`/offres/nouvelle?listing=${listingId}`)).status()).toBe(404);
    const card = seller.getByRole("article").filter({ hasText: "Nouvelle offre reçue" });
    await expect(card).toContainText("Chloé Dubois, Savigny-sur-Orge");
    await expect(card).toContainText("159 000 €");
    await expect(card).toContainText("150 000 €");
    await expect(card).toContainText("−9 000 € · −5,7 %");
    await expect(card).toContainText("Apport : 60 000 €");
    await expect(card).toContainText("Prêt envisagé : 100 000 €");
    await expect(card).toContainText("Aucun document fourni");
    await expect(card).toContainText(/(4 jours et \d+ heures?|5 jours) restant/);
    await expect(card).toContainText("L'offre est inférieure de 5,7 % au prix demandé.");
    await expect(card).toContainText(
      "L'offre mentionne également une vente préalable d'un autre bien.",
    );
    await expect(card).not.toContainText(/validé|buyer_c@|06 12 34/);
    await shots(seller, "seller-dashboard-card");
    // Never the PDF before acceptance: it carries the contact details.
    expect((await seller.request.get(`${offerPath}/pdf`)).status()).toBe(404);

    await card.getByRole("link", { name: "Voir l'offre complète" }).click();
    await seller.waitForURL((address) => address.pathname === offerPath);
    await expect(seller.getByRole("heading", { level: 1, name: "Offre reçue" })).toBeVisible();
    const document = seller.getByRole("article").filter({ hasText: "OFFRE D'ACHAT LEENKEY" });
    await expect(document).toContainText("Dubois");
    await expect(document).toContainText("Savigny-sur-Orge");
    await expect(document).not.toContainText(
      /buyer_c@test\.leenkey\.fr|marc\.dubois@example\.fr|06 12 34 56 78|8 rue des Écoles|15\/06\/1990/,
    );
    await expect(
      seller.getByText(/^Avant acceptation, vous voyez le nom, le prénom et la ville/),
    ).toBeVisible();
    expect(await seriousViolations(seller)).toEqual([]);
    await shots(seller, "seller-offer-page");

    // This first opening is said to the buyer: « Consultée ».
    await expect(async () => {
      await page.goto(offerPath);
      await expect(page.getByText("Consultée", { exact: true })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
  });

  await test.step("refuser demande une confirmation ; accepter passe par un écran, jamais en un clic", async () => {
    await seller.getByRole("button", { name: "Refuser l'offre" }).click();
    const dialog = seller.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Refuser cette offre ?" })).toBeVisible();
    await expect(dialog.getByLabel(/^Message à l'acquéreur/)).toBeVisible();
    await shots(seller, "seller-decline-dialog");
    await dialog.getByRole("button", { name: "Annuler" }).click();
    await expect(dialog).toBeHidden();

    await seller.getByRole("link", { name: "Accepter l'offre" }).click();
    await seller.waitForURL((address) => address.pathname === `${offerPath}/accepter`);
    await expect(
      seller.getByRole("heading", {
        level: 1,
        name: "Vous êtes sur le point d'accepter cette offre",
      }),
    ).toBeVisible();
    const recap = seller.locator("dl");
    await expect(recap).toContainText("150 000 €");
    await expect(recap).toContainText("Chloé Dubois, Marc Dubois");
    await expect(recap).toContainText("prêt + apport");
    await expect(recap).toContainText(/jusqu'au \d{2}\/\d{2}\/\d{4} à \d{2}:00/);
    await expect(
      seller.getByText(
        /^L'acceptation d'une offre d'achat peut produire des conséquences juridiques\./,
      ),
    ).toContainText("contactez votre notaire ou un conseiller Leenkey avant de poursuivre.");
    const confirm = seller.getByRole("button", { name: "Confirmer mon acceptation" });
    await expect(confirm).toBeDisabled();
    await shots(seller, "seller-accept-screen");
    expect(await seriousViolations(seller)).toEqual([]);
    await seller
      .getByLabel("J'ai lu l'intégralité de l'offre et souhaite confirmer mon acceptation.")
      .check();
    await confirm.click();
    await seller.waitForURL((address) => address.pathname === offerPath);
    await expect(
      seller.getByText(/^Vous avez accepté cette offre le \d{2}\/\d{2}\/\d{4}/),
    ).toBeVisible();
  });

  await test.step("acceptée : le vendeur lit les coordonnées et le PDF, l'acquéreur le sait", async () => {
    const document = seller.getByRole("article").filter({ hasText: "OFFRE D'ACHAT LEENKEY" });
    await expect(document).toContainText("buyer_c@test.leenkey.fr");
    await expect(document).toContainText("06 12 34 56 78");
    await expect(document).toContainText("8 rue des Écoles");
    await expect(seller.getByRole("button", { name: "Refuser l'offre" })).toHaveCount(0);
    const history = seller.getByRole("region", { name: "Historique" });
    await expect(history).toContainText("Offre envoyée");
    await expect(history).toContainText("Offre consultée par le vendeur");
    await expect(history).toContainText("Offre acceptée par le vendeur");
    const pdf = await seller.request.get(`${offerPath}/pdf`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");

    await page.goto(offerPath);
    await expect(page.getByText("Acceptée", { exact: true })).toBeVisible();
    // No new offer on a listing whose offer is accepted.
    await page.goto(`/offres/nouvelle?listing=${listingId}`);
    await expect(
      page.getByRole("heading", { name: "Votre offre sur ce bien a été acceptée" }),
    ).toBeVisible();

    // The tab « Offres » of the property keeps the whole history; the card is gone.
    await seller.goto(`/vendeur/biens/${PROPERTY}/offres`);
    await expect(seller.getByRole("heading", { name: "Offres reçues" })).toBeVisible();
    const row = seller.getByRole("listitem").filter({ hasText: "Chloé Dubois" });
    await expect(row).toContainText("150 000 €");
    await expect(row).toContainText("Acceptée");
    await expect(row).toContainText("Offre acceptée par le vendeur");
    await shots(seller, "seller-offers-tab");
    expect(await seriousViolations(seller)).toEqual([]);
    await seller.goto(`/vendeur?bien=${PROPERTY}`);
    await expect(seller.getByText("Nouvelle offre reçue")).toHaveCount(0);
  });

  await test.step("acceptée : plus de retrait pour l'acquéreur, il est notifié (L2-04b)", async () => {
    await page.goto(offerPath);
    await expect(page.getByRole("button", { name: "Retirer mon offre" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Faire une nouvelle offre" })).toHaveCount(0);
    await expect(page.getByText("Vous souhaitez renoncer à votre projet ?")).toBeVisible();
    await expect(
      page.getByText(
        "Votre offre a déjà été acceptée par le vendeur. Les conséquences dépendent de votre situation et de l'avancement de la transaction. Contactez le vendeur et votre notaire avant toute démarche.",
      ),
    ).toBeVisible();
    await expect(page.getByText(/rétractation/i)).toHaveCount(0);
    expect(await seriousViolations(page)).toEqual([]);
    await shots(page, "buyer-offer-accepted");

    // Their home lists the offer; the bell says the answer of the seller.
    await page.goto("/acquereur");
    const offers = page.getByRole("list", { name: "Vos offres d'achat" });
    const line = offers.getByRole("link").filter({ hasText: "Morsang-sur-Orge" });
    await expect(line).toContainText("150 000 €");
    await expect(line).toContainText("Acceptée");
    await expect(line).toHaveAttribute("href", offerPath);
    await shots(page, "buyer-home-offers");
    // A long title is cut: the page is never wider than a phone.
    const size = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    if (size) await page.setViewportSize(size);
    await bell(page).click();
    await expect(
      bellPanel(page).getByRole("link").filter({ hasText: "Votre offre d'achat a été acceptée" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await test.step("l'avant-contrat : le vendeur l'enregistre, l'acquéreur lit le délai indicatif (L2-04b)", async () => {
    await seller.goto(offerPath);
    const section = seller.getByRole("region", { name: "Avant-contrat" });
    await expect(section).toContainText("Une fois l'avant-contrat signé");
    // A date before the acceptance is refused, on its field.
    await section.getByLabel("Date de signature de l'avant-contrat").fill("2020-01-01");
    await section.getByRole("button", { name: "Enregistrer" }).click();
    await expect(
      section.getByText(
        "Indiquez une date entre le jour de l'acceptation de l'offre et aujourd'hui.",
      ),
    ).toBeVisible();
    await section.getByLabel("Date de signature de l'avant-contrat").fill(day);
    await section.getByRole("button", { name: "Enregistrer" }).click();
    await expect(section.getByText("Avant-contrat enregistré.")).toBeVisible();
    await expect(section).toContainText(/Avant-contrat signé le \d{2}\/\d{2}\/\d{4}\./);
    await expect(section).not.toContainText("Fin du délai légal");

    // Without the day of the notification, the buyer reads no date.
    await page.goto(offerPath);
    const buyerSection = page.getByRole("region", { name: "Avant-contrat" });
    await expect(buyerSection).toContainText(/Avant-contrat signé le \d{2}\/\d{2}\/\d{4}\./);
    await expect(buyerSection).toContainText(
      "Le point de départ de votre délai de rétractation dépend de la date de notification ou de remise de l'avant-contrat. Votre notaire peut vous l'indiquer.",
    );
    await expect(buyerSection).not.toContainText("jusqu'au");
    await expect(page.getByText("Vous souhaitez renoncer à votre projet ?")).toHaveCount(0);

    // The seller corrects it with the day of the notification: an indicative end.
    await section.getByRole("button", { name: "Modifier" }).click();
    await section.getByLabel(/^Date de notification ou de remise de l'avant-contrat/).fill(day);
    await section.getByRole("button", { name: "Enregistrer" }).click();
    await expect(section).toContainText(
      /Fin du délai légal de rétractation de l'acquéreur : \d{2}\/\d{2}\/\d{4}\. Date indicative calculée à partir de la date que vous avez renseignée\. Votre notaire fait foi\./,
    );
    expect(await seriousViolations(seller)).toEqual([]);
    await shots(seller, "seller-precontract");
    await page.reload();
    await expect(buyerSection).toContainText(
      /Délai légal de rétractation de 10 jours : jusqu'au \d{2}\/\d{2}\/\d{4}\./,
    );
    await expect(buyerSection).toContainText("Date indicative. Votre notaire fait foi.");
    expect(await seriousViolations(page)).toEqual([]);
    await shots(page, "buyer-precontract");
    await sellerContext.close();
  });

  await test.step("personne d'autre ne lit l'offre ni son PDF", async () => {
    const anonymous = await browser.newContext({ baseURL: url });
    const refused = await anonymous.request.get(`${offerPath}/pdf`, { maxRedirects: 0 });
    // Sent to the sign-in page, by the middleware or by the route.
    expect([303, 307]).toContain(refused.status());
    expect(refused.headers().location).toContain("/connexion");
    await anonymous.close();

    // Another seller, another buyer: the offer does not exist for them.
    for (const [account, home] of [
      ["seller_b", "/vendeur"],
      ["buyer_d", "/acquereur"],
    ] as const) {
      const context = await browser.newContext({ baseURL: url });
      const other = await context.newPage();
      await signIn(other, account, home);
      expect((await other.request.get(`${offerPath}/pdf`)).status()).toBe(404);
      expect((await other.goto(offerPath))?.status()).toBe(404);
      expect((await other.goto(`${offerPath}/accepter`))?.status()).toBe(404);
      await context.close();
    }
  });
});

test("le vendeur refuse une offre avec un message ; l'acquéreur le lit", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const url = baseURL ?? "http://localhost:3100";
  // Another listing of seller_a, so that this offer does not meet the one above.
  await signIn(page, "buyer_c", "/annonce/maison-5-pieces-epinay-sur-orge-lk0002");
  await page.getByRole("link", { name: "Faire une offre" }).click();
  await page.waitForURL((address) => address.pathname === "/offres/nouvelle");
  const listingId = new URL(page.url()).searchParams.get("listing") ?? "";
  await page.getByLabel("Date de naissance").fill("1990-06-15");
  await page.getByLabel("Adresse").fill("8 rue des Écoles");
  await page.getByLabel("Code postal").fill("91600");
  await page.getByLabel("Ville").fill("Savigny-sur-Orge");
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await next(page).click();
  await expect(step(page, "Étape 2 sur 7 · Le bien concerné")).toBeVisible();
  await page.getByRole("link", { name: "Continuer" }).click();
  await page.getByLabel("Prix proposé").fill("380 000");
  await next(page).click();
  await expect(step(page, "Étape 4 sur 7 · Financement")).toBeVisible();
  await page.locator("label").filter({ hasText: "Sans prêt" }).click();
  await next(page).click();
  await expect(step(page, "Étape 5 sur 7 · Conditions de l'offre")).toBeVisible();
  await next(page).click();
  await expect(step(page, "Étape 6 sur 7 · Durée de validité")).toBeVisible();
  await next(page).click();
  await page.locator("label").filter({ hasText: "Sans visite" }).click();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Relire mon offre" }).click();
  await page.getByRole("button", { name: "Envoyer mon offre au vendeur" }).click();
  await page.waitForURL((address) => /^\/offres\/[0-9a-f-]{36}$/.test(address.pathname));
  const offerPath = new URL(page.url()).pathname;

  const sellerContext = await browser.newContext({ baseURL: url });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  await sellerContext.addCookies([{ name: "lk_consent", value: `v1.0.${day}`, url }]);
  const seller = await sellerContext.newPage();
  await signIn(seller, "seller_a", offerPath);
  // Sans prêt, sans justificatif : dit tel quel, sans verdict.
  const card = seller.getByRole("article").filter({ hasText: "Analyse Leenkey" });
  await expect(card).toContainText("Sans recours à un prêt immobilier");
  await expect(card).toContainText(
    "L'acquéreur déclare financer l'acquisition sans recours à un prêt immobilier.",
  );
  await seller.getByRole("button", { name: "Refuser l'offre" }).click();
  const dialog = seller.getByRole("dialog");
  await dialog
    .getByLabel(/^Message à l'acquéreur/)
    .fill("Merci, le prix est trop éloigné du nôtre.");
  await dialog.getByRole("button", { name: "Refuser l'offre" }).click();
  await expect(
    seller.getByText(/^Vous avez refusé cette offre le \d{2}\/\d{2}\/\d{4}/),
  ).toBeVisible();
  await expect(seller.getByRole("link", { name: "Accepter l'offre" })).toHaveCount(0);
  // Declined: the contact details stay hidden, and no PDF.
  await expect(
    seller.getByRole("article").filter({ hasText: "OFFRE D'ACHAT LEENKEY" }),
  ).not.toContainText(/buyer_c@test\.leenkey\.fr|06 12 34 56 78/);
  expect((await seller.request.get(`${offerPath}/pdf`)).status()).toBe(404);

  await page.goto(offerPath);
  await expect(page.getByText("Refusée", { exact: true })).toBeVisible();
  const history = page.getByRole("region", { name: "Historique" });
  await expect(history).toContainText("Offre refusée par le vendeur");
  await expect(history).toContainText(
    "Message du vendeur : « Merci, le prix est trop éloigné du nôtre. »",
  );
  await expect(page.getByText("Le vendeur a refusé cette offre.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retirer mon offre" })).toHaveCount(0);

  // « Faire une nouvelle offre » (L2-04b): a new draft with the content of
  // this one, read again from its first step; nothing to replace.
  await expect(page.getByText(/^Vous pouvez faire une nouvelle offre sur ce bien/)).toBeVisible();
  await page.getByRole("button", { name: "Faire une nouvelle offre" }).click();
  await page.waitForURL((address) => address.pathname === "/offres/nouvelle");
  expect(new URL(page.url()).searchParams.get("listing")).toBe(listingId);
  await expect(step(page, "Étape 1 sur 7 · L'acquéreur")).toBeVisible();
  await expect(page.getByText("Vous avez déjà une offre en cours sur ce bien.")).toHaveCount(0);
  await expect(page.getByLabel("Date de naissance")).toHaveValue("1990-06-15");
  await expect(page.getByLabel("Adresse")).toHaveValue("8 rue des Écoles");
  await next(page).click();
  await expect(step(page, "Étape 2 sur 7 · Le bien concerné")).toBeVisible();
  await page.getByRole("link", { name: "Continuer" }).click();
  await expect(page.getByLabel("Prix proposé")).toHaveValue(/^380\s000$/);
  await page.getByLabel("Prix proposé").fill("395 000");
  await next(page).click();
  await expect(step(page, "Étape 4 sur 7 · Financement")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Sans prêt/ })).toBeChecked();
  await next(page).click();
  await expect(step(page, "Étape 5 sur 7 · Conditions de l'offre")).toBeVisible();
  await next(page).click();
  // Neither the validity, the visit nor the declarations are copied: given again.
  await expect(step(page, "Étape 6 sur 7 · Durée de validité")).toBeVisible();
  await expect(page.getByLabel("Votre offre est valable")).toHaveValue("5");
  await next(page).click();
  // The visit is said again with the declarations: the buyer may have visited since.
  await expect(page.getByRole("radio", { name: /Sans visite/ })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Relire mon offre" })).toBeDisabled();
  await page.locator("label").filter({ hasText: "Bien visité" }).click();
  for (const box of await page.getByRole("checkbox").all()) {
    await expect(box).not.toBeChecked();
    await box.check();
  }
  await page.getByRole("button", { name: "Relire mon offre" }).click();
  await page.getByRole("button", { name: "Envoyer mon offre au vendeur" }).click();
  await page.waitForURL(
    (address) =>
      /^\/offres\/[0-9a-f-]{36}$/.test(address.pathname) && address.pathname !== offerPath,
  );
  const secondPath = new URL(page.url()).pathname;
  await expect(page.getByText(/Version 2 · Envoyée le/)).toBeVisible();
  await expect(page.getByRole("article")).toContainText("395 000 €");

  // The buyer withdraws it, after the confirmation of the SPEC.
  await page.getByRole("button", { name: "Retirer mon offre" }).click();
  const confirm = page.getByRole("dialog");
  await expect(confirm.getByRole("heading", { name: "Retirer votre offre ?" })).toBeVisible();
  await expect(confirm).toContainText(
    "Vous êtes sur le point de retirer votre offre. Le vendeur en sera immédiatement informé et votre retrait sera enregistré dans Leenkey.",
  );
  expect(await seriousViolations(page)).toEqual([]);
  await shots(page, "buyer-withdraw-dialog");
  await confirm.getByRole("button", { name: "Retirer mon offre" }).click();
  await expect(
    page.getByText(/^Offre retirée le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}\.$/),
  ).toBeVisible();
  await expect(page.getByText("Retirée", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retirer mon offre" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Historique" })).toContainText(
    "Offre retirée par l'acquéreur",
  );
  expect(await seriousViolations(page)).toEqual([]);
  await shots(page, "buyer-offer-withdrawn");

  // The seller is told: the page of the offer, the bell, the conversation.
  await seller.goto(secondPath);
  await expect(
    seller.getByText(/^L'acquéreur a retiré cette offre le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}\.$/),
  ).toBeVisible();
  await expect(seller.getByRole("link", { name: "Accepter l'offre" })).toHaveCount(0);
  await expect(seller.getByRole("button", { name: "Refuser l'offre" })).toHaveCount(0);
  await bell(seller).click();
  await expect(
    bellPanel(seller).getByRole("link").filter({ hasText: "Chloé a retiré son offre d'achat" }),
  ).toBeVisible();
  await seller.keyboard.press("Escape");
  await seller.goto("/messages");
  await seller.getByRole("link").filter({ hasText: "Chloé" }).first().click();
  await expect(
    seller.getByText(/^Offre d'achat LK-\d{4}-\d{5} retirée par l'acquéreur\.$/),
  ).toBeVisible();
  await sellerContext.close();
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
