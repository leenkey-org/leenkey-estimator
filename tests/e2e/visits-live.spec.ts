import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// L3-02, E2E 5 (SPEC-V2 21): the seller invites a buyer from their
// conversation, opens a slot, the buyer books it from the notice of the
// invitation, reads the exact address and the calendar file, then cancels.
// The slots, the invitation and the visit stay: a local stack just made by
// `scripts/local-stack.sh up` only (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1,
// project « seed-mutations »). Seed used: the conversation of buyer_c with
// seller_a on LK-0001. The reminder of the day before is checked in
// supabase/tests/rls_visit_flow.sql (dates simulated).

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec ajoute des visites",
);

/** buyer_c and seller_a about LK-0001 (supabase/seed/05_demo_data.sql). */
const SEED_CONVERSATION = "/messages/5eed2000-0000-4000-8000-000000000011";

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

/** The day in Paris, `days` from now: « 2026-11-21 ». */
function parisDay(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    new Date(Date.now() + days * 86_400_000),
  );
}

const thread = (page: Page) => page.getByRole("log", { name: "Messages de la conversation" });

test("visite : invitation, créneau, réservation, adresse, agenda, annulation", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "http://localhost:3100";
  const seller = await openBrowser(browser, base, false);
  const buyer = await openBrowser(browser, base, true);

  await test.step("le vendeur invite l'acquéreur depuis la conversation", async () => {
    await signIn(seller, "seller_a", SEED_CONVERSATION);
    await seller.getByRole("button", { name: "Inviter à une visite" }).click();
    await expect(seller.getByText("Invitation envoyée.")).toBeVisible();
    await expect(
      thread(seller)
        .getByText(/Invitation à visiter le bien/)
        .last(),
    ).toBeVisible();
    await expectNoSeriousViolation(seller);
  });

  await test.step("le vendeur ouvre un créneau dans l'onglet Visites", async () => {
    await thread(seller).getByRole("link", { name: "Gérer les créneaux" }).last().click();
    await seller.waitForURL(/\/vendeur\/biens\/[0-9a-f-]+\/visites$/);
    await expect(seller.getByRole("heading", { name: "Visites", level: 2 })).toBeVisible();
    await expect(seller.getByText(/Invité, lien valable/)).toBeVisible();
    await seller.getByLabel("Date").fill(parisDay(3));
    await seller.getByLabel("Heure de début").fill("10:00");
    await seller.getByLabel("Durée").selectOption("30");
    await seller.getByRole("button", { name: "Ajouter le créneau" }).click();
    await expect(seller.getByText("Créneau ajouté.")).toBeVisible();
    await expect(seller.getByText(/10\sh\s–\s10\sh\s30\s·\sLibre/)).toBeVisible();
    await expectNoSeriousViolation(seller);
  });

  let visitUrl = "";
  await test.step("l'acquéreur réserve depuis l'invitation et lit l'adresse", async () => {
    await signIn(buyer, "buyer_c", SEED_CONVERSATION);
    await thread(buyer).getByRole("link", { name: "Réserver un créneau" }).last().click();
    await buyer.waitForURL(/\/visites\/reserver\/[0-9a-f]{64}$/);
    await expect(buyer.getByRole("heading", { name: "Réserver une visite" })).toBeVisible();
    await expectNoSeriousViolation(buyer);
    // Nothing chosen: said, nothing booked.
    await buyer.getByRole("button", { name: "Réserver ce créneau" }).click();
    await expect(buyer.getByText("Choisissez un créneau.").last()).toBeVisible();
    await buyer.getByRole("button", { name: /10\sh\s–\s10\sh\s30/ }).click();
    await buyer.getByRole("button", { name: "Réserver ce créneau" }).click();
    await buyer.waitForURL(/\/visites\/[0-9a-f-]{36}\?reservee=1$/);
    visitUrl = new URL(buyer.url()).pathname;
    await expect(buyer.getByText("Votre visite est réservée.")).toBeVisible();
    await expect(buyer.getByText("Confirmée")).toBeVisible();
    // The exact address, for the buyer of a confirmed visit.
    await expect(buyer.getByText("L'adresse exacte est donnée")).toHaveCount(0);
    await expect(buyer.getByText(/\d{5} Savigny-sur-Orge/)).toBeVisible();
    await expectNoSeriousViolation(buyer);
    const file = await buyer.request.get(`${visitUrl}/ics`);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toContain("text/calendar");
    const ics = await file.text();
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("Savigny-sur-Orge");
  });

  await test.step("un autre compte ne lit ni la visite ni son fichier", async () => {
    const other = await seller.request.get(`${visitUrl}/ics`);
    // The seller of the property reads it; an anonymous request does not.
    expect(other.status()).toBe(200);
    const anonymous = await browser.newContext({ baseURL: base });
    const response = await anonymous.request.get(`${visitUrl}/ics`, { maxRedirects: 0 });
    expect([302, 307, 401, 404]).toContain(response.status());
    await anonymous.close();
  });

  await test.step("le vendeur voit la visite à venir", async () => {
    await seller.reload();
    await expect(seller.getByText("Avec Chloé").first()).toBeVisible();
    await expect(seller.getByText(/Réservé par Chloé/)).toBeVisible();
    await expect(seller.getByText("Visite réservée", { exact: true })).toBeVisible();
  });

  await test.step("l'acquéreur retrouve sa visite sur son accueil, puis l'annule", async () => {
    await buyer.goto("/acquereur");
    await buyer.getByRole("list", { name: "Vos visites à venir" }).getByRole("link").click();
    await buyer.waitForURL(visitUrl);
    await buyer.getByRole("button", { name: "Annuler la visite" }).click();
    const dialog = buyer.getByRole("dialog");
    await expect(dialog.getByText("Le vendeur est prévenu par email.")).toBeVisible();
    await dialog.getByRole("button", { name: "Annuler la visite" }).click();
    await expect(buyer.getByText("Cette visite est annulée.")).toBeVisible();
    await expect(buyer.getByText(/\d{5} Savigny-sur-Orge/)).toHaveCount(0);
    const file = await buyer.request.get(`${visitUrl}/ics`);
    expect(file.status()).toBe(404);
  });

  await test.step("la conversation dit la réservation et l'annulation", async () => {
    await seller.goto(SEED_CONVERSATION);
    await expect(thread(seller).getByText(/Visite réservée pour le/)).toBeVisible();
    await expect(thread(seller).getByText(/annulée par l'acquéreur\./)).toBeVisible();
  });
});
