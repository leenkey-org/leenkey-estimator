import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// Deleting a listing (DECISIONS.md 2026-11-22, requests of Cédric): its
// seller deletes it from the page of their property (confirmation), it
// leaves the search at once; the team asks the seller to bring another one
// into line, the seller reads the request, and once the deadline passed
// without a change the team deletes it by hand. Two listings of seller_a
// made here by SQL (psql, the base of the local stack), online at once, so
// that no listing of the seed is touched; the deadline is moved back by SQL
// (nobody waits 7 days). A local stack just made by `scripts/local-stack.sh
// up` only (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, project
// « seed-mutations »). The rules (offers, suspension, who may delete) are
// checked in supabase/tests/rls_listing_deletion.sql.

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
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec crée et supprime des annonces",
);
test.describe.configure({ mode: "serial" });

/** seller_a (supabase/seed/04_accounts.sql). */
const SELLER = "5eed0000-0000-4000-8000-00000000000a";
const run = Date.now().toString(36);
const REASON = "Les photos ne montrent pas le bien : remplacez-les.";

function sql(statement: string): string {
  return execFileSync(
    "psql",
    [DATABASE_URL, "-q", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement],
    {
      encoding: "utf8",
    },
  ).trim();
}

type Made = { property: string; listing: string; reference: string; slug: string };

/** A listing of seller_a online at once (the review is tested elsewhere). */
function online(title: string): Made {
  const row = sql(`
    with prop as (
      insert into public.properties (owner_id, type, address_line, postal_code, city, surface_m2, rooms)
      values ('${SELLER}', 'maison', '3 rue des Essais', '91600', 'Savigny-sur-Orge', 92, 4)
      returning id),
    listing as (
      insert into public.listings (property_id, title, description, price_cents)
      select id, '${title}', 'Maison de test, supprimée par la spec.', 31000000 from prop
      returning id, property_id)
    select property_id || '|' || id from listing;`);
  const [property, listing] = row.split("|");
  sql(`update public.listings set status = 'published', submitted_at = now(), published_at = now()
        where id = '${listing}';`);
  const [reference, slug] = sql(
    `select reference || '|' || slug from public.listings where id = '${listing}'`,
  ).split("|");
  return { property, listing, reference, slug };
}

const made: Made[] = [];

test.beforeAll(() => {
  made.push(online(`Maison à supprimer ${run}`), online(`Maison à mettre en conformité ${run}`));
});

// What the spec wrote for seller_a leaves with it: the notifications of the two
// listings (the rows of the listings stay, deleted).
test.afterAll(() => {
  if (made.length === 0) return;
  const ids = made.map((m) => `'${m.listing}'`).join(", ");
  sql(`delete from public.notifications where data->>'listing_id' in (${ids});`);
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

test("le vendeur supprime son annonce en ligne, après confirmation", async ({
  browser,
  baseURL,
}) => {
  const base = baseURL ?? "http://localhost:3100";
  const { property, slug } = made[0];
  const sheet = `/vendeur/biens/${property}`;
  const page = await openBrowser(browser, base, true);
  expect((await page.request.get(`/annonce/${slug}`)).status()).toBe(200);

  await signIn(page, "seller_a", sheet);
  const actions = page.getByRole("main").getByRole("group", { name: "Actions sur votre annonce" });
  const opener = actions.getByRole("button", { name: "Supprimer l'annonce" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Supprimer votre annonce ?" });
  await expect(dialog).toContainText("vous ne pourrez pas les récupérer");
  await expect(dialog).toContainText("Vos conversations restent lisibles");
  await expectNoSeriousViolation(page);
  // Closed without a decision: nothing changes, the focus comes back.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await dialog.getByRole("button", { name: "Supprimer l'annonce" }).click();
  await expect(page).toHaveURL("/vendeur");
  await expect(page.locator(`a[href="${sheet}"]`)).toHaveCount(0);
  expect((await page.goto(sheet))?.status()).toBe(404);
  // Out of the search and of its page at once.
  expect((await page.request.get(`/annonce/${slug}`)).status()).toBe(404);
});

test("mise en conformité demandée, puis suppression par l'équipe après le délai", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const base = baseURL ?? "http://localhost:3100";
  const { property, listing, reference, slug } = made[1];
  const adminPath = `/admin/annonces/${listing}`;
  const admin = await openBrowser(browser, base, false);
  const seller = await openBrowser(browser, base, true);

  await test.step("l'équipe demande une mise en conformité, avec un motif", async () => {
    await signIn(admin, "admin", adminPath);
    const group = admin.getByRole("group", {
      name: `Mise en conformité de l'annonce ${reference}`,
    });
    await group.getByRole("button", { name: "Demander une mise en conformité" }).click();
    const dialog = admin.getByRole("dialog", { name: "Demander une mise en conformité" });
    await dialog.getByLabel("Motif envoyé au vendeur").fill(REASON);
    await dialog.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(dialog).toBeHidden();
    await expect(admin.getByText("Demande envoyée : le vendeur est prévenu")).toBeVisible();
    await expect(admin.getByText(REASON, { exact: true })).toBeVisible();
    // Before the deadline, the deletion is closed.
    await expect(group.getByRole("button", { name: "Supprimer l'annonce" })).toBeDisabled();
    await expect(admin.getByText(/^La suppression sera possible après le /)).toBeVisible();
    await expectNoSeriousViolation(admin);
    expect(
      sql(`select count(*) from public.notifications
            where profile_id = '${SELLER}' and type = 'listing.compliance_requested'
              and data->>'listing_id' = '${listing}' and email_after is not null`),
    ).toBe("1");
    expect(
      sql(`select count(*) from public.audit_log
            where action = 'listing.compliance_request' and entity_id = '${listing}'`),
    ).toBe("1");
  });

  await test.step("le vendeur lit la demande, son motif et sa date limite", async () => {
    await signIn(seller, "seller_a", `/vendeur/biens/${property}`);
    const main = seller.getByRole("main");
    await expect(
      main.getByText("Nous vous demandons de mettre votre annonce en conformité"),
    ).toBeVisible();
    await expect(main.getByText(`Notre remarque : ${REASON}`)).toBeVisible();
    await expect(
      main.getByText(/^Modifiez-la avant le .+ nous pourrons la supprimer\.$/),
    ).toBeVisible();
    await expectNoSeriousViolation(seller);
  });

  await test.step("le délai passé sans modification, l'équipe supprime l'annonce", async () => {
    // The deadline moved back as the owner of the tables: 7 days do not pass
    // in a test. The listing was made and sent now: its sending and the last
    // change of its property moved before the request too, as they would be.
    sql(`update public.listings
            set compliance_requested_at = now() - interval '8 days',
                compliance_due_at = now() - interval '1 day',
                submitted_at = now() - interval '10 days',
                published_at = now() - interval '10 days'
          where id = '${listing}';
         update public.properties set updated_at = now() - interval '10 days'
          where id = '${property}';`);
    await admin.goto(adminPath);
    await expect(admin.getByText("Le délai est écoulé sans modification")).toBeVisible();
    const group = admin.getByRole("group", {
      name: `Mise en conformité de l'annonce ${reference}`,
    });
    await group.getByRole("button", { name: "Supprimer l'annonce" }).click();
    const dialog = admin.getByRole("dialog", { name: "Supprimer l'annonce ?" });
    await expect(dialog).toContainText("Cette suppression est définitive.");
    await dialog.getByRole("button", { name: "Supprimer l'annonce" }).click();
    await expect(admin).toHaveURL(/\/admin\/annonces(\?.*)?$/);
    expect((await admin.goto(adminPath))?.status()).toBe(404);
    expect((await admin.request.get(`/annonce/${slug}`)).status()).toBe(404);
    expect(
      sql(`select meta->>'by' from public.audit_log
            where action = 'listing.delete' and entity_id = '${listing}'`),
    ).toBe("admin");
  });

  await test.step("le vendeur reçoit le dernier avis", async () => {
    expect(
      sql(`select count(*) from public.notifications
            where profile_id = '${SELLER}' and type = 'listing.deleted'
              and data->>'listing_id' = '${listing}' and email_after is not null`),
    ).toBe("1");
    expect((await seller.goto(`/vendeur/biens/${property}`))?.status()).toBe(404);
  });
});
