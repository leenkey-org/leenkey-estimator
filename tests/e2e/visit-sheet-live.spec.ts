import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// The technical sheet of the property of a booked visit (DECISIONS.md
// 2026-11-24): its buyer finds the link on the page of the visit and reads
// the PDF; the seller of the property and the team read it too; any other
// account gets a 404, an anonymous visitor is sent to the sign-in; a
// cancelled visit has no sheet any more. The visit is written by SQL (psql,
// the base of the local stack) without the triggers of a booking, an hour in
// the past so that the specs that book on LK-0001 (visits-live) do not meet
// it, and removed at the end. A local stack just made by
// `scripts/local-stack.sh up` only (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1,
// project « seed-mutations »). Seed used: buyer_c and the property LK-0001 of
// seller_a. What the sheet says is checked in tests/unit/visits/sheet.test.ts.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);
/** The base of scripts/local-stack.sh; never a remote one. */
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54326/postgres";
const localBase = /@(127\.0\.0\.1|localhost)[:/]/.test(DATABASE_URL);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack || !localBase,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec écrit une visite",
);

/** LK-0001 and buyer_c (supabase/seed/05_demo_data.sql). */
const PROPERTY = "5eed1000-0000-4000-8000-000000000001";
const BUYER = "5eed0000-0000-4000-8000-00000000000c";
const LINK = "Fiche technique du bien (PDF)";

type Account = "seller_a" | "seller_b" | "buyer_c" | "buyer_d" | "admin";

function sql(statement: string): string {
  return execFileSync(
    "psql",
    [DATABASE_URL, "-q", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement],
    {
      encoding: "utf8",
    },
  ).trim();
}

let visitId = "";

test.beforeAll(() => {
  // A confirmed visit that ended an hour ago, written without the triggers of
  // a booking (no notice, no email): too recent for the request of feedback.
  visitId = sql(`
    set session_replication_role = replica;
    with slot as (
      insert into public.visit_slots (property_id, starts_at, ends_at)
      values ('${PROPERTY}', now() - interval '90 minutes', now() - interval '60 minutes')
      returning id)
    insert into public.visits (slot_id, property_id, buyer_id)
    select id, '${PROPERTY}', '${BUYER}' from slot returning id;`);
  expect(visitId).toMatch(/^[0-9a-f-]{36}$/);
});

test.afterAll(() => {
  if (!visitId) return;
  sql(`
    set session_replication_role = replica;
    delete from public.notifications where data->>'visit_id' = '${visitId}';
    with gone as (delete from public.visits where id = '${visitId}' returning slot_id)
    delete from public.visit_slots where id in (select slot_id from gone);`);
});

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

async function signIn(page: Page, account: Account, path: string) {
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

test("fiche technique : lien de la visite, PDF, comptes autorisés, visite annulée", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "http://localhost:3100";
  const visitPath = `/visites/${visitId}`;
  const sheetPath = `${visitPath}/fiche-technique`;
  const buyer = await openBrowser(browser, base, true);

  await test.step("l'acquéreur trouve le lien sur sa visite et lit le PDF", async () => {
    await signIn(buyer, "buyer_c", visitPath);
    const link = buyer.getByRole("link", { name: LINK });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", sheetPath);
    await expectNoSeriousViolation(buyer);
    const pdf = await buyer.request.get(sheetPath);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect(pdf.headers()["cache-control"]).toContain("no-store");
    expect(pdf.headers()["content-disposition"]).toContain("fiche-technique-LK-0001.pdf");
    expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  await test.step("le vendeur du bien et l'équipe la lisent aussi", async () => {
    for (const account of ["seller_a", "admin"] as const) {
      const page = await openBrowser(browser, base, false);
      await signIn(page, account, account === "admin" ? "/admin" : "/vendeur");
      const pdf = await page.request.get(sheetPath);
      expect(pdf.status(), account).toBe(200);
      expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
      await page.context().close();
    }
  });

  await test.step("un autre compte reçoit un 404, un visiteur est mené à la connexion", async () => {
    for (const account of ["seller_b", "buyer_d"] as const) {
      const other = await openBrowser(browser, base, false);
      await signIn(other, account, account === "seller_b" ? "/vendeur" : "/acquereur");
      const response = await other.request.get(sheetPath, { maxRedirects: 0 });
      expect(response.status(), account).toBe(404);
      await other.context().close();
    }
    const anonymous = await browser.newContext({ baseURL: base });
    const response = await anonymous.request.get(sheetPath, { maxRedirects: 0 });
    expect([302, 303, 307]).toContain(response.status());
    expect(response.headers().location).toContain("/connexion");
    // A visit that does not exist: the same answer as a visit of someone else.
    const unknown = await buyer.request.get(
      "/visites/00000000-0000-4000-8000-000000000000/fiche-technique",
      { maxRedirects: 0 },
    );
    expect(unknown.status()).toBe(404);
    await anonymous.close();
  });

  await test.step("une visite annulée n'a plus de fiche", async () => {
    sql(`set session_replication_role = replica;
         update public.visits set status = 'cancelled', cancelled_at = now() where id = '${visitId}';`);
    const response = await buyer.request.get(sheetPath, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    await buyer.goto(visitPath);
    await expect(buyer.getByText("Cette visite est annulée.")).toBeVisible();
    await expect(buyer.getByRole("link", { name: LINK })).toHaveCount(0);
  });
});
