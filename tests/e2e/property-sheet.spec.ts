import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-14: the page of a property of the seller (SPEC-V2 8.3), read on the
// seed in mobile and in desktop: figures, status, actions, tabs, the
// « Dossier » tab and the empty notifications panel. Nothing is changed here:
// the actions that change the seed are in property-status.spec.ts. Seed
// properties: 1 (LK-0001, published) and 6 (LK-0006, pending) of seller_a,
// 16 (LK-0016, rejected) and 8 (LK-0008) of seller_b.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)");

const property = (n: number) => `5eed1000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sheet = (n: number) => `/vendeur/biens/${property(n)}`;

/** Signs a seed seller in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, account: "seller_a" | "seller_b", path: string) {
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
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

const tabs = (page: Page) => page.getByRole("navigation", { name: "Rubriques de votre bien" });

test("une annonce en ligne : statut, chiffres clés, actions et onglets @a11y", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "seller_a", "/vendeur");
  await page.locator(`a[href="${sheet(1)}"]`).click();
  await expect(page).toHaveURL(sheet(1));
  const main = page.getByRole("main");
  const name = "Appartement 3 pièces avec balcon, proche gare";
  await expect(main.getByRole("heading", { level: 1 })).toHaveText(name);
  // Each tab has its title (streamed by Next.js after a navigation in the app:
  // waited for before axe reads the page).
  await expect(page).toHaveTitle(`${name} · Ma vente · Leenkey`);
  await expect(
    main.getByText("18 rue de la Gare · 91600 Savigny-sur-Orge · Réf. LK-0001"),
  ).toBeVisible();
  await expect(main.getByText("En ligne", { exact: true })).toBeVisible();
  await expect(main.getByText("Votre annonce est en ligne")).toBeVisible();
  // Surface, rooms, floor, price per m² (239 000 € for 68 m²).
  const figures = main.locator("dl").first();
  await expect(figures.locator("dd")).toHaveText(["68 m²", "3", "2e", "3 515 €"]);

  const actions = main.getByRole("group", { name: "Actions sur votre annonce" });
  await expect(actions.getByRole("link", { name: "Voir l'annonce en ligne" })).toHaveAttribute(
    "href",
    /^\/annonce\/.+lk0001$/,
  );
  await expect(actions.getByRole("button", { name: "Mettre en pause" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Marquer comme vendu" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Supprimer le brouillon" })).toHaveCount(0);

  // Infos: the private address, which no longer changes once sent, and the
  // table of the characteristics, which change from their page (L1-14b).
  await expect(tabs(page).getByRole("link", { name: "Infos" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(main.getByText("Votre adresse exacte n'est jamais publiée")).toBeVisible();
  await expect(main.getByText(/^Elle ne change plus une fois l'annonce envoyée/)).toBeVisible();
  await expect(main.getByRole("link", { name: "Modifier l'adresse" })).toHaveCount(0);
  const characteristics = main.getByRole("region", { name: "Caractéristiques" });
  await expect(characteristics).toContainText("Collectif gaz");
  await expect(characteristics).not.toContainText("Travaux votés");
  await expect(main.getByRole("link", { name: "Modifier les caractéristiques" })).toHaveAttribute(
    "href",
    `${sheet(1)}/modifier/caracteristiques`,
  );
  if (isMobile) {
    // The page of a property is the file of the sale: « Dossier » is current.
    await expect(
      page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", {
        name: "Dossier",
      }),
    ).toHaveAttribute("aria-current", "page");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  expect(await seriousViolations(page)).toEqual([]);

  // Photos, then Annonce: the same top, the tab current.
  await tabs(page).getByRole("link", { name: "Photos" }).click();
  await expect(page).toHaveURL(`${sheet(1)}/photos`);
  await expect(page).toHaveTitle(`Photos · ${name} · Ma vente · Leenkey`);
  await expect(tabs(page).getByRole("link", { name: "Photos" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(main.getByRole("heading", { level: 2 })).toHaveText("Photos");
  // The five photos of this apartment in the seed (L1-46b), the façade first;
  // more are added here, the listing online (L1-14b).
  await expect(main.getByText("5 photos sur 15")).toBeAttached();
  // In the order of the seed, the façade first: the cover of the listing.
  await expect(
    main.getByRole("button", { name: "Photo 1 sur 5, Façade de la résidence, photo principale" }),
  ).toBeVisible();
  await expect(main.getByRole("button", { name: "Ajouter des photos" })).toBeVisible();
  await expect(main.getByText(/^Votre annonce reste en ligne/)).toBeVisible();
  await tabs(page).getByRole("link", { name: "Annonce" }).click();
  await expect(page).toHaveURL(`${sheet(1)}/annonce`);
  await expect(page).toHaveTitle(`Annonce · ${name} · Ma vente · Leenkey`);
  const listing = main.getByRole("region", { name: "Annonce" });
  await expect(listing).toContainText("239 000 €");
  await expect(listing).toContainText("soit 3 515 € le m²");
  await expect(listing).toContainText("LK-0001");
  await expect(listing.getByRole("link", { name: "Modifier l'annonce" })).toHaveAttribute(
    "href",
    `${sheet(1)}/modifier/annonce`,
  );
  expect(await seriousViolations(page)).toEqual([]);
});

test("en relecture : ce que fait Leenkey, sans action", async ({ page }) => {
  await signIn(page, "seller_a", sheet(6));
  const main = page.getByRole("main");
  await expect(main.getByText("Nous relisons votre annonce")).toBeVisible();
  await expect(main.getByText("En attente de validation", { exact: true })).toBeVisible();
  await expect(main.getByRole("group", { name: "Actions sur votre annonce" })).toHaveCount(0);
});

test("à corriger : la remarque de Leenkey et « Corriger mon annonce »", async ({ page }) => {
  await signIn(page, "seller_b", sheet(16));
  const main = page.getByRole("main");
  await expect(main.getByText("Votre annonce est à corriger")).toBeVisible();
  await expect(main.getByText(/^Notre remarque : /)).toBeVisible();
  await expect(main.getByRole("link", { name: "Corriger mon annonce" })).toHaveAttribute(
    "href",
    `${sheet(16)}/apercu`,
  );
  // The steps of the creation change it again.
  await expect(main.getByRole("link", { name: "Modifier les caractéristiques" })).toHaveAttribute(
    "href",
    `${sheet(16)}/caracteristiques`,
  );
});

test("le bien d'un autre vendeur ou une adresse inconnue : 404", async ({ page }) => {
  await signIn(page, "seller_a", "/vendeur");
  expect((await page.goto(sheet(8)))?.status()).toBe(404);
  expect((await page.goto(`${sheet(8)}/annonce`))?.status()).toBe(404);
  expect((await page.goto("/vendeur/biens/pas-un-id"))?.status()).toBe(404);
});

test("« Dossier » mène aux biens du vendeur", async ({ page }) => {
  await signIn(page, "seller_a", "/vendeur/dossier");
  // Several properties: the list, each one to its page. « Compléter mon
  // annonce » of the empty panel leads here too: tests/e2e/design.spec.ts
  // (the accounts of the seed have notifications since L1-22).
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dossier de vente");
  await expect(page.locator(`a[href="${sheet(1)}"]`)).toBeVisible();
});
