import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// The identity check of a buyer before a visit (DECISIONS.md 2026-11-23): a
// buyer invited to visit who has deposited no identity document cannot book
// and is led to deposit one; they deposit it, book at once (the check of the
// team is not waited for); the seller sees a label, never the file; the team
// refuses a first document with a reason the buyer reads, then marks the
// second one as checked; each file is deleted; the buyer is told.
// A local stack just made by `scripts/local-stack.sh up` only (E2E_SEED=1,
// SEED_PASSWORD, E2E_MUTATE=1, project « seed-mutations »). Seed used:
// buyer_d (no identity document), seller_b and their conversation about
// LK-0008. Re-runnable, also after a failure: what the spec writes (the
// document and its file, the slot, the invitation, the visit, the notices of
// the conversation, the notifications) is removed before and after it, by SQL
// (psql, the base of the local stack). The rights are checked in
// supabase/tests/rls_identity_documents.sql.

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
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec dépose une pièce d'identité et réserve une visite",
);

/** LK-0008 of seller_b, buyer_d and their conversation (supabase/seed/05_demo_data.sql). */
const PROPERTY = "5eed1000-0000-4000-8000-000000000008";
const BUYER = "5eed0000-0000-4000-8000-00000000000d";
const SELLER = "5eed0000-0000-4000-8000-00000000000b";
const CONVERSATION = "5eed2000-0000-4000-8000-000000000018";
const CONVERSATION_PATH = `/messages/${CONVERSATION}`;
const VISITS_PATH = `/vendeur/biens/${PROPERTY}/visites`;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF\n");

function sql(statement: string): string {
  return execFileSync(
    "psql",
    [DATABASE_URL, "-q", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement],
    { encoding: "utf8" },
  ).trim();
}

/**
 * Removes what a run of the spec leaves, a failed one included: the visits,
 * the slots and the invitation of buyer_d on LK-0008, the notices they posted
 * in the conversation, the notifications about them and about the identity
 * document, the documents and what is left of their files; and the task
 * « Créneaux de visite ouverts » the first slot ticked for LK-0008, whenever
 * the property has no slot left (a retry would read it as ticked before).
 */
function cleanUp() {
  sql(`
    set session_replication_role = replica;
    delete from public.notifications
     where (profile_id in ('${BUYER}', '${SELLER}') and type like 'visit.%'
            and data->>'property_id' = '${PROPERTY}')
        or (profile_id = '${BUYER}' and type like 'identity.%');
    delete from public.notifications n using public.visits v
     where v.property_id = '${PROPERTY}' and v.buyer_id = '${BUYER}'
       and n.data->>'visit_id' = v.id::text;
    delete from public.messages
     where conversation_id = '${CONVERSATION}'
       and (kind = 'visit_invite' or (kind = 'system' and meta->>'visit_id' is not null));
    with gone as (delete from public.visits
                   where property_id = '${PROPERTY}' and buyer_id = '${BUYER}' returning slot_id)
    delete from public.visit_slots where id in (select slot_id from gone);
    delete from public.visit_slots s
     where s.property_id = '${PROPERTY}'
       and not exists (select 1 from public.visits v where v.slot_id = s.id);
    delete from public.visit_invitations
     where property_id = '${PROPERTY}' and buyer_id = '${BUYER}';
    delete from public.identity_documents where buyer_id = '${BUYER}';
    delete from public.sale_task_status st using public.sale_step_tasks t
     where t.id = st.task_id and t.auto_trigger = 'visit_slot.created'
       and st.property_id = '${PROPERTY}'
       and not exists (select 1 from public.visit_slots s where s.property_id = '${PROPERTY}');`);
  // The files, as the storage service deletes them; a failure leaves an
  // orphan file in the local bucket, nothing a test reads.
  try {
    sql(`
      select set_config('storage.allow_delete_query', 'true', false);
      delete from storage.objects
       where bucket_id = 'documents' and name like '${BUYER}/identity/%';`);
  } catch {
    // Left as it is.
  }
}

test.beforeAll(cleanUp);
test.afterAll(cleanUp);

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

async function signIn(page: Page, account: "seller_b" | "buyer_d" | "admin", path: string) {
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

/** The day in Paris, `days` from now: « 2026-11-21 ». */
function parisDay(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    new Date(Date.now() + days * 86_400_000),
  );
}

const thread = (page: Page) => page.getByRole("log", { name: "Messages de la conversation" });
const identity = (page: Page) => page.getByRole("region", { name: "Pièce d'identité" });

test("pièce d'identité : réservation bloquée, dépôt, réservation, libellé vendeur, refus, vérification", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(300_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);
  const admin = await openBrowser(browser, base, false);

  await test.step("le vendeur ouvre un créneau et invite l'acquéreur", async () => {
    await signIn(seller, "seller_b", VISITS_PATH);
    await expect(seller.getByRole("heading", { name: "Visites", level: 2 })).toBeVisible();
    await seller.getByLabel("Date").fill(parisDay(4));
    await seller.getByLabel("Heure de début").fill("15:00");
    await seller.getByLabel("Durée").selectOption("30");
    await seller.getByRole("button", { name: "Ajouter le créneau" }).click();
    await expect(seller.getByText("Créneau ajouté.")).toBeVisible();
    // Not invited yet: nothing about the identity of the buyer.
    const contact = seller.getByRole("listitem").filter({ hasText: "David" }).last();
    await expect(contact.getByText(/Pièce d'identité|Identité vérifiée/)).toHaveCount(0);
    await contact.getByRole("button", { name: "Inviter David à visiter" }).click();
    await expect(seller.getByText(/^Invitation envoyée à David\./)).toBeVisible();
    // Invited, nothing deposited: a label only.
    await expect(contact.getByText("Pièce d'identité non déposée")).toBeVisible();
  });

  let bookingUrl = "";
  await test.step("sans pièce d'identité, l'acquéreur ne réserve pas : il est mené au dépôt", async () => {
    await signIn(buyer, "buyer_d", CONVERSATION_PATH);
    await thread(buyer).getByRole("link", { name: "Réserver un créneau" }).last().click();
    await buyer.waitForURL(/\/visites\/reserver\/[0-9a-f]{64}$/);
    bookingUrl = new URL(buyer.url()).pathname;
    await expect(buyer.getByRole("heading", { name: "Réserver une visite" })).toBeVisible();
    await expect(
      buyer.getByText(/^Avant de réserver, déposez une pièce d'identité\./),
    ).toBeVisible();
    await expect(buyer.getByText("Un créneau est libre pour cette visite.")).toBeVisible();
    await expect(buyer.getByRole("button", { name: "Réserver ce créneau" })).toHaveCount(0);
    await expect(identity(buyer).getByText(/jamais transmise à notre assistant/)).toBeVisible();
    await expectNoSeriousViolation(buyer);
    // On a phone, nothing wider than the screen.
    expect(await buyer.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    // The database refuses the booking too, whatever the page shows.
    const token = bookingUrl.split("/").pop() ?? "";
    const refused = sql(`
      select set_config('request.jwt.claims', '{"sub":"${BUYER}","role":"authenticated"}', false);
      set role authenticated;
      do $$ begin
        perform public.visit_book('${token}', (select id from public.visit_slots
                                              where property_id = '${PROPERTY}' and removed_at is null
                                              order by starts_at desc limit 1));
        raise exception 'booked';
      exception when sqlstate '55000' then raise notice 'refused';
      end $$;
      select 'refused';`);
    expect(refused).toContain("refused");
  });

  let documentHref = "";
  await test.step("il dépose sa pièce, puis réserve sans attendre la vérification", async () => {
    const card = identity(buyer);
    // Nothing chosen: said on each field.
    await card.getByRole("button", { name: "Déposer ma pièce d'identité" }).click();
    await expect(card.getByText("Choisissez le type de la pièce.")).toBeVisible();
    await expect(card.getByText("Choisissez un fichier.")).toBeVisible();
    await card.getByLabel("Type de pièce").selectOption("passeport");
    await card.getByLabel("Fichier").setInputFiles({
      name: "Passeport David Moreau.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
    await card.getByRole("button", { name: "Déposer ma pièce d'identité" }).click();
    // The page reads the document again: the slots are there now.
    await expect(buyer.getByRole("button", { name: "Réserver ce créneau" })).toBeVisible();
    await expect(buyer.getByText(/^Avant de réserver, déposez/)).toHaveCount(0);
    await buyer.getByRole("button", { name: /15\sh\s–\s15\sh\s30/ }).click();
    await buyer.getByRole("button", { name: "Réserver ce créneau" }).click();
    await buyer.waitForURL(/\/visites\/[0-9a-f-]{36}\?reservee=1$/);
    await expect(buyer.getByText("Votre visite est réservée.")).toBeVisible();

    // Its project page: the document deposited, its file opened by its buyer only.
    await buyer.goto("/acquereur/profil#identite");
    const filed = identity(buyer);
    await expect(filed.getByText("Passeport", { exact: true })).toBeVisible();
    await expect(filed.getByText(/^Pièce d'identité déposée\. Vous pouvez réserver/)).toBeVisible();
    await expectNoSeriousViolation(buyer);
    documentHref =
      (await filed.getByRole("link", { name: "Voir le document (PDF)" }).getAttribute("href")) ??
      "";
    expect(documentHref).toMatch(/^\/documents\/identite\/[0-9a-f-]{36}$/);
    // Never the name of the file chosen: a new one, in the folder of the buyer.
    const path = sql(
      `select storage_path from public.identity_documents where buyer_id = '${BUYER}' and withdrawn_at is null`,
    );
    expect(path).toMatch(new RegExp(`^${BUYER}/identity/[0-9a-f-]{36}\\.pdf$`));
    expect(sql(`select count(*) from storage.objects where name = '${path}'`)).toBe("1");
    const opened = await buyer.request.get(documentHref, { maxRedirects: 0 });
    expect(opened.status()).toBe(303);
  });

  await test.step("le vendeur voit un libellé, jamais le fichier ni le type", async () => {
    await seller.goto(VISITS_PATH);
    const visit = seller.getByRole("listitem").filter({ hasText: "Avec David" }).first();
    await expect(
      visit.getByText("Pièce d'identité déposée, en cours de vérification"),
    ).toBeVisible();
    await expect(
      seller.getByText(/^Vous voyez seulement si la pièce d'identité/).first(),
    ).toBeVisible();
    await expect(seller.getByText("Passeport")).toHaveCount(0);
    await expectNoSeriousViolation(seller);
    expect((await seller.request.get(documentHref)).status()).toBe(404);
  });

  await test.step("l'équipe refuse la pièce avec un motif : fichier supprimé, l'acquéreur lit le motif et en dépose une autre", async () => {
    await signIn(admin, "admin", "/admin");
    await admin
      .getByRole("link", { name: /Pièce d'identité à vérifier/ })
      .filter({ hasText: "David" })
      .click();
    await expect(admin).toHaveURL(/\/admin\/utilisateurs\/[0-9a-f-]{36}#identite$/);
    const section = admin.getByRole("region", { name: "Pièce d'identité" });
    await expect(section.getByText(/Passeport\s·\sÀ vérifier/)).toBeVisible();
    await section.getByRole("button", { name: "Refuser" }).click();
    const dialog = admin.getByRole("dialog");
    await expect(dialog.getByText("Refuser cette pièce d'identité ?")).toBeVisible();
    // Without a reason, nothing is decided.
    await dialog.getByRole("button", { name: "Refuser la pièce" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^La pièce a expiré/ }).click();
    await dialog.getByRole("button", { name: "Refuser la pièce" }).click();
    await expect(
      admin.getByText("Pièce refusée. Son fichier est supprimé et l'acquéreur est prévenu."),
    ).toBeVisible();
    await expect(section.getByText(/Passeport\s·\sRefusée le .+ par Cédric/)).toBeVisible();
    await expect(section.getByRole("button", { name: "Marquer comme vérifiée" })).toHaveCount(0);
    expect(sql(`select count(*) from storage.objects where name like '${BUYER}/identity/%'`)).toBe(
      "0",
    );
    // The seller: not deposited again, never « refusée » nor the reason; the visit stays.
    await seller.reload();
    const visit = seller.getByRole("listitem").filter({ hasText: "Avec David" }).first();
    await expect(visit.getByText("Pièce d'identité non déposée")).toBeVisible();
    await expect(seller.getByText(/expiré|Refusée/)).toHaveCount(0);

    // The buyer reads the reason, in their space and in the notification queued for an email.
    await buyer.reload();
    const card = identity(buyer);
    await expect(
      card.getByText(
        /^Nous n'avons pas pu vérifier la pièce que vous aviez déposée\. Notre remarque : La pièce a expiré/,
      ),
    ).toBeVisible();
    expect((await buyer.request.get(documentHref)).status()).toBe(404);
    expect(
      sql(
        `select (email_after is not null)::text || ':' || (data->>'reason') from public.notifications where profile_id = '${BUYER}' and type = 'identity.refused'`,
      ),
    ).toBe("true:La pièce a expiré : déposez une pièce en cours de validité.");
    await expectNoSeriousViolation(buyer);
    // Another document, deposited at once; the visit already booked was never cancelled.
    await card.getByLabel("Type de pièce").selectOption("carte_identite");
    await card.getByLabel("Fichier").setInputFiles({
      name: "Carte David Moreau.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
    await card.getByRole("button", { name: "Déposer ma pièce d'identité" }).click();
    await expect(card.getByText("Carte d'identité", { exact: true })).toBeVisible();
    await expect(card.getByText(/^Pièce d'identité déposée\. Vous pouvez réserver/)).toBeVisible();
    documentHref =
      (await card.getByRole("link", { name: "Voir le document (PDF)" }).getAttribute("href")) ?? "";
    expect(documentHref).toMatch(/^\/documents\/identite\/[0-9a-f-]{36}$/);
    expect(
      sql(
        `select count(*) from public.visits where property_id = '${PROPERTY}' and buyer_id = '${BUYER}' and status = 'confirmed'`,
      ),
    ).toBe("1");
    // One file in the folder: the one of the document that waits.
    expect(sql(`select count(*) from storage.objects where name like '${BUYER}/identity/%'`)).toBe(
      "1",
    );
  });

  await test.step("l'équipe ouvre la pièce et la marque comme vérifiée : le fichier est supprimé", async () => {
    await admin.goto("/admin");
    await admin
      .getByRole("link", { name: /Pièce d'identité à vérifier/ })
      .filter({ hasText: "David" })
      .click();
    await expect(admin).toHaveURL(/\/admin\/utilisateurs\/[0-9a-f-]{36}#identite$/);
    const section = admin.getByRole("region", { name: "Pièce d'identité" });
    await expect(section.getByText(/Carte d'identité\s·\sÀ vérifier/)).toBeVisible();
    const file = await admin.request.get(
      (await section.getByRole("link", { name: "Ouvrir le fichier" }).getAttribute("href")) ?? "",
      { maxRedirects: 0 },
    );
    expect(file.status()).toBe(303);
    await expectNoSeriousViolation(admin);
    await section.getByLabel("Note interne").fill("Carte lisible, au nom du compte.");
    await section.getByRole("button", { name: "Marquer comme vérifiée" }).click();
    await expect(
      admin.getByText(
        "Pièce marquée comme vérifiée. Son fichier est supprimé et l'acquéreur est prévenu.",
      ),
    ).toBeVisible();
    await expect(section.getByText(/Carte d'identité\s·\sVérifiée le .+ par Cédric/)).toBeVisible();
    // The checked document and the refused one: neither has a file left.
    await expect(section.getByText(/^Fichier supprimé le /)).toHaveCount(2);
    await expect(section.getByRole("button", { name: "Marquer comme vérifiée" })).toHaveCount(0);
    await expect(section.getByRole("link", { name: "Ouvrir le fichier" })).toHaveCount(0);
    // Gone from the bucket, said so by the document, written in the audit log.
    expect(sql(`select count(*) from storage.objects where name like '${BUYER}/identity/%'`)).toBe(
      "0",
    );
    expect(
      sql(
        `select (checked_at is not null and file_deleted_at is not null)::text from public.identity_documents where buyer_id = '${BUYER}' and withdrawn_at is null and refused_at is null`,
      ),
    ).toBe("true");
    expect(
      sql(`
        select string_agg(distinct a.action, ',' order by a.action) from public.audit_log a
          join public.identity_documents d on d.id = a.entity_id
         where d.buyer_id = '${BUYER}' and a.action like 'identity.%'`),
    ).toBe("identity.check,identity.file_deleted,identity.opened,identity.refuse");
    // The reason of the refusal is the buyer's to read: never in the audit log.
    expect(
      sql(`
        select count(*) from public.audit_log a
          join public.identity_documents d on d.id = a.entity_id
         where d.buyer_id = '${BUYER}' and a.meta::text like '%expiré%'`),
    ).toBe("0");
    expect((await admin.request.get(documentHref)).status()).toBe(404);
  });

  await test.step("l'acquéreur est prévenu, son espace dit l'identité vérifiée", async () => {
    // The same address as before: read again (a navigation to it would not load the page).
    await buyer.reload();
    const checked = identity(buyer);
    await expect(checked.getByText(/^Identité vérifiée par Leenkey le /)).toBeVisible();
    await expect(checked.getByText("Fichier supprimé après notre vérification.")).toBeVisible();
    await expect(checked.getByRole("link", { name: /Voir le document/ })).toHaveCount(0);
    await expect(checked.getByRole("button", { name: "Retirer" })).toHaveCount(0);
    expect((await buyer.request.get(documentHref)).status()).toBe(404);
    // The bell, and the email queued for the next run of the scheduled task.
    await buyer
      .getByRole("button", { name: /^Notifications/ })
      .locator("visible=true")
      .click();
    await expect(
      buyer.getByRole("dialog", { name: "Notifications" }).getByText("Votre identité est vérifiée"),
    ).toBeVisible();
    expect(
      sql(
        `select (email_after is not null)::text from public.notifications where profile_id = '${BUYER}' and type = 'identity.checked'`,
      ),
    ).toBe("true");
  });

  await test.step("le vendeur voit « Identité vérifiée par Leenkey »", async () => {
    await seller.goto(VISITS_PATH);
    const visit = seller.getByRole("listitem").filter({ hasText: "Avec David" }).first();
    await expect(visit.getByText("Identité vérifiée par Leenkey")).toBeVisible();
  });
});
