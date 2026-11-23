import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Locator, type Page } from "@playwright/test";

// The DDT filed at once, level A (SPEC-V2 15, DECISIONS.md 2026-11-23). The
// seller files the one file of their diagnostician and ticks the diagnostics
// it holds: each of those lines counts as provided, in the notary file, its
// category and its stage; they change what the DDT covers; a buyer the
// diagnostics are shared with reads one document, « Dossier de diagnostics
// (DDT) », with what it covers, and opens it; removed, the lines go back to
// what they were. The counts are read at the start and asserted as changes
// from there (the lines the DDT covers that were to file), and the test
// takes its DDT back (before starting, the one of an earlier attempt): a
// retry starts from the same file. The removed document, its share and its
// notification stay: a local stack just made by `scripts/local-stack.sh up`
// only (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, project « seed-mutations »).
// Seed used: LK-0002 of seller_a, a house outside a co-ownership (its sale
// file is only read by tests/e2e/sale-file-live.spec.ts, as patterns), and
// its conversation with buyer_c.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec dépose un DDT",
);

const TAB = "/vendeur/biens/5eed1000-0000-4000-8000-000000000002/documents";
const DDT = "Dossier de diagnostics (DDT)";
// The diagnostic lines of a house outside a co-ownership, in their order.
const DIAGNOSTICS = [
  "DPE",
  "Diagnostic amiante",
  "Diagnostic plomb",
  "Diagnostic électricité",
  "Diagnostic gaz",
  "État relatif aux termites",
  "État des risques (ERP)",
  "Diagnostic assainissement",
] as const;
type Diagnostic = (typeof DIAGNOSTICS)[number];
// What the DDT of the test holds at first, then once its coverage is changed.
const FIRST: readonly Diagnostic[] = [
  "DPE",
  "Diagnostic amiante",
  "Diagnostic électricité",
  "Diagnostic gaz",
  "État des risques (ERP)",
];
const SECOND: readonly Diagnostic[] = [
  "DPE",
  "Diagnostic amiante",
  "Diagnostic plomb",
  "Diagnostic électricité",
  "État des risques (ERP)",
];

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

/** « 3 sur 11 », « Dossier notaire : 3 / 11 pièces »: what `pattern` captures in the text, as numbers. */
async function readCount(target: Locator, pattern: RegExp): Promise<[number, number]> {
  await expect(target).toHaveText(pattern);
  const match = pattern.exec((await target.textContent()) ?? "");
  return [Number(match?.[1]), Number(match?.[2])];
}

/** The DDT an earlier attempt of this test left on the tab. */
async function clearLeftovers(seller: Page) {
  const removal = seller.getByRole("button", { name: `Retirer ${DDT}` });
  for (let left = await removal.count(); left > 0; left -= 1) {
    await removal.first().click();
    await seller.getByRole("dialog").getByRole("button", { name: "Retirer le document" }).click();
    // Behind an open dialog the page has no button to count: once it is closed.
    await expect(seller.getByRole("dialog")).toHaveCount(0);
    await expect(removal).toHaveCount(left - 1);
  }
}

test("DDT déposé en une fois : dépôt, diagnostics cochés, comptes, partage, retrait", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);

  const notaryFile = seller.getByText(/^Dossier notaire : \d+ \/ \d+ pièces$/);
  const propertyGroup = seller.getByRole("region", { name: "Documents du bien" });
  const propertyCount = propertyGroup.getByText(/^\d+ sur \d+$/);
  const stages = seller.getByRole("region", { name: "Les étapes de votre dossier" });
  const listingStage = stages.getByRole("link", { name: /Dès la mise en vente/ });
  const lines = propertyGroup.getByRole("list", { name: "Diagnostics" }).getByRole("listitem");
  const line = (name: Diagnostic) => lines.filter({ has: seller.getByText(name, { exact: true }) });
  const deposit = seller.getByRole("button", { name: "Déposer mon DDT (un seul fichier)" });
  const provided = propertyGroup.getByRole("link", {
    name: /^Fourni dans votre DDT : ouvrir le fichier/,
  });
  // The lines of the test that were to file at the start: what the DDT adds to the counts.
  const toFile = new Set<Diagnostic>();
  const added = (covered: readonly Diagnostic[]) =>
    covered.filter((name) => toFile.has(name)).length;
  let filed = 0;
  let ofProperty = 0;
  let atListing = 0;
  const expectCounts = async (more: number) => {
    await expect(seller.getByText(`Dossier notaire : ${filed + more} / 11 pièces`)).toBeVisible();
    await expect(propertyCount).toHaveText(`${ofProperty + more} sur 11`);
    await expect(listingStage).toContainText(`${atListing + more} sur 9 pièces`);
  };

  await test.step("les diagnostics forment un groupe, avec le dépôt du DDT en premier", async () => {
    await signIn(seller, "seller_a", TAB);
    await expect(seller.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
    await clearLeftovers(seller);
    const [done, total] = await readCount(notaryFile, /Dossier notaire : (\d+) \/ (\d+) pièces/);
    filed = done;
    expect(total).toBe(11);
    const [inGroup, asked] = await readCount(propertyCount, /(\d+) sur (\d+)/);
    ofProperty = inGroup;
    expect(asked).toBe(11);
    const [atStage, askedAtStage] = await readCount(listingStage, /(\d+) sur (\d+) pièces/);
    atListing = atStage;
    expect(askedAtStage).toBe(9);

    await expect(
      propertyGroup.getByRole("heading", { name: "Diagnostics", level: 4 }),
    ).toBeVisible();
    // What a DDT is, in one sentence.
    await expect(
      propertyGroup.getByText(/le fichier unique que votre diagnostiqueur vous a remis/),
    ).toBeVisible();
    await expect(deposit).toBeVisible();
    // The eight diagnostic lines of a house, each still there, in their order.
    await expect(lines).toHaveCount(DIAGNOSTICS.length);
    for (const [index, name] of DIAGNOSTICS.entries()) {
      await expect(lines.nth(index).getByText(name, { exact: true })).toBeVisible();
      if ((await line(name).getByText("À déposer", { exact: true }).count()) > 0) toFile.add(name);
    }
    // On a seed just made, every one of them is to file.
    expect(toFile.size).toBeGreaterThan(0);
    await expect(provided).toHaveCount(0);
    // The DDT is not a type of the deposit of one document.
    await expect(
      seller.getByLabel("Type de document").locator("option", { hasText: "DDT" }),
    ).toHaveCount(0);
    // The disclaimer of the list stays.
    await expect(
      seller.getByText(/Faites-la confirmer par votre diagnostiqueur certifié et votre notaire/),
    ).toBeVisible();
    await expectNoSeriousViolation(seller);
  });

  await test.step("le vendeur dépose son DDT et coche les diagnostics qu'il contient", async () => {
    await deposit.click();
    const boxes = seller.getByRole("group", { name: "Diagnostics contenus dans ce fichier" });
    // Every diagnostic line of the property, ticked at first.
    await expect(boxes.getByRole("checkbox")).toHaveCount(DIAGNOSTICS.length);
    for (const name of DIAGNOSTICS) await expect(boxes.getByLabel(name)).toBeChecked();
    await expectNoSeriousViolation(seller);
    const submit = seller.getByRole("button", { name: "Déposer mon DDT", exact: true });
    // A file is asked for, and one diagnostic at least.
    await submit.click();
    await expect(
      seller.getByText("Choisissez le fichier de votre DDT et cochez au moins un diagnostic."),
    ).toBeVisible();
    await seller
      .getByLabel("Fichier de votre DDT")
      .setInputFiles({ name: "DDT_maison.pdf", mimeType: "application/pdf", buffer: PDF });
    for (const name of DIAGNOSTICS) await boxes.getByLabel(name).uncheck();
    await submit.click();
    await expect(seller.getByText("Cochez au moins un diagnostic.")).toBeVisible();
    await expectCounts(0);
    for (const name of FIRST) await boxes.getByLabel(name).check();
    await submit.click();

    // One document, named by us, with what it covers.
    const file = propertyGroup.getByRole("link", { name: DDT, exact: true });
    await expect(file).toBeVisible({ timeout: 20_000 });
    await expect(
      propertyGroup.getByText(`Diagnostics couverts : ${FIRST.join(", ")}`),
    ).toBeVisible();
    await expect(deposit).toHaveCount(0);
    // Each line it covers is provided, with the link to the file; the others are not.
    await expect(provided).toHaveCount(FIRST.length);
    for (const name of DIAGNOSTICS) {
      const covered = FIRST.includes(name);
      await expect(
        line(name).getByRole("link", {
          name: `Fourni dans votre DDT : ouvrir le fichier (${name})`,
        }),
        name,
      ).toHaveCount(covered ? 1 : 0);
      if (covered) {
        await expect(line(name).getByText("Fourni dans votre DDT")).toBeVisible();
        await expect(line(name).getByText("Déposé", { exact: true })).toBeVisible();
      } else if (toFile.has(name)) {
        await expect(line(name).getByText("À déposer", { exact: true })).toBeVisible();
      }
    }
    // In every count: the notary file, the category, the stage.
    await expectCounts(added(FIRST));
    // A line the DDT covers is no longer named among what is to file.
    await expect(listingStage).not.toHaveText(/maintenant : .*\bDPE\b/);
    // The link of a line opens the file of the DDT.
    const href = (await line("DPE").getByRole("link").getAttribute("href")) ?? "";
    expect(href).toBe(await file.getAttribute("href"));
    const opened = await seller.request.get(href);
    expect(opened.status()).toBe(200);
    expect((await opened.body()).subarray(0, 5).toString()).toBe("%PDF-");
    // Nothing of a DDT is offered for the listing.
    await expect(seller.getByRole("button", { name: /Afficher sur l'annonce/ })).toHaveCount(0);
    await expectNoSeriousViolation(seller);
  });

  await test.step("le vendeur modifie les diagnostics couverts : les comptes suivent", async () => {
    await seller.getByRole("button", { name: "Modifier les diagnostics couverts" }).click();
    const boxes = seller.getByRole("group", { name: "Diagnostics contenus dans ce fichier" });
    for (const name of DIAGNOSTICS) {
      const box = boxes.getByLabel(name);
      if (FIRST.includes(name)) await expect(box).toBeChecked();
      else await expect(box).not.toBeChecked();
    }
    const save = seller.getByRole("button", { name: "Enregistrer", exact: true });
    for (const name of FIRST) await boxes.getByLabel(name).uncheck();
    await save.click();
    await expect(seller.getByText("Cochez au moins un diagnostic.")).toBeVisible();
    for (const name of SECOND) await boxes.getByLabel(name).check();
    await save.click();
    await expect(seller.getByText("Diagnostics couverts mis à jour.")).toBeVisible();
    await expect(
      propertyGroup.getByText(`Diagnostics couverts : ${SECOND.join(", ")}`),
    ).toBeVisible();
    await expect(provided).toHaveCount(SECOND.length);
    await expect(line("Diagnostic plomb").getByText("Fourni dans votre DDT")).toBeVisible();
    await expect(line("Diagnostic gaz").getByText("Fourni dans votre DDT")).toHaveCount(0);
    await expectCounts(added(SECOND));
  });

  await test.step("partagé avec les diagnostics, l'acquéreur lit un document et ce qu'il couvre", async () => {
    await seller.getByRole("button", { name: "Partager les diagnostics avec Chloé" }).click();
    await expect(seller.getByText("1 document partagé avec Chloé.")).toBeVisible();
    await signIn(buyer, "buyer_c", "/acquereur/documents");
    await expect(
      buyer.getByRole("heading", { name: "Documents partagés", level: 1 }),
    ).toBeVisible();
    const shared = buyer.getByRole("listitem").filter({
      has: buyer.getByRole("link", { name: `Ouvrir ${DDT}` }),
    });
    await expect(shared).toHaveCount(1);
    await expect(shared.getByText(DDT, { exact: true })).toBeVisible();
    await expect(shared.getByText(`Diagnostics inclus : ${SECOND.join(", ")}`)).toBeVisible();
    // One document, not one per diagnostic.
    await expect(buyer.getByRole("link", { name: "Ouvrir DPE" })).toHaveCount(0);
    const href =
      (await shared.getByRole("link", { name: `Ouvrir ${DDT}` }).getAttribute("href")) ?? "";
    const file = await buyer.request.get(href);
    expect(file.status()).toBe(200);
    expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await expectNoSeriousViolation(buyer);
  });

  await test.step("retiré, le DDT rend ses lignes : les comptes reviennent au départ", async () => {
    await seller.getByRole("button", { name: `Retirer ${DDT}` }).click();
    const dialog = seller.getByRole("dialog");
    await expect(
      dialog.getByText(/les diagnostics qu'il couvrait repassent « À déposer »/),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Retirer le document" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(propertyGroup.getByRole("link", { name: DDT, exact: true })).toHaveCount(0);
    await expect(provided).toHaveCount(0);
    await expect(deposit).toBeVisible();
    for (const name of toFile) {
      await expect(line(name).getByText("À déposer", { exact: true })).toBeVisible();
    }
    await expectCounts(0);
    await buyer.reload();
    await expect(buyer.getByRole("link", { name: `Ouvrir ${DDT}` })).toHaveCount(0);
  });
});
