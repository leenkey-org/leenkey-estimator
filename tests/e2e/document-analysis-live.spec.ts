import AxeBuilder from "@axe-core/playwright";
import {
  devices,
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";

// L3-05 (SPEC-V2 15, « Analyse IA »): the documents of a sale file read by
// the assistant. The seller files a document, the scheduled task analyses it
// (called here with the CRON_SECRET of the local stack, the model of the
// tests), the reading aid shows under the document; a document « illisible »
// raises the warning; « Afficher sur l'annonce » puts its facts on the
// public listing; a buyer the document is shared with reads the summary
// meant for them. The documents are removed at the end, and the
// notification of the document to check is read (its email never leaves). A
// local stack just made by `scripts/local-stack.sh up` only (E2E_SEED=1,
// SEED_PASSWORD, E2E_MUTATE=1, AI_MOCK=1, CRON_SECRET). Seed used: LK-0001 of
// seller_a and its conversation with buyer_c, as tests/e2e/sale-file-live.spec.ts:
// this spec runs in its own project (« seed-documents »), after the specs
// that change the seed are done, never beside them.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const CRON_SECRET = process.env.CRON_SECRET;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec dépose des documents",
);
test.skip(!CRON_SECRET, "CRON_SECRET de la pile locale requis (scripts/local-stack.sh env)");
// The model of the tests only: never a call of the real one from a test.
test.skip(process.env.AI_MOCK !== "1", "AI_MOCK=1 requis : l'analyse est celle du modèle de test");

const PROPERTY = "5eed1000-0000-4000-8000-000000000001";
const TAB = `/vendeur/biens/${PROPERTY}/documents`;
const TASK = "/api/cron/analyze-documents";
const MENTION =
  "Aide à la lecture générée automatiquement. Elle ne remplace ni le diagnostiqueur ni le notaire.";

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

/** One run of the scheduled task (three documents at most). */
async function runTask(request: APIRequestContext) {
  const response = await request.get(TASK, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
  expect(response.status()).toBe(200);
}

/** Files a document and gives the scheduled task the runs it needs to read it. */
async function fileAndAnalyse(
  seller: Page,
  request: APIRequestContext,
  document: { fileName: string; type: string; title: string; shown: string | RegExp },
) {
  await seller
    .getByLabel("Fichier")
    .setInputFiles({ name: document.fileName, mimeType: "application/pdf", buffer: PDF });
  await seller.getByLabel("Type de document").selectOption(document.type);
  await seller.getByLabel("Nom du document").fill(document.title);
  await seller.getByRole("button", { name: "Déposer le document" }).click();
  await expect(seller.getByRole("link", { name: document.title, exact: true })).toBeVisible({
    timeout: 20_000,
  });
  // Only as many runs as this document needs: what else waits is not this spec's.
  await expect(async () => {
    await runTask(request);
    await seller.reload();
    await expect(seller.getByText(document.shown).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
}

const bell = (page: Page) =>
  page.getByRole("button", { name: /^Notifications/ }).locator("visible=true");
const panel = (page: Page) => page.getByRole("dialog", { name: "Notifications" });

test("analyse des documents : aide à la lecture, document à vérifier, annonce, acquéreur", async ({
  browser,
  baseURL,
  request,
}) => {
  test.setTimeout(300_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);
  const CARREZ = "Mesurage test analyse";
  const PV = "PV illisible test";

  await test.step("la tâche planifiée ne s'ouvre qu'avec son secret", async () => {
    expect((await request.get(TASK)).status()).toBe(401);
  });

  await test.step("le vendeur dépose un mesurage : son aide à la lecture s'affiche", async () => {
    await signIn(seller, "seller_a", TAB);
    await expect(seller.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
    await expect(seller.getByText(/lus par notre assistant \(modèle d'Anthropic/)).toBeVisible();
    await fileAndAnalyse(seller, request, {
      fileName: "mesurage.pdf",
      type: "carrez",
      title: CARREZ,
      shown: "Résumé de l'assistant de test pour le vendeur (carrez).",
    });
    await expect(seller.getByText("Points clés").first()).toBeVisible();
    await expect(seller.getByText(MENTION).first()).toBeVisible();
    await expectNoSeriousViolation(seller);
  });

  await test.step("un document illisible est signalé au vendeur, et ne montre rien sur l'annonce", async () => {
    await fileAndAnalyse(seller, request, {
      fileName: "pv.pdf",
      type: "pv_ag",
      title: PV,
      shown: /Document à vérifier : illisible\./,
    });
    await expect(
      seller.getByRole("button", { name: `Afficher sur l'annonce : ${PV}` }),
    ).toHaveCount(0);
    // Its notification is read here: nothing is left in the bell of seller_a
    // for another spec, and the email of a notification read never leaves.
    await bell(seller).click();
    await expect(
      panel(seller).getByText("Un document de votre dossier est à vérifier").first(),
    ).toBeVisible();
    await panel(seller).getByRole("button", { name: "Tout marquer comme lu" }).click();
    await seller.keyboard.press("Escape");
  });

  await test.step("le vendeur partage le dossier : l'acquéreur lit le résumé qui lui est destiné", async () => {
    await seller.getByRole("button", { name: "Partager tout le dossier avec Chloé" }).click();
    await expect(seller.getByText(/documents? partagés? avec Chloé\./).first()).toBeVisible();
    await signIn(buyer, "buyer_c", "/acquereur/documents");
    await expect(buyer.getByRole("link", { name: `Ouvrir ${CARREZ}` })).toBeVisible();
    await expect(
      buyer.getByText("Résumé de l'assistant de test pour l'acquéreur (carrez).").first(),
    ).toBeVisible();
    await expect(buyer.getByText(/pour le vendeur/)).toHaveCount(0);
    // The document to check is shared too, without a reading aid.
    await expect(buyer.getByRole("link", { name: `Ouvrir ${PV}` })).toBeVisible();
    await expect(buyer.getByText(/\(pv_ag\)/)).toHaveCount(0);
    await expect(buyer.getByText(MENTION).first()).toBeVisible();
    await expectNoSeriousViolation(buyer);
  });

  await test.step("« Afficher sur l'annonce » : le fait apparaît sur l'annonce publique", async () => {
    const listingHref =
      (await buyer.getByRole("link", { name: "Voir l'annonce" }).first().getAttribute("href")) ??
      "";
    expect(listingHref).toMatch(/^\/annonce\//);
    const visitor = await openBrowser(browser, base, false);
    await visitor.goto(listingHref);
    const block = visitor.getByRole("heading", { name: "D'après les documents du vendeur" });
    await expect(block).toHaveCount(0);

    await seller.getByRole("button", { name: `Afficher sur l'annonce : ${CARREZ}` }).click();
    await expect(
      seller.getByRole("button", { name: `Retirer de l'annonce : ${CARREZ}` }),
    ).toBeVisible();
    await visitor.reload();
    await expect(block).toBeVisible();
    await expect(visitor.getByText("Source : Mesurage loi Carrez")).toBeVisible();
    await expect(visitor.getByText(/66,5\sm²/).first()).toBeVisible();
    await expect(visitor.getByText(MENTION).first()).toBeVisible();
    // Never the name the seller gave the document.
    await expect(visitor.getByText(CARREZ)).toHaveCount(0);
    await expectNoSeriousViolation(visitor);

    await seller.getByRole("button", { name: `Retirer de l'annonce : ${CARREZ}` }).click();
    await expect(
      seller.getByRole("button", { name: `Afficher sur l'annonce : ${CARREZ}` }),
    ).toBeVisible();
    await visitor.reload();
    await expect(block).toHaveCount(0);
    await visitor.context().close();
  });

  await test.step("les documents retirés, plus rien n'est lu par l'acquéreur", async () => {
    for (const title of [CARREZ, PV]) {
      await seller.getByRole("button", { name: `Retirer ${title}`, exact: true }).click();
      await seller.getByRole("dialog").getByRole("button", { name: "Retirer le document" }).click();
      await expect(seller.getByRole("link", { name: title, exact: true })).toHaveCount(0);
    }
    await buyer.reload();
    await expect(buyer.getByText(/Résumé de l'assistant de test/)).toHaveCount(0);
  });
});
