import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L3-04 (SPEC-V2 15): the sale file. The seller files a document (the file
// goes from the browser to the private bucket, then is checked and filed),
// marks a diagnostic « Non concerné », a buyer in contact asks for the
// documents, the seller grants, the buyer opens the document; a file that is
// not what its name says is refused. The documents stay: a local stack just
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

test("dossier de vente : dépôt, non concerné, demande d'accès, partage, ouverture", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);

  await test.step("le vendeur dépose un DPE, préselectionné depuis le nom du fichier", async () => {
    await signIn(seller, "seller_a", TAB);
    await expect(seller.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
    await expect(seller.getByText(/Dossier notaire : 0 \/ 16 pièces/)).toBeVisible();
    await expectNoSeriousViolation(seller);
    await seller
      .getByLabel("Fichier")
      .setInputFiles({ name: "DPE_2025.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(seller.getByLabel("Type de document")).toHaveValue("dpe");
    await expect(seller.getByLabel("Nom du document")).toHaveValue("DPE");
    await seller.getByRole("button", { name: "Déposer le document" }).click();
    await expect(seller.getByText("Document déposé.")).toBeVisible({ timeout: 20_000 });
    await expect(seller.getByText(/Dossier notaire : 1 \/ 16 pièces/)).toBeVisible();
    await expect(seller.getByRole("link", { name: "DPE", exact: true })).toBeVisible();
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
    await expect(seller.getByText(/Dossier notaire : 1 \/ 16 pièces/)).toBeVisible();
  });

  await test.step("un diagnostic « Non concerné », avec son motif, compte comme présent", async () => {
    await seller.getByRole("button", { name: "Non concerné : Diagnostic gaz" }).click();
    const dialog = seller.getByRole("dialog");
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialog.getByText("Indiquez un motif de 3 à 300 caractères.")).toBeVisible();
    await dialog.getByLabel("Motif").fill("Pas d'installation de gaz");
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(seller.getByText("Motif : Pas d'installation de gaz")).toBeVisible();
    await expect(seller.getByText(/Dossier notaire : 2 \/ 16 pièces/)).toBeVisible();
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
  });
});
