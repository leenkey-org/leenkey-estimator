import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Locator, type Page } from "@playwright/test";

// Interventions of the adviser (DECISIONS.md 2026-11-23) on the seed. seller_b
// asks for an intervention on LK-0008 (Sérénité) from « Ma vente », with a
// reason and a message; the request is their message in the conversation with
// the adviser. The team finds it in the back office, schedules it, marks it
// done (it then counts in the plan of the seller), and corrects it: cancelled,
// it no longer counts. The initial appointment is planned apart. The requests
// and the messages stay (each run leaves one cancelled request and nothing
// counted, so the spec runs again on the same base; a run that fails cleans
// up after itself, see settle): only on a local stack,
// with E2E_SEED=1, SEED_PASSWORD and E2E_MUTATE=1 (project « seed-mutations »).
// Seed used here only: the interventions of LK-0008 and its conversation with
// the adviser, left answered and read (tests/e2e/advisor.spec.ts reads the
// shared inbox).

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec ajoute des demandes",
);

// One list of the team, one counter: each test in turn.
test.describe.configure({ mode: "serial" });

const LK0008 = "5eed1000-0000-4000-8000-000000000008";
const DASHBOARD = `/vendeur?bien=${LK0008}`;
const REQUEST = `/vendeur/biens/${LK0008}/intervention`;
const ADMIN = "/admin/messages/interventions";
/** The conversation of LK-0008 with the adviser, for the team (supabase/seed/05_demo_data.sql). */
const ADMIN_CONVERSATION = "/admin/messages/5eed2000-0000-4000-8000-000000000008";
const plain = (value: string) => value.replace(/\u00A0/g, " ");

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

async function signIn(page: Page, account: "seller_b" | "admin", path: string) {
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
  expect(
    results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => violation.id),
  ).toEqual([]);
}

/** « 2 interventions utilisées sur 6 »: how many are used, as the page says it. */
async function usedOn(scope: Page | Locator): Promise<number> {
  const text = plain(
    (await scope
      .getByText(/intervention(s)? utilisée(s)? sur/)
      .first()
      .textContent()) ?? "",
  );
  const match = /^(\d+) interventions? utilisées? sur 6$/.exec(text.trim());
  expect(match, `compteur lu : « ${text} »`).not.toBeNull();
  return Number(match?.[1]);
}

const counterText = (used: number) =>
  new RegExp(
    `^${used}\\sintervention${used > 1 ? "s" : ""} utilisée${used > 1 ? "s" : ""} sur\\s6$`,
  );

/** The entry of the list of the team that holds `text`. */
const entry = (page: Page, text: string) =>
  page
    .getByRole("list", { name: "Interventions du conseiller" })
    .getByRole("listitem")
    .filter({ hasText: text });

/** Clicks an action of an entry once the page is hydrated, then confirms it in its dialog. */
async function act(page: Page, item: Locator, action: string, confirm: string, note?: string) {
  const dialog = page.getByRole("dialog");
  await expect(async () => {
    await item.getByRole("button", { name: action, exact: true }).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  if (note) await dialog.getByLabel(/Note interne/).fill(note);
  await dialog.getByRole("button", { name: confirm, exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
}

/**
 * After a run that failed: what it may have left behind. Its request, still
 * waiting (it would hold one of the interventions of LK-0008 for good) or
 * marked done (it would count), is cancelled; the conversation of LK-0008 is
 * read by the team (tests/e2e/advisor.spec.ts counts the unread ones of the
 * shared inbox). Through the back office, as the team would. Never throws: the
 * failure reported is the one of the test.
 */
async function settle(team: Page, run: string) {
  try {
    await team.goto(ADMIN);
    if (new URL(team.url()).pathname === "/connexion") await signIn(team, "admin", ADMIN);
    for (const path of [ADMIN, `${ADMIN}?statut=faites`]) {
      await team.goto(path);
      const item = entry(team, run);
      if ((await item.count()) > 0) {
        await act(team, item, "Annulée", "Annuler l'intervention");
        await expect(team.getByText("Intervention annulée.")).toBeVisible();
      }
    }
    await expect(async () => {
      await team.goto(ADMIN_CONVERSATION);
      await team.waitForLoadState("networkidle");
      await team.goto("/admin/messages");
      await expect(
        team
          .getByRole("list", { name: "Conversations avec les vendeurs" })
          .getByRole("link", { name: /LK-0008/ })
          .getByText("Non lu"),
      ).toHaveCount(0, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  } catch (error) {
    console.error("[e2e] advisor interventions: cleanup failed", error);
  }
}

/** The pages of the test in progress, for the cleanup of a run that fails. */
let current: { seller: Page; team: Page; run: string } | null = null;

test.afterEach(async () => {
  if (!current) return;
  const { seller, team, run } = current;
  current = null;
  const info = test.info();
  if (info.status !== info.expectedStatus) await settle(team, run);
  await seller.context().close();
  await team.context().close();
});

test("le vendeur demande une intervention, l'équipe la planifie, la marque faite puis la corrige : le compteur suit @a11y", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, true);
  const team = await openBrowser(browser, base, false);
  const run = Date.now().toString(36);
  current = { seller, team, run };
  const message = `Bonjour, j'ai reçu une offre et je souhaite en parler avec vous. (${run})`;
  const answer = `Bonjour Bruno, je vous appelle jeudi à 10 h. (${run})`;
  let used = 0;

  await test.step("« Ma vente » montre le compteur de la formule et mène à la demande", async () => {
    await signIn(seller, "seller_b", DASHBOARD);
    const card = seller.getByRole("region", { name: "Mon conseiller Leenkey" });
    used = await usedOn(card);
    await expect(
      card.getByText(/^Rendez-vous initial : (à planifier|planifié|fait)$/),
    ).toBeVisible();
    await card.getByRole("link", { name: "Demander une intervention" }).click();
    await expect(seller).toHaveURL(REQUEST);
    await expect(seller.getByRole("heading", { level: 1 })).toHaveText("Demander une intervention");
    const counter = seller.getByRole("region", { name: "Interventions de votre formule" });
    await expect(counter.getByText(counterText(used))).toBeVisible();
    await expect(
      counter.getByText(
        /^Votre formule Sérénité comprend 6\sinterventions de votre conseiller Leenkey\.$/,
      ),
    ).toBeVisible();
    await expectNoSeriousViolation(seller);
  });

  await test.step("un motif et un message sont demandés, puis la demande part", async () => {
    const submit = seller.getByRole("button", { name: "Envoyer ma demande" });
    // Once the page is hydrated, an empty form says what is missing.
    await expect(async () => {
      await submit.click();
      await expect(seller.getByText("Choisissez un motif.")).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect(seller.getByLabel("Motif")).toBeFocused();
    await seller.getByLabel("Motif").selectOption({ label: "Offre reçue" });
    await submit.click();
    await expect(seller.getByText(/^Écrivez au moins 10\scaractères\.$/)).toBeVisible();
    await seller.getByLabel("Votre message").fill(message);
    await submit.click();
    await expect(seller.getByText(/^Votre demande est envoyée\./)).toBeVisible({ timeout: 15_000 });
    const requests = seller.getByRole("region", { name: "Vos demandes" });
    const mine = requests.getByRole("listitem").filter({ hasText: run });
    await expect(mine).toHaveCount(1);
    await expect(mine.getByText("Offre reçue", { exact: true })).toBeVisible();
    await expect(mine.getByText("En attente", { exact: true })).toBeVisible();
    // A request does not count: only an intervention done does.
    expect(
      await usedOn(seller.getByRole("region", { name: "Interventions de votre formule" })),
    ).toBe(used);
    await expectNoSeriousViolation(seller);
  });

  await test.step("la demande est son message dans la conversation avec le conseiller", async () => {
    await seller.getByRole("link", { name: "Voir la conversation" }).click();
    await expect(seller.getByRole("heading", { level: 1 })).toHaveText("Mon conseiller Leenkey");
    const thread = seller.getByRole("log", { name: "Messages de la conversation" });
    await expect(
      thread.getByText(`Demande d'intervention : Offre reçue`, { exact: false }).last(),
    ).toContainText(run);
    // Above the field: the counter and the way back to the requests.
    await expect(seller.getByRole("link", { name: "Demander une intervention" })).toHaveAttribute(
      "href",
      REQUEST,
    );
    await expectNoSeriousViolation(seller);
  });

  await test.step("l'équipe trouve la demande, avec son motif et le compteur du bien", async () => {
    await signIn(team, "admin", ADMIN);
    await expect(team.getByRole("heading", { level: 1 })).toHaveText("Interventions du conseiller");
    const item = entry(team, run);
    await expect(item).toHaveCount(1);
    await expect(item.getByText("Bruno", { exact: false }).first()).toBeVisible();
    await expect(item.getByText("LK-0008", { exact: false })).toBeVisible();
    await expect(item.getByText("Offre reçue", { exact: true })).toBeVisible();
    await expect(item.getByText("À traiter", { exact: true })).toBeVisible();
    await expect(item.getByText(counterText(used))).toBeVisible();
    await expectNoSeriousViolation(team);
  });

  await test.step("« Planifiée », avec une note interne que le vendeur ne lit pas", async () => {
    await act(
      team,
      entry(team, run),
      "Planifiée",
      "Marquer comme planifiée",
      `Appel jeudi (${run})`,
    );
    await expect(team.getByText("Intervention planifiée.")).toBeVisible();
    const item = entry(team, run);
    await expect(item.getByText("Planifiée", { exact: true }).first()).toBeVisible();
    await expect(item.getByText(`Note interne : Appel jeudi (${run})`)).toBeVisible();
    await seller.goto(REQUEST);
    const mine = seller
      .getByRole("region", { name: "Vos demandes" })
      .getByRole("listitem")
      .filter({ hasText: run });
    await expect(mine.getByText("Planifiée", { exact: true })).toBeVisible();
    await expect(seller.getByText("Appel jeudi")).toHaveCount(0);
  });

  await test.step("« Faite » : l'intervention est comptée dans la formule du vendeur", async () => {
    await act(team, entry(team, run), "Faite", "Marquer comme faite");
    await expect(team.getByText("Intervention marquée comme faite.")).toBeVisible();
    // Done: it leaves what waits for the team.
    await expect(entry(team, run)).toHaveCount(0);
    await team.goto(`${ADMIN}?statut=faites`);
    const item = entry(team, run);
    await expect(item.getByText(/^Faite le .+ par Cédric$/)).toBeVisible();
    await expect(item.getByText(counterText(used + 1))).toBeVisible();
    await seller.goto(REQUEST);
    expect(
      await usedOn(seller.getByRole("region", { name: "Interventions de votre formule" })),
    ).toBe(used + 1);
    await expect(
      seller
        .getByRole("region", { name: "Vos demandes" })
        .getByRole("listitem")
        .filter({ hasText: run })
        .getByText("Faite", { exact: true }),
    ).toBeVisible();
  });

  await test.step("une erreur se corrige : annulée, l'intervention n'est plus comptée", async () => {
    await act(team, entry(team, run), "Annulée", "Annuler l'intervention");
    await expect(team.getByText("Intervention annulée.")).toBeVisible();
    await team.goto(`${ADMIN}?statut=annulees`);
    await expect(entry(team, run).getByText(counterText(used))).toBeVisible();
    await seller.goto(REQUEST);
    expect(
      await usedOn(seller.getByRole("region", { name: "Interventions de votre formule" })),
    ).toBe(used);
    await expect(
      seller
        .getByRole("region", { name: "Vos demandes" })
        .getByRole("listitem")
        .filter({ hasText: run })
        .getByText("Annulée", { exact: true }),
    ).toBeVisible();
  });

  await test.step("l'équipe répond au vendeur dans la conversation, qui la lit", async () => {
    await entry(team, run).getByRole("link", { name: "Écrire au vendeur" }).click();
    await expect(team).toHaveURL(/\/admin\/messages\/[0-9a-f-]{36}$/);
    const field = team.getByRole("textbox", { name: "Votre message" });
    const thread = team.getByRole("log", { name: "Messages de la conversation" });
    await expect(thread.getByText(run, { exact: false }).last()).toBeVisible();
    await field.fill(answer);
    await expect(async () => {
      if ((await field.inputValue()) !== "") {
        await team.getByRole("button", { name: "Envoyer" }).click();
      }
      await expect(thread.getByText(answer)).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await seller.goto(REQUEST);
    await seller.getByRole("link", { name: "Écrire à mon conseiller" }).click();
    await expect(
      seller.getByRole("log", { name: "Messages de la conversation" }).getByText(answer),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test("le rendez-vous initial se planifie à part, sans compter dans la formule", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page, "admin", ADMIN);
  // The initial appointment of LK-0008 has no row until the team plans it.
  const initial = () =>
    page
      .getByRole("list", { name: "Interventions du conseiller" })
      .getByRole("listitem")
      .filter({ hasText: "LK-0008" })
      .filter({ hasText: "Rendez-vous initial" });
  const toPlan = initial().filter({ hasText: "À planifier" });
  // A run that failed between « Planifiée » and the last « Annulée » left an
  // initial appointment scheduled (in « À traiter ») or done (in « Faites »):
  // cancelled first, as the team would, so that it is to plan again.
  for (const path of [ADMIN, `${ADMIN}?statut=faites`]) {
    await page.goto(path);
    for (let left = 0; left < 5; left += 1) {
      const stale = initial().filter({ hasNotText: "À planifier" }).first();
      if ((await stale.count()) === 0) break;
      await act(page, stale, "Annulée", "Annuler l'intervention");
      await expect(page.getByText("Intervention annulée.")).toBeVisible();
      await page.goto(path);
    }
  }
  await page.goto(ADMIN);
  await expect(toPlan).toHaveCount(1);
  // Planned or done, never cancelled before it exists.
  await expect(toPlan.getByRole("button", { name: "Annulée", exact: true })).toHaveCount(0);
  const before = plain((await toPlan.getByText(/utilisées? sur/).textContent()) ?? "");

  await act(page, toPlan, "Planifiée", "Marquer comme planifiée");
  await expect(page.getByText("Intervention planifiée.")).toBeVisible();
  // « Planifiée » is also a button of an appointment to plan: the one that is no longer.
  const planned = initial().filter({ hasNotText: "À planifier" });
  await expect(planned).toHaveCount(1);
  await expect(toPlan).toHaveCount(0);

  // Done: never counted in the interventions of the plan.
  await act(page, planned, "Faite", "Marquer comme faite");
  await expect(page.getByText("Intervention marquée comme faite.")).toBeVisible();
  await page.goto(`${ADMIN}?statut=faites`);
  const done = initial()
    .filter({ hasText: /Faite le/ })
    .first();
  await expect(done).toBeVisible();
  expect(plain((await done.getByText(/utilisées? sur/).textContent()) ?? "")).toBe(before);

  // Cancelled (the seed stays as it was): the initial appointment is to plan again.
  await act(page, done, "Annulée", "Annuler l'intervention");
  await expect(page.getByText("Intervention annulée.")).toBeVisible();
  await page.goto(ADMIN);
  await expect(toPlan).toHaveCount(1);
});
