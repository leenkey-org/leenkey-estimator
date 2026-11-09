import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-34: the conversation with the Leenkey adviser (SPEC-V2 8.6, 8.7, 17) on
// the seed, read only: pinned first in the messaging of seller_a, its card on
// the dashboard of a paid plan, the invitation of Autonomie, the shared inbox
// of the team. Nothing is opened (opening reads it): the exchange itself is in
// advisor-live.spec.ts (project « seed-mutations »). Seed: LK-0001
// (Accompagné) and LK-0003 (Autonomie) of seller_a, their welcome unread.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)");

const LK0001 = "5eed1000-0000-4000-8000-000000000001";
const LK0003 = "5eed1000-0000-4000-8000-000000000003";
const ADVISOR_LK0001 = "5eed2000-0000-4000-8000-000000000001";
const NBSP = /\u00A0/g;

/** Signs a seed account in and lands on `path` (terms gate as in navigation.spec.ts). */
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
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test("« Mon conseiller Leenkey » épinglé en tête des conversations de son bien @a11y", async ({
  page,
}) => {
  await signIn(page, "seller_a", "/messages");
  const advisor = page.getByRole("link", { name: /Mon conseiller Leenkey/ });
  // The list of its property: the adviser first.
  const lines = page.getByRole("list").filter({ has: advisor }).getByRole("link");
  await expect(lines.first()).toHaveAttribute("href", `/messages/${ADVISOR_LK0001}`);
  await expect(lines.first()).toContainText("Mon conseiller Leenkey");
  await expect(lines.first()).toContainText("LK");
  await expect(lines.first().getByText("Non lu")).toBeAttached();
  // The buyers of the property after it.
  await expect(lines.nth(1)).not.toContainText("Mon conseiller Leenkey");
  await expectNoSeriousViolation(page);
});

test("le tableau de bord : le message du conseiller d'abord, sa carte ; l'invitation en Autonomie", async ({
  page,
}) => {
  await signIn(page, "seller_a", `/vendeur?bien=${LK0001}`);
  // Rule 3 of the next action (SPEC 8.7): the welcome is not read yet.
  const next = page.getByRole("region", { name: "Prochaine action" });
  await expect(next).toContainText("Votre conseiller Leenkey vous a écrit");
  await expect(next.getByRole("link", { name: "Lire le message" })).toHaveAttribute(
    "href",
    `/messages/${ADVISOR_LK0001}`,
  );
  const card = page.getByRole("region", { name: "Mon conseiller Leenkey" });
  await expect(card).toContainText("Bonjour, je suis votre conseiller Leenkey");
  await expect(card.getByRole("link", { name: "Écrire à mon conseiller" })).toHaveAttribute(
    "href",
    `/messages/${ADVISOR_LK0001}`,
  );
  await expectNoSeriousViolation(page);

  await page.goto(`/vendeur?bien=${LK0003}`);
  const invite = page.getByRole("region", { name: "Échanger avec un conseiller Leenkey" });
  await expect(invite).toContainText("répond sous 24".replace(NBSP, " "));
  await expect(invite.getByRole("link", { name: "Voir les formules" })).toHaveAttribute(
    "href",
    `/vendeur/formule?bien=${LK0003}`,
  );
  await expect(page.getByRole("region", { name: "Mon conseiller Leenkey" })).toHaveCount(0);
});

test("la boîte partagée de l'équipe : les conversations, le filtre par formule @a11y", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "admin", "/admin/messages");
  await expect(page.getByRole("heading", { level: 1, name: "Messages clients" })).toBeAttached();
  const list = page.getByRole("list", { name: "Conversations avec les vendeurs" });
  await expect(list.getByRole("link")).toHaveCount(2);
  await expect(list.getByRole("link", { name: /LK-0001/ })).toHaveAttribute(
    "href",
    `/admin/messages/${ADVISOR_LK0001}`,
  );
  // The welcome is the team's own message: nothing to read, nothing late.
  await expect(list.getByText("Non lu")).toHaveCount(0);
  await expect(list.getByText(/En attente depuis/)).toHaveCount(0);
  await expectNoSeriousViolation(page);

  const filters = page.getByRole("navigation", { name: "Formule des biens" });
  await filters.getByRole("link", { name: /Sérénité/ }).click();
  await expect(page).toHaveURL("/admin/messages?formule=serenite");
  await expect(list.getByRole("link")).toHaveCount(1);
  await expect(list.getByRole("link")).toContainText("LK-0008");
  if (!isMobile) {
    await expect(
      page
        .getByRole("navigation", { name: "Navigation du back office" })
        .getByRole("link", { name: /Messages/ }),
    ).toHaveAttribute("href", "/admin/messages");
  }
});
