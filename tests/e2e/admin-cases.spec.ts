import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Page } from "@playwright/test";
import { consentValue } from "./google";

// L1-30c: the cases and the reports of the back office, on the seed: the
// case of LK-0001 (in progress), the payment of LK-0008 to check, the report
// of seller_a on the messages of buyer_d. The tests take the case of LK-0008
// in hand, follow it, write a note, tick a task of Leenkey; read the reported
// conversation, warn buyer_d (never suspended: other specs sign the seed
// accounts in) and close the report. Runs only on a local stack just made by
// `scripts/local-stack.sh up`, with E2E_SEED=1, SEED_PASSWORD and
// E2E_MUTATE=1, never on the preprod (project « seed-mutations »). The 404
// of these pages for any other account: tests/e2e/navigation.spec.ts.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec change un dossier et clôt un signalement",
);
test.describe.configure({ mode: "serial" });

const CASE_CHECK = "5eed5000-0000-4000-8000-000000000008";
const REPORT = "5eed6000-0000-4000-8000-000000000001";

/** Signs the admin in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill("admin@test.leenkey.fr");
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  await page.goto(path);
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page
      .waitForURL((url) => url.pathname !== "/conditions", { timeout: 5_000 })
      .catch(() => {
        // Accepted by a parallel test in between: the page itself opens now.
      });
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
  await expect(page).toHaveURL(path);
}

const feedback = (page: Page, text: string | RegExp) =>
  page.getByRole("status").filter({ hasText: text });

// Local stack: no RESEND_API_KEY, or one with EMAIL_TEST_INBOX (.env.local).
const EMAIL_NOTE = /Email non envoyé : environnement local\.|Email envoyé à la boîte de test/;

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test("dossiers : la liste, le paiement à vérifier, puis un dossier traité de bout en bout", async ({
  page,
}) => {
  await signIn(page, "/admin/dossiers");
  await expect(page.getByRole("heading", { level: 1, name: "Dossiers" })).toBeVisible();
  await expect(page.getByText(/1\spaiement à vérifier/)).toBeVisible();
  const table = page.getByRole("table", { name: "Dossiers" });
  const row = table.locator("tbody tr").filter({ hasText: "LK-0008" });
  await expect(row).toContainText("Paiement à vérifier");
  await expect(row).toContainText("Nouveau");
  await expectNoSeriousViolation(page);

  // Filters and search in the address.
  await page.getByRole("link", { name: /^En cours/ }).click();
  await expect(page).toHaveURL("/admin/dossiers?statut=en-cours");
  await expect(table.locator("tbody tr")).toContainText(["LK-0001"]);
  await page.goto("/admin/dossiers?q=LK-0008");
  await expect(table.locator("tbody tr")).toHaveCount(1);

  await table
    .getByRole("link", { name: /^Ouvrir le dossier « Paiement de la formule Accompagné/ })
    .click();
  await expect(page).toHaveURL(`/admin/dossiers/${CASE_CHECK}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("LK-0008");
  await expect(page.getByText("Une note automatique signale un paiement à vérifier")).toBeVisible();
  const notes = page.getByRole("region", { name: "Notes internes" });
  await expect(notes.getByText("Leenkey, automatique", { exact: false })).toBeVisible();
  await expectNoSeriousViolation(page);

  // Taken in hand, then followed.
  await page.getByRole("button", { name: "Prendre en charge" }).click();
  await expect(feedback(page, "Dossier pris en charge.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Prendre en charge" })).toHaveCount(0);
  await page.getByRole("button", { name: "Suivre ce dossier" }).click();
  await expect(feedback(page, "Vous suivez ce dossier.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ne plus suivre" })).toBeVisible();

  // An empty note is refused; a note is added.
  await page.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(page.getByText("La note doit faire de 1 à 4 000 caractères.")).toBeVisible();
  await expect(notes.getByLabel("Nouvelle note")).toBeFocused();
  await notes.getByLabel("Nouvelle note").fill("Vendeur rappelé : remboursement du doublon prévu.");
  await page.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(feedback(page, "Note ajoutée.")).toBeVisible();
  await expect(notes.getByText("Vendeur rappelé : remboursement du doublon prévu.")).toBeVisible();
  await expect(notes.getByLabel("Nouvelle note")).toHaveValue("");

  // A task of Leenkey of the current step, ticked.
  const tasks = page.getByRole("region", { name: "Tâches de Leenkey" });
  const task = tasks.getByRole("checkbox").first();
  await expect(task).not.toBeChecked();
  await task.check();
  await expect(feedback(page, "Tâche cochée.")).toBeVisible();
  await expect(task).toBeChecked();
  // Read out without taking the focus: the keyboard stays on the list.
  await expect(task).toBeFocused();

  // Every change in the history, by Cédric.
  const history = page.getByRole("region", { name: "Historique" });
  await expect(history.getByText("Statut : Nouveau → En cours par Cédric")).toBeVisible();
  await expect(history.getByText("Suit le dossier par Cédric")).toBeVisible();
  await expect(history.getByText("Note ajoutée par Cédric")).toBeVisible();
  await expect(history.getByText(/^Tâche cochée : .+ par Cédric$/)).toBeVisible();

  // Closed, reopened, closed again: out of the open ones.
  await page.getByRole("button", { name: "Clore le dossier" }).click();
  await expect(feedback(page, "Dossier clos.")).toBeVisible();
  await page.getByRole("button", { name: "Rouvrir le dossier" }).click();
  await expect(feedback(page, "Dossier rouvert.")).toBeVisible();
  await page.getByRole("button", { name: "Clore le dossier" }).click();
  await expect(feedback(page, "Dossier clos.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rouvrir le dossier" })).toBeVisible();

  // The search reads the open cases; the closed ones one click away.
  await page.goto("/admin/dossiers?q=LK-0008");
  await expect(page.getByText("Aucun dossier ouvert ne correspond à « LK-0008 »")).toBeVisible();
  await page.getByRole("link", { name: "Chercher dans les dossiers clos" }).click();
  await expect(page).toHaveURL("/admin/dossiers?statut=clos&q=LK-0008");
  await expect(table.locator("tbody tr").filter({ hasText: "LK-0008" })).toHaveCount(1);
});

test("signalements : la conversation lue et tracée, l'utilisateur averti, le signalement clos", async ({
  page,
}) => {
  await signIn(page, "/admin/signalements");
  const table = page.getByRole("table", { name: "Signalements" });
  const row = table.locator("tbody tr").filter({ hasText: "Messages insistants" });
  await expect(row).toContainText("Alice Martin");
  await expect(row).toContainText("David Moreau");
  await expectNoSeriousViolation(page);
  await row.getByRole("link").click();
  await expect(page).toHaveURL(`/admin/signalements/${REPORT}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Signalement · LK-0001" }),
  ).toBeVisible();

  // The whole conversation; its reading in the history, at once.
  const conversation = page.getByRole("region", { name: "Conversation signalée" });
  await expect(conversation.getByText("votre lecture est enregistrée")).toBeVisible();
  await expect(conversation.getByText(/David Moreau, acquéreur/).first()).toBeVisible();
  const history = page.getByRole("region", { name: "Historique" });
  await expect(history.getByText("Conversation lue par Cédric")).toHaveCount(1);
  // Read twice, written once (one reading per half hour).
  await page.reload();
  await expect(history.getByText("Conversation lue par Cédric")).toHaveCount(1);
  await expectNoSeriousViolation(page);

  // The other party warned, by email; never suspended here.
  await page.getByRole("button", { name: "Avertir David Moreau" }).click();
  const warn = page.getByRole("dialog", { name: "Avertir l'utilisateur" });
  await warn.getByRole("button", { name: "Merci de rester courtois dans vos échanges." }).click();
  await warn.getByRole("button", { name: "Envoyer l'avertissement" }).click();
  await expect(warn).toBeHidden();
  await expect(feedback(page, "Avertissement enregistré.")).toContainText(EMAIL_NOTE);
  await expect(history.getByText("Utilisateur averti par Cédric")).toBeVisible();
  await expect(history.getByText("« Merci de rester courtois dans vos échanges. »")).toBeVisible();
  // A second warning would send a second email: the first one is said.
  await expect(page.getByText("Averti le", { exact: true })).toBeVisible();

  // Closed with what was done.
  await page.getByRole("button", { name: "Clore le signalement" }).click();
  const resolve = page.getByRole("dialog", { name: "Clore le signalement" });
  await resolve.getByRole("button", { name: "Utilisateur averti." }).click();
  await resolve.getByRole("button", { name: "Clore le signalement" }).click();
  await expect(resolve).toBeHidden();
  await expect(feedback(page, "Signalement clos.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clore le signalement" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Avertir David Moreau" })).toHaveCount(0);
  await expect(history.getByText("Signalement clos par Cédric")).toBeVisible();

  // Out of the open ones; the warning in the history of the account.
  await page.goto("/admin/signalements");
  await expect(page.getByText("Aucun signalement ouvert")).toBeVisible();
  await page.getByRole("link", { name: /^Clos/ }).click();
  await expect(table.locator("tbody tr").filter({ hasText: "Messages insistants" })).toHaveCount(1);
  await page.goto("/admin/utilisateurs?q=buyer_d%40test.leenkey.fr");
  await page.getByRole("table", { name: "Comptes" }).getByRole("link").first().click();
  await expect(
    page.getByRole("region", { name: "Historique" }).getByText("Averti après un signalement"),
  ).toBeVisible();
});

test("téléphone : les cartes des dossiers et des signalements, rien de plus large que l'écran", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
    baseURL,
  });
  await context.addCookies([
    { name: "lk_consent", value: consentValue(false), url: baseURL ?? "" },
  ]);
  const page = await context.newPage();
  await signIn(page, "/admin/dossiers?statut=clos");
  await expect(page.getByRole("list", { name: "Dossiers" }).getByRole("link")).not.toHaveCount(0);
  await expect(page.getByRole("table", { name: "Dossiers" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.goto(`/admin/dossiers/${CASE_CHECK}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectNoSeriousViolation(page);
  await page.goto("/admin/signalements?statut=clos");
  await expect(page.getByRole("list", { name: "Signalements" }).getByRole("link")).toHaveCount(1);
  await page.goto(`/admin/signalements/${REPORT}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectNoSeriousViolation(page);
  await context.close();
});
