import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-25: the buyer home and the buying project (SPEC-V2 8.9, docs/DESIGN.md
// 12.10), read on the seed in mobile and in desktop; nothing is saved. Seed:
// buyer_c (Chloé) has declared a project (budget 380 000 €, down payment
// 60 000 €, loan 320 000 €), three favourites online and a conversation with
// Alice (seller_a) about LK-0001. A seller sees the status, never the
// amounts (criterion of L1-25). buyer_d is left to auth-journey.spec.ts
// (terms gate) and to buyer-profile-live.spec.ts (seed-mutations).

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)");

const CHLOE_WITH_ALICE = "/messages/5eed2000-0000-4000-8000-000000000011";
const LK0001 = "/vendeur?bien=5eed1000-0000-4000-8000-000000000001";
/** The amounts of Chloé, whatever the spaces between the digits. */
const AMOUNTS = /\b(380|60|320)\s?(000\b|k)/;
const STORED_KEY = "lk:search:last";

/** Signs a seed account in and lands on `path` (terms gate as in navigation.spec.ts). */
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
      .catch(() => {
        // Accepted by a parallel test in between: the page itself opens now.
      });
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
  await expect(page).toHaveURL(path);
}

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

const lastSearch = (page: Page) => page.locator("section[aria-labelledby='derniere-recherche']");

test("accueil acquéreur : bandeau, recherche, favoris, conversations, dossier complet @a11y", async ({
  page,
}) => {
  await signIn(page, "buyer_c", "/acquereur");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour Chloé");
  await expect(
    page.getByText("Des biens vendus directement par leurs propriétaires. Sans frais d'agence."),
  ).toBeVisible();

  // No search kept by this browser: the way to the listings.
  const card = lastSearch(page);
  await expect(
    card.getByRole("heading", { name: "Trouvez le bien qui vous ressemble" }),
  ).toBeVisible();
  await expect(card.getByRole("link", { name: "Voir les biens" })).toHaveAttribute(
    "href",
    "/acheter",
  );

  // Three favourites online (the fourth is no longer published).
  const favourites = page.getByRole("region", { name: "Vos favoris" });
  await expect(favourites.getByRole("listitem")).toHaveCount(3);
  await expect(favourites.getByRole("link", { name: "Voir les 3 favoris" })).toHaveAttribute(
    "href",
    "/acquereur/favoris",
  );

  // Her conversation with Alice, without any financing status: she is the buyer.
  const conversations = page.getByRole("region", { name: "Vos conversations" });
  await expect(conversations.getByRole("link", { name: /^Alice/ })).toHaveAttribute(
    "href",
    CHLOE_WITH_ALICE,
  );
  await expect(conversations.getByText("Informations déclarées")).toHaveCount(0);

  await expect(
    page
      .getByRole("region", { name: "Nos services" })
      .getByRole("link", { name: "Valoriser mon bien" }),
  ).toHaveAttribute("href", "/estimer");

  // Her file is complete: after the rest, to edit it.
  const file = page.getByRole("region", {
    name: "Votre dossier fait la différence auprès des vendeurs",
  });
  await expect(
    file.getByRole("heading", { name: "Votre dossier acquéreur : 2 étapes sur 2 faites" }),
  ).toBeVisible();
  await expect(file.getByText("Informations déclarées")).toBeVisible();
  await expect(file.getByRole("link", { name: "Modifier mon projet" })).toHaveAttribute(
    "href",
    "/acquereur/profil",
  );
  const order = await page
    .locator("main section[aria-labelledby]")
    .evaluateAll((sections) => sections.map((section) => section.getAttribute("aria-labelledby")));
  expect(order.indexOf("dossier")).toBeGreaterThan(order.indexOf("services"));

  expect(await seriousViolations(page)).toEqual([]);
});

test("accueil acquéreur : reprendre la dernière recherche, avec ses nouveaux biens", async ({
  page,
}) => {
  await signIn(page, "buyer_c", "/acquereur");
  // A search seen long ago: all its listings are new since.
  await page.evaluate(
    ([key]) =>
      window.localStorage.setItem(
        key,
        JSON.stringify({ href: "/acheter?type=maison", at: "2020-01-01T00:00:00.000Z" }),
      ),
    [STORED_KEY],
  );
  await page.reload();
  const card = lastSearch(page);
  await expect(
    card.getByRole("heading", { name: "Reprendre votre dernière recherche ?" }),
  ).toBeVisible();
  await expect(card.getByText("Maisons", { exact: true })).toBeVisible();
  await expect(card.getByText(/^\d+ nouveaux? biens?( et plus)?$/)).toBeVisible();
  await expect(card.getByRole("link", { name: "Nouvelle recherche" })).toHaveAttribute(
    "href",
    "/acheter",
  );
  await card.getByRole("link", { name: "Reprendre" }).click();
  await expect(page).toHaveURL("/acheter?type=maison");
  // Seen now (kept by the search once its page is shown): no new listing since.
  await expect
    .poll(() => page.evaluate(([key]) => window.localStorage.getItem(key) ?? "", [STORED_KEY]))
    .not.toContain("2020-01-01");
  await page.goto("/acquereur");
  await expect(
    card.getByRole("heading", { name: "Reprendre votre dernière recherche ?" }),
  ).toBeVisible();
  await expect(card.getByText(/nouveaux? biens?/)).toHaveCount(0);

  // Anything but a search of /acheter is ignored.
  await page.evaluate(
    ([key]) =>
      window.localStorage.setItem(
        key,
        JSON.stringify({ href: "https://exemple.fr/acheter?x", at: "x" }),
      ),
    [STORED_KEY],
  );
  await page.reload();
  await expect(
    card.getByRole("heading", { name: "Trouvez le bien qui vous ressemble" }),
  ).toBeVisible();
});

test("mon projet d'achat : statut, encart, valeurs déclarées @a11y", async ({ page }) => {
  await signIn(page, "buyer_c", "/acquereur/profil");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mon projet d'achat");
  await expect(page.getByRole("link", { name: "Espace acquéreur", exact: true })).toHaveAttribute(
    "href",
    "/acquereur",
  );
  await expect(page.getByRole("status").getByText("Informations déclarées")).toBeVisible();
  await expect(
    page.getByText(/Il ne voit ni votre justificatif ni les montants de votre profil/),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "Résidence principale" })).toBeChecked();
  await expect(page.getByLabel("Villes recherchées")).toHaveValue(
    "Savigny-sur-Orge, Épinay-sur-Orge, Morsang-sur-Orge",
  );
  await expect(page.getByLabel("Budget maximum")).toHaveValue(/^380\s000$/);
  await expect(page.getByLabel("Apport personnel")).toHaveValue(/^60\s000$/);
  await expect(page.getByRole("radio", { name: "Avec prêt" })).toBeChecked();
  await expect(page.getByLabel("Montant du prêt")).toHaveValue(/^320\s000$/);
  await expect(page.getByLabel("Votre situation")).toHaveValue(
    "Couple, un enfant, CDI tous les deux.",
  );

  // « Sans prêt »: no loan amount to fill.
  await page.getByRole("radio", { name: "Sans prêt" }).click();
  await expect(page.getByLabel("Montant du prêt")).toHaveCount(0);

  expect(await seriousViolations(page)).toEqual([]);
});

test("le vendeur voit le statut de financement, jamais les montants", async ({ page }) => {
  await signIn(page, "seller_a", LK0001);
  const conversations = page.getByRole("region", { name: "Conversations" });
  const chloe = conversations.getByRole("link", { name: /^Chloé/ });
  await expect(chloe).toContainText("Informations déclarées");
  // David has declared nothing.
  await expect(conversations.getByRole("link", { name: /^David/ })).toContainText(
    "Financement non renseigné",
  );
  await expect(
    conversations.getByText(/Leenkey ne garantit ni l'obtention du financement/),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(AMOUNTS);

  await page.goto(CHLOE_WITH_ALICE);
  await expect(page.getByText("Avec Chloé · Informations déclarées")).toBeVisible();
  await expect(page.getByText(/Leenkey ne garantit ni l'obtention du financement/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(AMOUNTS);

  // The project of a buyer is never a page of the seller.
  await page.goto("/acquereur/profil");
  await expect(page.getByLabel("Budget maximum")).toHaveValue("");
});
