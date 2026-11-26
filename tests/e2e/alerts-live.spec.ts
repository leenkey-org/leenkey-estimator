import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L3-06 (SPEC-V2 16): the buyer alerts. A visitor is sent to sign in and
// comes back to the same search; buyer_c keeps a search as an alert from
// « Créer une alerte », finds it in /acquereur/alertes with its criteria,
// pauses it, renames it and deletes it; the route of the daily digest opens
// with CRON_SECRET only and returns its summary. The alert is created and
// deleted here, and what an earlier run left behind is removed first: a local stack made by `scripts/local-stack.sh up` only
// (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, project « seed-mutations »).
// Every locator names the alert of this run: other specs share the base.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const CRON_SECRET = process.env.CRON_SECRET;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec crée une alerte",
);

const SEARCH = "/acheter?ville=epinay-sur-orge&type=maison&budget_max=450000";
const ALERTS = "/acquereur/alertes";

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

async function signIn(page: Page, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill("buyer_c@test.leenkey.fr");
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

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/**
 * Deletes the alerts a run of this spec left behind (a failure midway): the
 * buyer never stays at the limit of 5 because of a test. Signed in, on the
 * page of the alerts.
 */
async function removeLeftovers(page: Page) {
  await page.goto(ALERTS);
  await expect(page.getByRole("heading", { level: 1, name: "Mes alertes" })).toBeVisible();
  for (let left = 0; left < 5; left += 1) {
    const stale = page.getByRole("button", { name: /^Supprimer l'alerte Alerte E2E / }).first();
    if ((await stale.count()) === 0) return;
    const label = (await stale.getAttribute("aria-label")) ?? "";
    await stale.click();
    const remove = page.getByRole("dialog", { name: "Supprimer cette alerte ?" });
    await remove.getByRole("button", { name: "Supprimer l'alerte" }).click();
    await expect(remove).toBeHidden();
    // The row leaves once the server answered: the next turn must not click
    // a button that is going away.
    await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  }
}

test("un visiteur est envoyé à la connexion, puis revient à sa recherche", async ({
  browser,
  baseURL,
}) => {
  const visitor = await openBrowser(browser, baseURL ?? "", true);
  // No criterion: no alert to create.
  await visitor.goto("/acheter");
  await expect(visitor.getByRole("search")).toBeVisible();
  await expect(visitor.getByRole("link", { name: "Créer une alerte" })).toHaveCount(0);
  await expect(visitor.getByRole("button", { name: "Créer une alerte" })).toHaveCount(0);

  await visitor.goto(SEARCH);
  const link = visitor.getByRole("link", { name: "Créer une alerte" }).first();
  await expect(link).toBeVisible();
  await expectNoOverflow(visitor);
  const href = (await link.getAttribute("href")) ?? "";
  expect(href.startsWith("/connexion?next=")).toBe(true);
  const next = new URL(href, baseURL).searchParams.get("next") ?? "";
  expect(next.startsWith("/acheter?")).toBe(true);
  expect(new URL(next, baseURL).searchParams.get("ville")).toBe("epinay-sur-orge");
  expect(new URL(next, baseURL).searchParams.get("budget_max")).toBe("450000");
  await visitor.context().close();
});

test("alertes : création depuis la recherche, pause, nouveau nom, suppression", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const name = `Alerte E2E ${Date.now()}`;
  const renamed = `${name} bis`;
  const buyer = await openBrowser(browser, baseURL ?? "", false);
  await signIn(buyer, ALERTS);
  await removeLeftovers(buyer);
  await buyer.goto(SEARCH);

  // From the search: the name is proposed from the criteria.
  await buyer.getByRole("button", { name: "Créer une alerte" }).first().click();
  const dialog = buyer.getByRole("dialog", { name: "Créer une alerte" });
  await expect(dialog).toBeVisible();
  const field = dialog.getByLabel("Nom de l'alerte");
  await expect(field).toHaveValue(/Épinay-sur-Orge · Maisons/);
  await expect(dialog).toContainText("Critères");
  await field.fill(name);
  await dialog.getByRole("button", { name: "Créer l'alerte" }).click();
  const done = buyer.getByRole("dialog", { name: "Votre alerte est créée" });
  await expect(done).toContainText(name);
  await done.getByRole("button", { name: "Gérer mes alertes" }).click();
  await buyer.waitForURL((url) => url.pathname === ALERTS);

  // In the alerts: its name, its criteria, the way to its listings.
  const row = buyer.getByRole("listitem").filter({ has: buyer.getByRole("heading", { name }) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Épinay-sur-Orge");
  await expect(row).toContainText("Maisons");
  await expect(row).toContainText("Active");
  await expect(buyer.getByText(/\d\u00A0\/\u00A05/)).toBeVisible();
  const see = row.getByRole("link", { name: `Voir les biens de l'alerte ${name}` });
  const seeHref = new URL((await see.getAttribute("href")) ?? "", baseURL);
  expect(seeHref.pathname).toBe("/acheter");
  expect(seeHref.searchParams.get("ville")).toBe("epinay-sur-orge");
  expect(seeHref.searchParams.get("type")).toBe("maison");
  expect(seeHref.searchParams.get("budget_max")).toBe("450000");
  await expectNoSeriousViolation(buyer);

  // Paused, and still paused once the page is read again.
  // The switch is named by the alert it pauses.
  const toggle = row.getByRole("switch", { name, exact: true });
  await expect(toggle).toBeChecked();
  // The switch answers before the server: wait for the answer of the action
  // before reading the page again (a reload would cancel a request in flight).
  const saved = () =>
    buyer.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === ALERTS,
    );
  // …then for the switch to be free again: it is disabled until the page has
  // the answer, and only then does its state say what was saved.
  const savedBy = async (click: () => Promise<void>) => {
    await Promise.all([saved(), click()]);
    await expect(row.getByRole("switch")).toBeEnabled();
  };
  await savedBy(() => toggle.click());
  await expect(toggle).not.toBeChecked();
  await expect(row).toContainText("En pause");
  await buyer.reload();
  await expect(row.getByRole("switch")).not.toBeChecked();
  await savedBy(() => row.getByRole("switch").click());
  await expect(row.getByRole("switch")).toBeChecked();
  // The digest below reads the base: the alert is active there too.
  await buyer.reload();
  await expect(row.getByRole("switch")).toBeChecked();

  // The route of the digest: closed without the secret; with it, its summary.
  // The base is shared with the other specs: only what this test created is
  // asserted (its alert is active and due), never a count of the whole base.
  const closed = await buyer.request.post("/api/cron/buyer-alerts");
  expect(closed.status()).toBe(401);
  if (CRON_SECRET) {
    const answer = await buyer.request.post("/api/cron/buyer-alerts", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(answer.status()).toBe(200);
    const summary = await answer.json();
    expect(summary).toMatchObject({
      ok: true,
      alerts: expect.any(Number),
      similar: { due: expect.any(Number) },
    });
    expect(summary.alerts).toBeGreaterThanOrEqual(1);
    expect(summary.buyers).toBeGreaterThanOrEqual(1);
    // The alert of this run went through the digest and is still there, active.
    await buyer.reload();
    await expect(row.getByRole("switch")).toBeChecked();
  }

  // A new name.
  await row.getByRole("button", { name: `Renommer l'alerte ${name}` }).click();
  const rename = buyer.getByRole("dialog", { name: "Renommer l'alerte" });
  await rename.getByLabel("Nom de l'alerte").fill(renamed);
  await rename.getByRole("button", { name: "Enregistrer" }).click();
  await expect(rename).toBeHidden();
  const renamedRow = buyer
    .getByRole("listitem")
    .filter({ has: buyer.getByRole("heading", { name: renamed, exact: true }) });
  await expect(renamedRow).toBeVisible();

  // On a phone: the same page, nothing wider than the screen.
  const phone = await openBrowser(browser, baseURL ?? "", true);
  await signIn(phone, ALERTS);
  await expect(phone.getByRole("heading", { name: renamed, exact: true })).toBeVisible();
  await expectNoOverflow(phone);
  await expectNoSeriousViolation(phone);
  await phone.goto(SEARCH);
  await expect(phone.getByRole("button", { name: "Créer une alerte" }).first()).toBeVisible();
  await expectNoOverflow(phone);
  await phone.context().close();

  // Deleted, after its confirmation.
  await renamedRow.getByRole("button", { name: `Supprimer l'alerte ${renamed}` }).click();
  const remove = buyer.getByRole("dialog", { name: "Supprimer cette alerte ?" });
  await expect(remove).toContainText(renamed);
  await remove.getByRole("button", { name: "Supprimer l'alerte" }).click();
  await expect(remove).toBeHidden();
  await expect(buyer.getByRole("heading", { name: renamed, exact: true })).toHaveCount(0);
  await buyer.context().close();
});
