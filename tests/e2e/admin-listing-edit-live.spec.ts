import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// « Modifier » a listing from the back office (L1-30e, DECISIONS.md
// 2026-11-24): the team changes the price, then the title, of a listing
// online with a reason; the change shows in the history of the back office
// and of the seller, with the reason, and is written in audit_log; the seller
// gets a notice (bell and email). A listing of seller_a made here by SQL
// (psql, the base of the local stack), online at once, so that no listing of
// the seed is touched, and deleted at the end. A local stack just made by
// `scripts/local-stack.sh up` only (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1,
// project « seed-mutations »). Who may call listing_admin_edit is checked in
// supabase/tests/rls_admin_listing_edit.sql.

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
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec crée et modifie une annonce",
);
test.describe.configure({ mode: "serial" });

/** seller_a (supabase/seed/04_accounts.sql). */
const SELLER = "5eed0000-0000-4000-8000-00000000000a";
const run = Date.now().toString(36);
const PRICE_REASON = "Prix arrondi au millier, à la demande du vendeur.";
const TITLE_REASON = "Titre plus précis sur le nombre de pièces.";

function sql(statement: string): string {
  return execFileSync(
    "psql",
    [DATABASE_URL, "-q", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement],
    { encoding: "utf8" },
  ).trim();
}

type Made = { property: string; listing: string; reference: string };
let made: Made | null = null;

test.beforeAll(() => {
  const row = sql(`
    with prop as (
      insert into public.properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
      values ('${SELLER}', 'maison', '5 rue des Essais', '91600', 'Savigny-sur-Orge', 92, 4)
      returning id),
    listing as (
      insert into public.listings (property_id, title, description, price_cents)
      select id, 'Maison à corriger ${run}', 'Maison de test, modifiée par l''équipe.', 30050000 from prop
      returning id, property_id)
    select property_id || '|' || id from listing;`);
  const [property, listing] = row.split("|");
  sql(`update public.listings set status = 'published', submitted_at = now(), published_at = now()
        where id = '${listing}';`);
  const reference = sql(`select reference from public.listings where id = '${listing}'`);
  made = { property, listing, reference };
});

// What the spec wrote leaves with it: the notifications of the listing, the
// listing and its property (deleted, as a seller's deletion).
test.afterAll(() => {
  if (!made) return;
  sql(`delete from public.notifications where data->>'listing_id' = '${made.listing}';`);
  sql(`update public.listings set deleted_at = now() where id = '${made.listing}';`);
  sql(`update public.properties set deleted_at = now() where id = '${made.property}';`);
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

async function signIn(page: Page, account: "seller_a" | "admin", path: string) {
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
  await expect(page).toHaveURL(path);
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

test("l'équipe modifie le prix d'une annonce en ligne, avec un motif (ordinateur)", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const { listing, reference } = made!;
  const path = `/admin/annonces/${listing}`;
  const admin = await openBrowser(browser, baseURL ?? "http://localhost:3100", false);
  await signIn(admin, "admin", path);

  const opener = admin.getByRole("button", { name: `Modifier l'annonce ${reference}` });
  await opener.click();
  const dialog = admin.getByRole("dialog", { name: "Modifier l'annonce" });
  await expect(dialog.getByLabel("Titre")).toHaveValue(`Maison à corriger ${run}`);
  await expectNoSeriousViolation(admin);

  // Closed without a decision: nothing changes, the focus comes back.
  await admin.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await dialog.getByLabel("Prix").fill("300 000");
  // Without a reason: the field says so and takes the focus.
  await dialog.getByRole("button", { name: "Enregistrer la modification" }).click();
  const reason = dialog.getByLabel("Motif envoyé au vendeur");
  await expect(reason).toBeFocused();
  await expect(dialog.getByText("Le motif doit faire au moins 3 caractères.")).toBeVisible();
  await reason.fill(PRICE_REASON);
  await dialog.getByRole("button", { name: "Enregistrer la modification" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    admin.getByRole("status").filter({ hasText: "Annonce modifiée : le vendeur est prévenu" }),
  ).toBeVisible();

  // The history of the back office: the price, by the team, with the reason.
  const history = admin.locator("section", {
    has: admin.getByRole("heading", { name: "Modifications depuis la mise en ligne" }),
  });
  await expect(history.getByText(`Motif : ${PRICE_REASON}`)).toBeVisible();
  await expect(history.getByText(/par l'équipe Leenkey/).first()).toBeVisible();
  await expect(
    admin.locator("section", { has: admin.getByRole("heading", { name: "Historique" }) }),
  ).toContainText("Modifiée par l'équipe");
  await expectNoSeriousViolation(admin);

  expect(
    sql(`select price_cents || '|' || status from public.listings where id = '${listing}'`),
  ).toBe("30000000|published");
  expect(
    sql(`select old_value || '>' || new_value || '|' || reason from public.listing_revisions
          where listing_id = '${listing}' and field = 'price'`),
  ).toBe(`30050000>30000000|${PRICE_REASON}`);
  expect(
    sql(`select meta->>'reason' from public.audit_log
          where action = 'listing.admin_edit' and entity_id = '${listing}'`),
  ).toBe(PRICE_REASON);
  expect(
    sql(`select count(*) from public.notifications
          where profile_id = '${SELLER}' and type = 'listing.team_edited'
            and data->>'listing_id' = '${listing}' and email_after is not null`),
  ).toBe("1");
  // The team is not told of its own change.
  expect(
    sql(`select count(*) from public.notifications
          where type = 'listing.revised' and data->>'listing_id' = '${listing}'`),
  ).toBe("0");
});

test("l'équipe modifie le titre sur téléphone ; le vendeur lit le motif", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const base = baseURL ?? "http://localhost:3100";
  const { property, listing, reference } = made!;
  const admin = await openBrowser(browser, base, true);
  await signIn(admin, "admin", `/admin/annonces/${listing}`);
  await admin.getByRole("button", { name: `Modifier l'annonce ${reference}` }).click();
  // A full screen on a phone, with its back button.
  const dialog = admin.getByRole("dialog", { name: "Modifier l'annonce" });
  await expect(dialog.getByRole("button", { name: "Retour" })).toBeVisible();
  // Nothing changed: said in the dialog, nothing written.
  await dialog.getByLabel("Motif envoyé au vendeur").fill(TITLE_REASON);
  await dialog.getByRole("button", { name: "Enregistrer la modification" }).click();
  await expect(dialog.getByText("Rien n'a changé")).toBeVisible();
  await dialog.getByLabel("Titre").fill(`Maison 4 pièces à corriger ${run}`);
  await dialog.getByRole("button", { name: "Enregistrer la modification" }).click();
  await expect(dialog).toBeHidden();
  await expect(admin.getByRole("heading", { level: 1 })).toHaveText(
    `Maison 4 pièces à corriger ${run}`,
  );

  const seller = await openBrowser(browser, base, true);
  await signIn(seller, "seller_a", `/vendeur/biens/${property}/annonce`);
  const main = seller.getByRole("main");
  await expect(main.getByText(`Maison 4 pièces à corriger ${run}`).first()).toBeVisible();
  await expect(main.getByText(`Motif : ${TITLE_REASON}`)).toBeVisible();
  await expect(main.getByText(`Motif : ${PRICE_REASON}`)).toBeVisible();
  await expectNoSeriousViolation(seller);
  expect(
    sql(`select count(*) from public.notifications
          where profile_id = '${SELLER}' and type = 'listing.team_edited'
            and data->>'listing_id' = '${listing}'`),
  ).toBe("2");
});
