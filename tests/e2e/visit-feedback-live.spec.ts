import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L3-03 (SPEC-V2 14): the day after a visit, its buyer and the seller are
// asked for their feedback; the buyer gives an interest and a comment, the
// seller reads them and writes a note the buyer never reads. No booking is in
// the past: the visit of yesterday is written by SQL (psql, the base of the
// local stack), without its triggers (no booking notice, no confirmation),
// and removed at the end. A local stack just made by `scripts/local-stack.sh
// up` only (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, project
// « seed-mutations »). Seed used: buyer_c and the property LK-0001 of
// seller_a. The 7 days and the rights are checked in
// supabase/tests/rls_visit_feedback.sql.

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
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec écrit une visite passée",
);

/** LK-0001 and buyer_c (supabase/seed/05_demo_data.sql). */
const PROPERTY = "5eed1000-0000-4000-8000-000000000001";
const BUYER = "5eed0000-0000-4000-8000-00000000000c";
const COMMENT = "Belle lumière au séjour, la toiture reste à vérifier.";
const NOTE = "Visite ponctuelle, questions sur les charges.";

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
  // A visit that ended 20 hours ago, written without the triggers of a booking.
  visitId = sql(`
    set session_replication_role = replica;
    with slot as (
      insert into public.visit_slots (property_id, starts_at, ends_at)
      values ('${PROPERTY}', now() - interval '20 hours 30 minutes', now() - interval '20 hours')
      returning id)
    insert into public.visits (slot_id, property_id, buyer_id)
    select id, '${PROPERTY}', '${BUYER}' from slot returning id;`);
  expect(visitId).toMatch(/^[0-9a-f-]{36}$/);
});

test.afterAll(() => {
  if (!visitId) return;
  sql(`
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

/** How many requests for feedback about the visit are still unread. */
const unreadRequests = () =>
  sql(`select count(*) from public.notifications
        where type = 'visit.feedback_requested' and data->>'visit_id' = '${visitId}'
          and read_at is null`);

test("retour de visite : demande du lendemain, retour de l'acquéreur, note du vendeur", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);
  const visitPath = `/visites/${visitId}`;

  await test.step("le lendemain, les deux parties sont sollicitées une fois", async () => {
    sql("select public.visits_ask_feedback()");
    sql("select public.visits_ask_feedback()");
    expect(unreadRequests()).toBe("2");
    expect(
      sql(`select string_agg(distinct link, ',') from public.notifications
            where type = 'visit.feedback_requested' and data->>'visit_id' = '${visitId}'`),
    ).toBe(visitPath);
  });

  await test.step("l'acquéreur donne son intérêt et un commentaire", async () => {
    await signIn(buyer, "buyer_c", visitPath);
    await expect(buyer.getByText("Cette visite est passée.")).toBeVisible();
    await expect(buyer.getByRole("heading", { name: "Votre retour sur la visite" })).toBeVisible();
    await expect(buyer.getByText("Votre note sur la visite")).toHaveCount(0);
    await expectNoSeriousViolation(buyer);
    // Nothing chosen: said, nothing sent.
    await buyer.getByRole("button", { name: "Envoyer mon retour" }).click();
    await expect(buyer.getByText("Choisissez votre intérêt, de 1 à 5.")).toBeVisible();
    await buyer.getByRole("radio", { name: "4 sur 5 : Intéressé" }).click();
    await buyer.getByRole("textbox", { name: /^Commentaire/ }).fill(COMMENT);
    await buyer.getByRole("button", { name: "Envoyer mon retour" }).click();
    await expect(buyer.getByText("Votre retour est enregistré.")).toBeVisible();
    await expect(buyer.getByRole("button", { name: "Modifier mon retour" })).toBeVisible();
    await expect(buyer.getByText(/^Modifiable jusqu'au /)).toBeVisible();
    // The request of the buyer is answered: read, its email does not leave.
    expect(unreadRequests()).toBe("1");
  });

  await test.step("le vendeur lit le retour tel qu'il est donné et écrit sa note", async () => {
    await signIn(seller, "seller_a", visitPath);
    await expect(seller.getByRole("heading", { name: "Retour de l'acquéreur" })).toBeVisible();
    await expect(seller.getByText("Intérêt 4 / 5")).toBeVisible();
    await expect(seller.getByText(COMMENT)).toBeVisible();
    // No form of the buyer for the seller, no score, no average.
    await expect(seller.getByRole("radio")).toHaveCount(0);
    await expect(seller.getByRole("heading", { name: "Votre note sur la visite" })).toBeVisible();
    await expect(seller.getByText("Cette note reste privée")).toBeVisible();
    // An empty first note: said, nothing saved.
    await seller.getByRole("button", { name: "Enregistrer ma note" }).click();
    await expect(seller.getByText("Écrivez votre note.")).toBeVisible();
    await seller.getByRole("textbox", { name: /^Note/ }).fill(NOTE);
    await seller.getByRole("button", { name: "Enregistrer ma note" }).click();
    await expect(seller.getByText("Votre note est enregistrée.")).toBeVisible();
    await expectNoSeriousViolation(seller);
    expect(unreadRequests()).toBe("0");
  });

  await test.step("l'onglet Visites du bien montre le retour de la visite passée", async () => {
    await seller.goto(`/vendeur/biens/${PROPERTY}/visites`);
    await expect(
      seller.getByRole("heading", { name: "Visites passées et annulées" }),
    ).toBeVisible();
    await expect(seller.getByText("Intérêt 4 / 5").first()).toBeVisible();
    await expect(seller.getByText(COMMENT).first()).toBeVisible();
    await expectNoSeriousViolation(seller);
    await seller
      .getByRole("link", { name: /^Voir la visite du / })
      .first()
      .click();
    await seller.waitForURL(/\/visites\/[0-9a-f-]{36}$/);
  });

  await test.step("l'acquéreur ne lit jamais la note du vendeur, et modifie son retour", async () => {
    await buyer.reload();
    await expect(buyer.getByRole("heading", { name: "Votre retour sur la visite" })).toBeVisible();
    await expect(buyer.getByText(NOTE)).toHaveCount(0);
    expect(await buyer.content()).not.toContain(NOTE);
    await expect(buyer.getByRole("radio", { name: "4 sur 5 : Intéressé" })).toBeChecked();
    await buyer.getByRole("radio", { name: "5 sur 5 : Très intéressé" }).click();
    await buyer.getByRole("button", { name: "Modifier mon retour" }).click();
    await expect(buyer.getByText("Votre retour est enregistré.")).toBeVisible();
    await seller.goto(visitPath);
    await expect(seller.getByText("Intérêt 5 / 5")).toBeVisible();
    await expect(seller.getByRole("textbox", { name: /^Note/ })).toHaveValue(NOTE);
  });

  await test.step("un autre compte ne lit pas la visite", async () => {
    const anonymous = await browser.newContext({ baseURL: base });
    const response = await anonymous.request.get(visitPath, { maxRedirects: 0 });
    expect([302, 307, 401, 404]).toContain(response.status());
    await anonymous.close();
  });
});
