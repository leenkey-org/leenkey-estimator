import AxeBuilder from "@axe-core/playwright";
import {
  devices,
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";

// L3-07 (SPEC-V2 12 and 15): the assistant of a buyer answers from the
// documents a seller shared with them, and names the document. Before any
// share, the assistant says it has no document; the seller files a mesurage
// (analysed by the scheduled task, the model of the tests) and shares the
// file; the buyer opens the assistant from « Documents partagés » (« Poser
// une question sur les documents »), reads an answer that cites the
// document, and under it the documents read, each leading back to its line
// of « Documents partagés »; the conversation read again shows the same;
// the document removed, the assistant has nothing left to answer from.
// A local stack just made by `scripts/local-stack.sh up` only (E2E_SEED=1,
// SEED_PASSWORD, E2E_MUTATE=1, AI_MOCK=1, CRON_SECRET). Seed used: LK-0001 of
// seller_a and its conversation with buyer_c, as
// tests/e2e/document-analysis-live.spec.ts, which files and shares on the
// same property and counts what buyer_c reads: this spec runs after it, in
// its own project (« seed-document-answers »), never beside it. The whole
// file is shared (the tab has no share of one document): what is read of the
// buyer is looked for in the line of the document of this spec, named with
// the time of the run; what an earlier run left is removed first.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const CRON_SECRET = process.env.CRON_SECRET;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec dépose un document",
);
test.skip(!CRON_SECRET, "CRON_SECRET de la pile locale requis (scripts/local-stack.sh env)");
// The model of the tests only: never a call of the real one from a test.
test.skip(
  process.env.AI_MOCK !== "1",
  "AI_MOCK=1 requis : l'analyse et la réponse sont celles du modèle de test",
);

const PROPERTY = "5eed1000-0000-4000-8000-000000000001";
const TAB = `/vendeur/biens/${PROPERTY}/documents`;
const TASK = "/api/cron/analyze-documents";
const LISTING = "/annonce/appartement-3-pieces-savigny-sur-orge-lk0001";
const TITLE_START = "Mesurage test réponses";
const TITLE = `${TITLE_START} ${Date.now()}`;
const SUMMARY = "Résumé de l'assistant de test pour l'acquéreur (carrez).";
const QUESTION = "Que disent les documents partagés sur ce bien ?";
const NOTHING = /^Aucun document analysé n'est partagé avec vous pour ce bien\./;
const SOURCES = "Documents consultés pour cette réponse";

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

/** One run of the scheduled task (three documents at most). */
async function runTask(request: APIRequestContext) {
  const response = await request.get(TASK, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
  expect(response.status()).toBe(200);
}

const thread = (page: Page) => page.getByRole("log", { name: "Conversation avec l'assistant" });
const sources = (page: Page) => page.getByRole("region", { name: SOURCES });
/** The line of the document of this spec on « Documents partagés ». */
const sharedLine = (page: Page) => page.locator('li[id^="document-"]').filter({ hasText: TITLE });

/**
 * The sources are under the answer: the bubble of the answer (not the text
 * node found in it) comes before the block of the sources in the thread.
 */
async function sourcesFollow(page: Page, text: string) {
  const answer = thread(page).getByText(text, { exact: false });
  await expect(answer).toBeVisible();
  return answer.evaluate((node, label) => {
    const region = document.querySelector(`section[aria-label="${label}"]`);
    if (!region) return false;
    // The bubble: the ancestor of the text that stands beside the sources.
    let bubble: Element = node;
    while (bubble.parentElement && !bubble.parentElement.contains(region)) {
      bubble = bubble.parentElement;
    }
    return (
      !bubble.contains(region) &&
      Boolean(bubble.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
  }, SOURCES);
}

/** A new conversation, then the question suggested about the documents. */
async function askAboutDocuments(page: Page) {
  const suggestion = page.getByRole("button", { name: QUESTION });
  // A click before the page is hydrated does nothing: clicked again until it does.
  await expect(async () => {
    await page.getByRole("button", { name: "Nouvelle conversation" }).click();
    await expect(suggestion).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect(async () => {
    await suggestion.click();
    await expect(thread(page).getByText("Vous", { exact: true })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

test("réponses à partir des documents partagés : rien sans partage, le document cité, ses sources, plus rien une fois retiré", async ({
  browser,
  baseURL,
  request,
}) => {
  test.setTimeout(300_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);

  await test.step("le vendeur dépose un mesurage, lu par l'assistant, pas encore partagé", async () => {
    await signIn(seller, "seller_a", TAB);
    await expect(seller.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
    // What a run that stopped early left behind.
    const leftovers = seller.getByRole("button", { name: new RegExp(`^Retirer ${TITLE_START}`) });
    for (let count = await leftovers.count(); count > 0; count -= 1) {
      await leftovers.first().click();
      await seller.getByRole("dialog").getByRole("button", { name: "Retirer le document" }).click();
      await expect(leftovers).toHaveCount(count - 1);
    }
    await seller
      .getByLabel("Fichier")
      .setInputFiles({ name: "mesurage.pdf", mimeType: "application/pdf", buffer: PDF });
    await seller.getByLabel("Type de document").selectOption("carrez");
    await seller.getByLabel("Nom du document").fill(TITLE);
    await seller.getByRole("button", { name: "Déposer le document" }).click();
    await expect(seller.getByRole("link", { name: TITLE, exact: true })).toBeVisible({
      timeout: 20_000,
    });
    // Only as many runs as this document needs.
    await expect(async () => {
      await runTask(request);
      await seller.reload();
      await expect(
        seller.getByText("Résumé de l'assistant de test pour le vendeur (carrez).").first(),
      ).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
  });

  let listingId = "";
  await test.step("sans partage, l'assistant de l'acquéreur, ouvert sur l'annonce, ne sait rien du document et le dit", async () => {
    // The assistant about this listing from the start: the documents of this property only.
    await signIn(buyer, "buyer_c", LISTING);
    const ask = buyer
      .getByRole("link", { name: "Demander à l'assistant" })
      .locator("visible=true")
      .first();
    listingId =
      new URL((await ask.getAttribute("href")) ?? "", base).searchParams.get("annonce") ?? "";
    expect(listingId).toMatch(/^[0-9a-f-]{36}$/);
    await buyer.goto(`/assistant?annonce=${listingId}&sujet=documents`);
    await expect(
      buyer
        .getByRole("link", { name: "Retour aux documents partagés" })
        .locator("visible=true")
        .first(),
    ).toHaveAttribute("href", "/acquereur/documents");
    await askAboutDocuments(buyer);
    await expect(thread(buyer).getByText(NOTHING)).toBeVisible();
    await expect(thread(buyer).getByText(/demander l'accès au vendeur/)).toBeVisible();
    await expect(buyer.getByText(TITLE)).toHaveCount(0);
    // No document read: no source under the answer.
    await expect(sources(buyer)).toHaveCount(0);
  });

  await test.step("le vendeur partage le dossier : « Poser une question sur les documents » ouvre l'assistant sur l'annonce", async () => {
    await seller.getByRole("button", { name: "Partager tout le dossier avec Chloé" }).click();
    await expect(seller.getByText(/documents? partagés? avec Chloé\./).first()).toBeVisible();
    await buyer.goto("/acquereur/documents");
    await expect(sharedLine(buyer)).toHaveCount(1);
    await expect(sharedLine(buyer).getByRole("link", { name: `Ouvrir ${TITLE}` })).toBeVisible();
    await expect(sharedLine(buyer).getByText(SUMMARY)).toBeVisible();
    // The entry of this property: it opens the assistant about its listing.
    const entry = buyer.locator(`a[href="/assistant?annonce=${listingId}&sujet=documents"]`);
    await expect(entry).toHaveCount(1);
    await expect(entry).toHaveAccessibleName(/^Poser une question sur les documents/);
    await expectNoSeriousViolation(buyer);
    await shots(buyer, "shared-documents-question");
    await entry.click();
    await buyer.waitForURL((address) => address.pathname === "/assistant");
    expect(new URL(buyer.url()).searchParams.get("sujet")).toBe("documents");
  });

  let documentHref = "";
  await test.step("la réponse cite le document, et montre dessous les documents consultés", async () => {
    await askAboutDocuments(buyer);
    const answer = thread(buyer).getByText(`D'après le document « ${TITLE} » : ${SUMMARY}`, {
      exact: false,
    });
    await expect(answer).toBeVisible();
    await expect(thread(buyer).getByText(/Cette réponse ne certifie rien/)).toBeVisible();
    // Never the summary written for the seller.
    await expect(buyer.getByText(/pour le vendeur/)).toHaveCount(0);

    await expect(sources(buyer)).toHaveCount(1);
    const link = sources(buyer).getByRole("link", { name: TITLE, exact: true });
    await expect(link).toBeVisible();
    documentHref = (await link.getAttribute("href")) ?? "";
    expect(documentHref).toMatch(/^\/acquereur\/documents#document-[0-9a-f-]{36}$/);
    await expect(
      sources(buyer).getByText(
        /Elle ne certifie rien et ne remplace ni le diagnostiqueur ni le notaire\./,
      ),
    ).toBeVisible();
    // The sources are under the answer, not before it.
    expect(await sourcesFollow(buyer, `D'après le document « ${TITLE} »`)).toBe(true);
    await expectNoSeriousViolation(buyer);
    await shots(buyer, "assistant-document-sources");
  });

  await test.step("la conversation relue montre la même réponse et les mêmes sources, dessous", async () => {
    await buyer.reload();
    const answer = thread(buyer).getByText(`D'après le document « ${TITLE} »`, { exact: false });
    await expect(answer).toBeVisible();
    await expect(sources(buyer)).toHaveCount(1);
    await expect(sources(buyer).getByRole("link", { name: TITLE, exact: true })).toHaveAttribute(
      "href",
      documentHref,
    );
    expect(await sourcesFollow(buyer, `D'après le document « ${TITLE} »`)).toBe(true);
  });

  await test.step("une source ramène au document, sur « Documents partagés »", async () => {
    await sources(buyer).getByRole("link", { name: TITLE, exact: true }).click();
    await buyer.waitForURL((address) => address.pathname === "/acquereur/documents");
    expect(new URL(buyer.url()).hash).toBe(documentHref.slice(documentHref.indexOf("#")));
    await expect(sharedLine(buyer).getByRole("link", { name: `Ouvrir ${TITLE}` })).toBeVisible();
    await expect(buyer.locator(new URL(buyer.url()).hash)).toContainText(TITLE);
  });

  await test.step("le document retiré, l'assistant n'a plus rien à en dire", async () => {
    await seller.getByRole("button", { name: `Retirer ${TITLE}`, exact: true }).click();
    await seller.getByRole("dialog").getByRole("button", { name: "Retirer le document" }).click();
    await expect(seller.getByRole("link", { name: TITLE, exact: true })).toHaveCount(0);
    await buyer.reload();
    await expect(sharedLine(buyer)).toHaveCount(0);
    await buyer.goto(`/assistant?annonce=${listingId}&sujet=documents`);
    await askAboutDocuments(buyer);
    // The answer is whole; the document removed is no longer one it is written from.
    await expect(
      thread(buyer).getByText(/^(Aucun document analysé n'est partagé|D'après le document)/),
    ).toBeVisible();
    await expect(thread(buyer).getByText(TITLE)).toHaveCount(0);
    await expect(sources(buyer).getByRole("link", { name: TITLE, exact: true })).toHaveCount(0);
  });
});
