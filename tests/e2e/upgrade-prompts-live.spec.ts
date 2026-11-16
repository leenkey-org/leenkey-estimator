import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L2-09: the upgrade prompts (SPEC-V2 section 11 bis). seller_b, under
// Autonomie: LK-0009 online for 30 days without a contact reads « Faire le
// point sur votre prix » on its dashboard, after the useful content, and
// hides it for good; LK-0016, to correct, reads « Faire relire votre
// annonce » before « Envoyer en validation », which stays there, and opens
// the plans. The team reads the measure on its dashboard. The prompts of an
// offer: tests/e2e/offer-live.spec.ts (Autonomie) and
// tests/e2e/admin-offers-live.spec.ts (Sérénité: none); the one of a
// valuation: tests/e2e/property-from-estimation.spec.ts. What is hidden
// stays hidden: this spec changes the seed for good (project
// « seed-mutations »). Needs E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1 and a
// local stack.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec masque des propositions",
);

// The measure of the team reads what the seller did: one after the other.
test.describe.configure({ mode: "serial" });

const LK0009 = "5eed1000-0000-4000-8000-000000000009";
const LK0016 = "5eed1000-0000-4000-8000-000000000016";

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

/** Signs a seed account in, accepts the terms when asked, and lands on `path`. */
async function signIn(page: Page, account: "seller_b" | "admin", path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  await page.goto("/compte");
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page
      .waitForURL((url) => url.pathname !== "/conditions", { timeout: 5_000 })
      .catch(() => {
        // Accepted by a parallel test in between: the page itself opens now.
      });
  }
  await page.goto(path);
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

test("le tableau de bord : une proposition après le contenu utile, masquée pour de bon", async ({
  page,
}) => {
  await signIn(page, "seller_b", `/vendeur?bien=${LK0009}`);
  const proposal = page.getByRole("region", { name: "Faire le point sur votre prix" });
  await expect(proposal).toContainText(
    "Votre annonce génère peu de demandes. Faites le point sur votre prix et votre stratégie avec un conseiller Leenkey.",
  );
  await expect(proposal.getByRole("link", { name: "Voir l'accompagnement" })).toHaveAttribute(
    "href",
    `/vendeur/formule?bien=${LK0009}&formule=accompagne`,
  );
  // Never a dialog, and after the conversations of the sale.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const conversations = page.getByRole("region", { name: "Conversations" });
  expect(
    await conversations.evaluate(
      (element, other) =>
        other !== null &&
        (element.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      await proposal.elementHandle(),
    ),
  ).toBe(true);
  // At most one prompt on the page.
  await expect(page.getByRole("button", { name: "Masquer cette proposition" })).toHaveCount(1);
  await expectNoSeriousViolation(page);
  await shots(page, "dashboard-upgrade-prompt");
  // Never wider than a phone.
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 900 });

  await proposal.getByRole("button", { name: "Masquer cette proposition" }).click();
  await expect(proposal).toHaveCount(0);
  // Read again: hidden for good on this property.
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("region", { name: "Conversations" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Faire le point sur votre prix" })).toHaveCount(
      0,
      { timeout: 1_000 },
    );
  }).toPass({ timeout: 15_000 });
});

test("avant « Envoyer en validation » : la proposition ne prend jamais la place du bouton", async ({
  page,
}) => {
  await signIn(page, "seller_b", `/vendeur/biens/${LK0016}/apercu`);
  const proposal = page.getByRole("region", { name: "Faire relire votre annonce" });
  await expect(proposal).toContainText(
    "Votre annonce est prête. Vous souhaitez faire vérifier votre prix, votre présentation et votre annonce par un conseiller Leenkey ?",
  );
  const submit = page.getByRole("button", { name: "Envoyer en validation" });
  await expect(submit).toBeVisible();
  await expect(submit).toBeEnabled();
  await expectNoSeriousViolation(page);
  await shots(page, "preview-upgrade-prompt");

  // Opened: the plans, the plan aimed at chosen.
  await proposal.getByRole("link", { name: "Voir l'accompagnement" }).click();
  await page.waitForURL(
    (address) =>
      address.pathname === "/vendeur/formule" &&
      address.searchParams.get("bien") === LK0016 &&
      address.searchParams.get("formule") === "accompagne",
  );
  // Opened is not hidden: back on the preview, it is still there.
  await page.goto(`/vendeur/biens/${LK0016}/apercu`);
  await expect(page.getByRole("region", { name: "Faire relire votre annonce" })).toBeVisible();
});

test("le back office lit la mesure : affichées, ouvertes, masquées", async ({ page }) => {
  await signIn(page, "admin", "/admin");
  const measure = page.getByRole("region", { name: "Propositions de formule" });
  await expect(measure).toContainText("30 derniers jours");
  const low = measure.getByRole("listitem").filter({ hasText: "Peu de contacts" });
  const ready = measure.getByRole("listitem").filter({ hasText: "Annonce prête" });
  const figure = (line: typeof low, label: string) =>
    line.locator("dl > div").filter({ hasText: label }).locator("dd");
  await expect(async () => {
    await page.reload();
    expect(Number(await figure(low, "Masquées").innerText())).toBeGreaterThanOrEqual(1);
    expect(Number(await figure(ready, "Ouvertes").innerText())).toBeGreaterThanOrEqual(1);
  }).toPass({ timeout: 15_000 });
  await expectNoSeriousViolation(page);
  await shots(page, "admin-upgrade-measure");
});
