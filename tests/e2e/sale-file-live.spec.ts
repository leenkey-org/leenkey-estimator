import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Locator, type Page } from "@playwright/test";

// L3-04 (SPEC-V2 15): the sale file. The seller reads the list of their
// property in three categories, each document with the stage it is needed
// for (DECISIONS.md 2026-11-23), files a document (the file goes from the
// browser to the private bucket, then is checked and filed), filters the
// list by stage, marks a diagnostic « Non concerné », a buyer in contact
// asks for the documents, the seller grants, the buyer opens the document; a
// file that is not what its name says is refused. The counts are read at
// the start and asserted as changes from there, and the test takes back its
// DPE and its « Non concerné » (before starting, those of an earlier
// attempt): a retry starts from the same file. The removed documents, the
// access request and its notifications stay: a local stack just
// made by `scripts/local-stack.sh up` only (E2E_SEED=1, SEED_PASSWORD,
// E2E_MUTATE=1, project « seed-mutations »). Seed used: LK-0001 of seller_a
// and its conversation with buyer_c.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec dépose des documents",
);

const PROPERTY = "5eed1000-0000-4000-8000-000000000001";
const TAB = `/vendeur/biens/${PROPERTY}/documents`;
// A house of seller_a that is not in a co-ownership (LK-0002).
const HOUSE_TAB = "/vendeur/biens/5eed1000-0000-4000-8000-000000000002/documents";

/** The smallest PDF a reader opens. */
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "latin1",
);

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

async function signIn(page: Page, account: "seller_a" | "buyer_c", path: string) {
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

/** « 3 sur 11 », « Dossier notaire : 3 / 18 pièces »: what `pattern` captures in the text, as numbers. */
async function readCount(target: Locator, pattern: RegExp): Promise<[number, number]> {
  await expect(target).toHaveText(pattern);
  const match = pattern.exec((await target.textContent()) ?? "");
  return [Number(match?.[1]), Number(match?.[2])];
}

/** What an earlier attempt of this test left on the tab: its DPE, its « Non concerné ». */
async function clearLeftovers(seller: Page) {
  const removal = seller.getByRole("button", { name: "Retirer DPE" });
  for (let left = await removal.count(); left > 0; left -= 1) {
    await removal.first().click();
    await seller.getByRole("dialog").getByRole("button", { name: "Retirer le document" }).click();
    // Behind an open dialog the page has no button to count: once it is closed.
    await expect(seller.getByRole("dialog")).toHaveCount(0);
    await expect(removal).toHaveCount(left - 1);
  }
  const undo = seller.getByRole("button", { name: "Annuler « Non concerné » : Diagnostic gaz" });
  if ((await undo.count()) > 0) {
    await undo.click();
    await expect(
      seller.getByRole("button", { name: "Non concerné : Diagnostic gaz" }),
    ).toBeVisible();
  }
}

test("dossier de vente : dépôt, non concerné, demande d'accès, partage, ouverture", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);

  // The counts of the tab, read once the leftovers of an earlier attempt are
  // taken back: every count below is a change from these.
  const notaryFile = seller.getByText(/^Dossier notaire : \d+ \/ \d+ pièces$/);
  const propertyGroup = seller.getByRole("region", { name: "Documents du bien" });
  const propertyCount = propertyGroup.getByText(/^\d+ sur \d+$/);
  const stages = seller.getByRole("region", { name: "Les étapes de votre dossier" });
  const listingStage = stages.getByRole("link", { name: /Dès la mise en vente/ });
  let filed = 0;
  let ofProperty = 0;
  let atListing = 0;
  const fileCount = (done: number) => seller.getByText(`Dossier notaire : ${done} / 18 pièces`);

  await test.step("la liste du bien : trois catégories, trois étapes, sans pièce d'identité", async () => {
    await signIn(seller, "seller_a", TAB);
    await expect(seller.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
    await clearLeftovers(seller);
    // A flat: the notary file counts the 18 documents asked for up to the agreement.
    const SIZES = /(\d+) sur (\d+)/;
    const [done, total] = await readCount(notaryFile, /Dossier notaire : (\d+) \/ (\d+) pièces/);
    filed = done;
    expect(total).toBe(18);
    // The three categories of the list, each with its progress.
    for (const [name, size] of [
      ["Documents du bien", 11],
      ["Documents de copropriété", 7],
      ["Documents pour le notaire", 1],
    ] as const) {
      await expect(seller.getByRole("heading", { name, level: 3 })).toBeVisible();
      const [, asked] = await readCount(
        seller.getByRole("region", { name }).getByText(/^\d+ sur \d+$/),
        SIZES,
      );
      expect(asked, name).toBe(size);
    }
    [ofProperty] = await readCount(propertyCount, SIZES);
    // The three stages: what is to file now first (three named at most), the rest later.
    const [atStage, askedAtStage] = await readCount(listingStage, /(\d+) sur (\d+) pièces/);
    atListing = atStage;
    expect(askedAtStage).toBe(9);
    await expect(listingStage).toHaveText(
      /^En cours : Dès la mise en vente.* · À déposer maintenant : (Titre de propriété, )?DPE, .* et \d+ autres?$/,
    );
    await expect(
      stages.getByRole("link", { name: /À venir : Avant le compromis.*\d+ sur 9 pièces$/ }),
    ).toBeVisible();
    await expect(
      stages.getByRole("link", { name: /À venir : Avant la signature.*\d+ sur 1 pièce$/ }),
    ).toBeVisible();
    // The identity documents are never filed on Leenkey: an information, no
    // deposit, and no type for them in the list of the deposit.
    const notary = seller.getByRole("region", { name: "Documents pour le notaire" });
    await expect(notary.getByText("À préparer pour votre notaire")).toBeVisible();
    await expect(notary.getByText(/Ces pièces ne se déposent pas sur Leenkey/)).toBeVisible();
    await expect(notary.getByText(/\(hors pièces d'identité\)/)).toBeVisible();
    const types = seller.getByLabel("Type de document");
    await expect(types.locator("option", { hasText: "Titre de propriété" })).toHaveCount(1);
    // The line of the list and the type of the deposit: one name.
    await expect(types.locator("option", { hasText: "Documents complémentaires" })).toHaveCount(1);
    await expect(types.locator("option", { hasText: /identité/i })).toHaveCount(0);
    await expectNoSeriousViolation(seller);
  });

  await test.step("le vendeur dépose un DPE, préselectionné depuis le nom du fichier", async () => {
    await seller
      .getByLabel("Fichier")
      .setInputFiles({ name: "DPE_2025.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(seller.getByLabel("Type de document")).toHaveValue("dpe");
    await expect(seller.getByLabel("Nom du document")).toHaveValue("DPE");
    await seller.getByRole("button", { name: "Déposer le document" }).click();
    await expect(seller.getByText("Document déposé.")).toBeVisible({ timeout: 20_000 });
    await expect(fileCount(filed + 1)).toBeVisible();
    await expect(seller.getByRole("link", { name: "DPE", exact: true })).toBeVisible();
    await expect(propertyCount).toHaveText(`${ofProperty + 1} sur 11`);
    // One more at its stage, and the DPE is no longer named among what is to file.
    await expect(listingStage).toContainText(
      `${atListing + 1} sur 9 pièces · À déposer maintenant : `,
    );
    await expect(listingStage).not.toHaveText(/maintenant : .*\bDPE\b/);
  });

  await test.step("la liste se filtre par étape, chaque pièce dit quand elle sert", async () => {
    const filter = seller.getByRole("navigation", { name: "Filtrer les pièces par étape" });
    const property = propertyGroup;
    const notary = seller.getByRole("region", { name: "Documents pour le notaire" });
    await expect(filter.getByRole("link", { name: "Toutes", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await filter.getByRole("link", { name: "Avant la signature" }).click();
    await expect(seller).toHaveURL(/etape=signature/);
    await expect(filter.getByRole("link", { name: "Avant la signature" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(property).toHaveCount(0);
    await expect(notary.getByText("État daté fourni par le syndic")).toBeVisible();
    await expect(notary.getByText("Documents complémentaires")).toBeVisible();
    await expect(notary.getByText("Facultatif")).toBeVisible();

    await filter.getByRole("link", { name: "Avant le compromis" }).click();
    await expect(seller).toHaveURL(/etape=compromis/);
    await expect(notary).toHaveCount(0);
    // Of the property, the tax and the works only.
    await expect(propertyCount).toHaveText(/^\d+ sur 2$/);
    await expect(property.getByText("Taxe foncière", { exact: true })).toBeVisible();
    await expect(property.getByText("Factures et justificatifs de travaux")).toBeVisible();
    await expect(property.getByText("Titre de propriété")).toHaveCount(0);
    await expect(
      seller
        .getByRole("region", { name: "Documents de copropriété" })
        .getByText("Plan pluriannuel de travaux"),
    ).toBeVisible();
    await expectNoSeriousViolation(seller);

    // A stage of the card leads to its documents.
    await seller.getByRole("link", { name: /En cours : Dès la mise en vente/ }).click();
    await expect(seller).toHaveURL(/etape=mise-en-vente/);
    await expect(propertyCount).toHaveText(`${atListing + 1} sur 9`);
    await expect(property.getByText("Mesurage loi Carrez")).toBeVisible();
    await expect(property.getByText("Taxe foncière", { exact: true })).toHaveCount(0);

    await filter.getByRole("link", { name: "Toutes", exact: true }).click();
    await expect(seller).not.toHaveURL(/etape=/);
    await expect(propertyCount).toHaveText(`${ofProperty + 1} sur 11`);

    // A stage the address does not know: the whole list.
    await seller.goto(`${TAB}?etape=foo`);
    await expect(filter.getByRole("link", { name: "Toutes", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(propertyCount).toHaveText(`${ofProperty + 1} sur 11`);
    await expect(notary.getByText("État daté fourni par le syndic")).toBeVisible();
    await seller.goto(TAB);
  });

  await test.step("un fichier qui n'est pas ce que dit son nom est refusé", async () => {
    await seller.getByLabel("Fichier").setInputFiles({
      name: "amiante.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("ceci n'est pas un PDF"),
    });
    await seller.getByRole("button", { name: "Déposer le document" }).click();
    await expect(
      seller.getByText("Ce fichier n'est pas un PDF, un JPEG ou un PNG lisible."),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(fileCount(filed + 1)).toBeVisible();
  });

  await test.step("un diagnostic « Non concerné », avec son motif, compte comme présent", async () => {
    await seller.getByRole("button", { name: "Non concerné : Diagnostic gaz" }).click();
    const dialog = seller.getByRole("dialog");
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialog.getByText("Indiquez un motif de 3 à 300 caractères.")).toBeVisible();
    await dialog.getByLabel("Motif").fill("Pas d'installation de gaz");
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(seller.getByText("Motif : Pas d'installation de gaz")).toBeVisible();
    await expect(fileCount(filed + 2)).toBeVisible();
    await expect(listingStage).toContainText(`${atListing + 2} sur 9 pièces`);
    await expectNoSeriousViolation(seller);
  });

  await test.step("l'acquéreur ne voit rien, puis demande l'accès", async () => {
    await signIn(buyer, "buyer_c", "/acquereur/documents");
    await expect(
      buyer.getByRole("heading", { name: "Documents partagés", level: 1 }),
    ).toBeVisible();
    await expect(buyer.getByRole("link", { name: "Ouvrir DPE" })).toHaveCount(0);
    await expectNoSeriousViolation(buyer);
    // The property of this test, named as its conversation is (kind, rooms,
    // city): in the full suite, buyer_c is in contact with other properties too.
    await buyer
      .getByRole("button", {
        name: /^Demander l'accès aux documents : Appartement 3.*Savigny-sur-Orge$/,
      })
      .click();
    await expect(buyer.getByText("Votre demande est envoyée au vendeur.")).toBeVisible();
  });

  await test.step("le vendeur accorde : le document est partagé", async () => {
    await seller.reload();
    await expect(seller.getByText("Chloé demande à consulter vos documents")).toBeVisible();
    await seller.getByRole("button", { name: "Accorder l'accès à Chloé" }).click();
    await expect(seller.getByText("1 document partagé.")).toBeVisible();
    await expect(seller.getByText("1 document partagé sur 1")).toBeVisible();
  });

  await test.step("l'acquéreur ouvre le document partagé, un autre compte non", async () => {
    await buyer.reload();
    const open = buyer.getByRole("link", { name: "Ouvrir DPE" });
    await expect(open).toBeVisible();
    const href = (await open.getAttribute("href")) ?? "";
    const file = await buyer.request.get(href);
    expect(file.status()).toBe(200);
    expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
    const anonymous = await browser.newContext({ baseURL: base });
    const refused = await anonymous.request.get(href, { maxRedirects: 0 });
    expect([303, 404]).toContain(refused.status());
    expect(refused.headers()["location"] ?? "").not.toContain("/storage/");
    await anonymous.close();
  });

  await test.step("retiré par le vendeur, le document disparaît pour l'acquéreur", async () => {
    await seller.getByRole("button", { name: "Retirer DPE" }).click();
    await seller.getByRole("dialog").getByRole("button", { name: "Retirer le document" }).click();
    await expect(seller.getByRole("link", { name: "DPE", exact: true })).toHaveCount(0);
    await buyer.reload();
    await expect(buyer.getByRole("link", { name: "Ouvrir DPE" })).toHaveCount(0);
    // The line is to file again: the count as it is.
    await expect(fileCount(filed + 1)).toBeVisible();
  });

  await test.step("« Non concerné » annulé : le dossier revient à son compte de départ", async () => {
    await seller.getByRole("button", { name: "Annuler « Non concerné » : Diagnostic gaz" }).click();
    await expect(
      seller.getByRole("button", { name: "Non concerné : Diagnostic gaz" }),
    ).toBeVisible();
    await expect(seller.getByText("Motif : Pas d'installation de gaz")).toHaveCount(0);
    await expect(fileCount(filed)).toBeVisible();
    await expect(propertyCount).toHaveText(`${ofProperty} sur 11`);
    await expect(listingStage).toContainText(`${atListing} sur 9 pièces`);
  });

  await test.step("une maison hors copropriété : ni pièces de copropriété ni état daté", async () => {
    await seller.goto(HOUSE_TAB);
    await expect(seller.getByText(/Dossier notaire : \d+ \/ 11 pièces/)).toBeVisible();
    await expect(
      seller.getByRole("heading", { name: "Documents du bien", level: 3 }),
    ).toBeVisible();
    await expect(
      seller.getByRole("heading", { name: "Documents de copropriété", level: 3 }),
    ).toHaveCount(0);
    const notary = seller.getByRole("region", { name: "Documents pour le notaire" });
    await expect(notary.getByText("État daté fourni par le syndic")).toHaveCount(0);
    await expect(notary.getByText("Documents complémentaires")).toBeVisible();
    await expect(notary.getByText("À préparer pour votre notaire")).toBeVisible();
    // Nothing is asked for before the deed: two stages only.
    const stages = seller.getByRole("region", { name: "Les étapes de votre dossier" });
    await expect(stages.getByRole("link")).toHaveCount(2);
  });
});
