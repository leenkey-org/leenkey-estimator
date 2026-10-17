import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-10: navigation shells (docs/DESIGN.md 10.6 to 10.8). Two modes, like
// search.spec.ts:
// - without a database (CI): what a signed-out visitor sees on /acheter at
//   390 and 1280 px, and the signed-in areas sending to the login page;
// - E2E_SEED=1 with SEED_PASSWORD (local stack or preprod): the seed accounts
//   signed in, seller, buyer and admin, the bell, the account menu and the
//   pages that wait for their screen.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const SEED_REQUIRED = "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)";

const MAIN_NAV = "Navigation principale";
const ADMIN_NAV = "Navigation du back office";

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

/** The navigation shown at this width (the other one is display: none). */
const mainNav = (page: Page) => page.getByRole("navigation", { name: MAIN_NAV });

/** SiteFooter (L1-36): legal links and « Gérer mes cookies » under every V2 page. */
async function expectFooter(page: Page) {
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Mentions légales" })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Gérer mes cookies" })).toBeVisible();
}

/**
 * At 768 px, the narrowest TopNav (DESIGN.md 10.6, criterion of L1-10): the
 * links end before the buttons on the right, nothing leaves the screen.
 */
async function expectTopNavFitsAt768(page: Page) {
  await page.setViewportSize({ width: 768, height: 900 });
  // Measured with Archivo and its width axis, not with the fallback font.
  await page.evaluate(() => document.fonts.ready);
  const lastLink = await mainNav(page).getByRole("link").last().boundingBox();
  const cta = await page.getByRole("link", { name: "Vendre mon bien" }).boundingBox();
  expect(lastLink && cta && lastLink.x + lastLink.width).toBeLessThanOrEqual(cta?.x ?? 0);
  const right = await page
    .getByRole("banner")
    .evaluate((header) =>
      Math.max(
        ...[...header.querySelectorAll("a, button")].map((el) => el.getBoundingClientRect().right),
      ),
    );
  expect(right).toBeLessThanOrEqual(768);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
}

/** The four tabs of the BottomNav, in order. */
async function expectTabs(page: Page, labels: string[], current: string | null) {
  const nav = mainNav(page);
  await expect(nav.getByRole("link")).toHaveText(labels);
  for (const label of labels) {
    const link = nav.getByRole("link", { name: label, exact: true });
    if (label === current) await expect(link).toHaveAttribute("aria-current", "page");
    else await expect(link).not.toHaveAttribute("aria-current", /.+/);
  }
}

test.describe("visiteur sans session", () => {
  test("/acheter en mobile : onglets de l'acquéreur, pas de barre haute", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "navigation basse sous 768 px");
    const response = await page.goto("/acheter");
    expect(response?.status()).toBe(200);
    await expectTabs(page, ["Chercher", "Favoris", "Messages", "Compte"], "Chercher");
    await expect(mainNav(page).getByRole("link", { name: "Favoris" })).toHaveAttribute(
      "href",
      "/acquereur/favoris",
    );
    // TopNav, its call to action and « Mon compte » are not displayed.
    await expect(page.getByRole("link", { name: "Valoriser mon bien" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Vendre mon bien" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Mon compte" })).toBeHidden();
    // The bar sits at the bottom of the screen and hides nothing of the page.
    const bar = await mainNav(page).boundingBox();
    expect(bar && Math.round(bar.y + bar.height)).toBe(page.viewportSize()?.height);
    // « instant »: the V1 styles scroll smoothly.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    const barAfterScroll = await mainNav(page).boundingBox();
    // The footer comes last: nothing of it either goes under the bar.
    await expectFooter(page);
    const footer = await page.getByRole("contentinfo").boundingBox();
    expect(footer && barAfterScroll && footer.y + footer.height).toBeLessThanOrEqual(
      (barAfterScroll?.y ?? 0) + 1,
    );
  });

  test("/acheter en desktop : barre haute, « Mon compte » et pas de cloche", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "navigation haute à partir de 768 px");
    await page.goto("/acheter?ville=savigny-sur-orge&rayon=5");
    const nav = mainNav(page);
    await expect(nav.getByRole("link")).toHaveText(["Acheter", "Vendre", "Valoriser mon bien"]);
    await expect(nav.getByRole("link", { name: "Acheter" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Vendre" })).toHaveAttribute("href", "/");
    await expect(nav.getByRole("link", { name: "Valoriser mon bien" })).toHaveAttribute(
      "href",
      "/estimer",
    );
    await expect(page.getByRole("link", { name: "Leenkey", exact: true })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(page.getByRole("link", { name: "Vendre mon bien" })).toHaveAttribute(
      "href",
      "/inscription?role=seller",
    );
    // Back to the same search, filters included, after signing in.
    const account = page.getByRole("link", { name: "Mon compte" });
    await expect(account).toHaveAttribute(
      "href",
      "/connexion?next=%2Facheter%3Fville%3Dsavigny-sur-orge%26rayon%3D5",
    );
    await expect(page.getByRole("button", { name: /^Notifications/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Menu du compte" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Chercher" })).toBeHidden();
    // 72 px, white, from the top.
    const bar = await page.getByRole("banner").boundingBox();
    expect(bar?.height).toBe(72);
    await expectFooter(page);
    await account.click();
    await expect(page).toHaveURL(/\/connexion\?next=%2Facheter%3Fville%3Dsavigny-sur-orge/);
  });

  test("/acheter à 768 px : la barre haute tient sans chevauchement", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "barre haute à partir de 768 px");
    await page.goto("/acheter");
    await expectTopNavFitsAt768(page);
  });

  test("un onglet d'espace connecté mène à la connexion, qui y ramènera", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "onglets sous 768 px");
    for (const [tab, path] of [
      ["Favoris", "/acquereur/favoris"],
      ["Messages", "/messages"],
      ["Compte", "/compte"],
    ] as const) {
      await page.goto("/acheter");
      await mainNav(page).getByRole("link", { name: tab }).click();
      await expect(page, tab).toHaveURL(`/connexion?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole("heading", { level: 1, name: "Connectez-vous" })).toBeVisible();
    }
  });

  test("les pages d'attente et le back office demandent une session", async ({ page }) => {
    for (const path of [
      "/vendeur/dossier",
      "/acquereur/favoris",
      "/messages",
      "/compte",
      "/admin/annonces",
      "/admin/assistant",
    ]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(`/connexion?next=${encodeURIComponent(path)}`);
    }
  });

  test("/acheter : aucune violation sérieuse ou critique avec la navigation @a11y", async ({
    page,
  }) => {
    await page.goto("/acheter");
    await expect(mainNav(page)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("annonce en CI : la page d'erreur reste sans navigation basse", async ({ page }) => {
    test.skip(seeded, "annonce lue dans la base de seed (voir plus bas)");
    const response = await page.goto("/annonce/appartement-3-pieces-savigny-sur-orge-lk0001");
    expect(response?.status()).toBe(500);
    await expect(page.getByRole("heading", { name: "Ça n'a pas fonctionné." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Chercher" })).toHaveCount(0);
  });
});

test.describe("page annonce (base de seed)", () => {
  test.skip(!seeded, "base de seed requise (E2E_SEED=1)");

  test("barre haute en desktop ; en mobile, la galerie et la barre d'action seules", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/acheter");
    const href = await page
      .getByRole("list", { name: "Résultats" })
      .locator("a:visible")
      .first()
      .getAttribute("href");
    expect(href).toMatch(/^\/annonce\//);
    await page.goto(href ?? "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // No bottom tabs on a listing, at any width.
    await expect(page.getByRole("link", { name: "Chercher" })).toHaveCount(0);
    await expectFooter(page);
    if (isMobile) {
      await expect(page.getByRole("banner")).toBeHidden();
      const contact = page.getByRole("link", { name: "Contacter le vendeur" });
      await expect(contact).toBeVisible();
      // At the bottom of the page, the fixed action bar hides nothing of the
      // footer, down to its last line.
      await page.evaluate(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
      );
      const lastLine = await page
        .getByRole("contentinfo")
        .getByText("© 2026 Leenkey")
        .boundingBox();
      const bar = await contact.locator("xpath=..").boundingBox();
      expect(lastLine && bar && lastLine.y + lastLine.height).toBeLessThanOrEqual(
        (bar?.y ?? 0) - 1,
      );
    } else {
      // « Acheter » stays current on a listing (AnnonceDesktop).
      await expect(mainNav(page).getByRole("link", { name: "Acheter" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByRole("link", { name: "Mon compte" })).toHaveAttribute(
        "href",
        `/connexion?next=${encodeURIComponent(href ?? "")}`,
      );
    }
  });
});

// --- Signed in (seed accounts) ----------------------------------------------

type Account = "seller_a" | "buyer_c" | "admin";

/**
 * Signs in a seed account and lands on `path`. On the first sign-in, the seed
 * accounts accept the terms (/conditions, L1-09); two tests may do it at the
 * same time, the second one then simply goes on to the page.
 */
async function signIn(page: Page, account: Account, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Signed in once the login page is left. The terms gate redirects on the
  // client right after, through `path`: a full load answers it at once.
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

test.describe("comptes connectés (base de seed)", () => {
  test.skip(!seeded || !SEED_PASSWORD, SEED_REQUIRED);

  test("vendeur : onglets « Ma vente » et cloche en mobile, barre haute en desktop", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "seller_a", "/vendeur");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour Alice");
    await expectFooter(page);
    const bell = page.getByRole("button", { name: "Notifications", exact: true });
    // One bell at each width: next to the title in mobile, in the TopNav after.
    await expect(bell).toHaveCount(1);
    await expect(bell).toBeVisible();
    if (isMobile) {
      await expectTabs(page, ["Ma vente", "Dossier", "Messages", "Compte"], "Ma vente");
      await expect(page.getByRole("button", { name: "Menu du compte" })).toBeHidden();
      await mainNav(page).getByRole("link", { name: "Dossier" }).click();
      await expect(page).toHaveURL("/vendeur/dossier");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dossier de vente");
      await expectTabs(page, ["Ma vente", "Dossier", "Messages", "Compte"], "Dossier");
      // The bell is on every page of the area, not only on its home (Q26).
      await expect(bell).toBeVisible();
    } else {
      await expect(mainNav(page).getByRole("link")).toHaveText([
        "Acheter",
        "Vendre",
        "Valoriser mon bien",
      ]);
      await expect(page.getByRole("link", { name: "Vendre mon bien" })).toHaveAttribute(
        "href",
        "/vendeur",
      );
      await expect(page.getByRole("link", { name: "Favoris" })).toHaveAttribute(
        "href",
        "/acquereur/favoris",
      );
      await expect(page.getByRole("button", { name: "Menu du compte" })).toHaveText("A");
      await expect(page.getByRole("link", { name: "Ma vente" })).toBeHidden();
      await expect(page.getByRole("link", { name: "Mon compte" })).toHaveCount(0);
    }
    expect(await seriousViolations(page)).toEqual([]);
    // Signed in, the TopNav is at its widest: bell, favourites and avatar.
    if (!isMobile) await expectTopNavFitsAt768(page);
  });

  test("une page commune garde l'espace d'où l'on vient, recherche comprise", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "onglets sous 768 px");
    // seller_a only sells: on /messages opened first, the seller tabs.
    await signIn(page, "seller_a", "/acheter");
    await expectTabs(page, ["Chercher", "Favoris", "Messages", "Compte"], "Chercher");
    await mainNav(page).getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL("/messages");
    await expectTabs(page, ["Chercher", "Favoris", "Messages", "Compte"], "Messages");
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Notifications" })).toContainText(
      "des réponses des vendeurs",
    );
  });

  test("acquéreur : onglets de l'acquéreur", async ({ page, isMobile }) => {
    await signIn(page, "buyer_c", "/acquereur");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour Chloé");
    await expectFooter(page);
    if (isMobile) {
      // The buyer home is not one of the tabs (DESIGN.md 10.6).
      await expectTabs(page, ["Chercher", "Favoris", "Messages", "Compte"], null);
      await mainNav(page).getByRole("link", { name: "Favoris" }).click();
      await expect(page).toHaveURL("/acquereur/favoris");
      await expectTabs(page, ["Chercher", "Favoris", "Messages", "Compte"], "Favoris");
      // The buyer home is not a tab: the bell is on this page too (Q26).
      await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
      // On the search too, the buyer keeps the same tabs.
      await mainNav(page).getByRole("link", { name: "Chercher" }).click();
      await expect(page).toHaveURL("/acheter");
      await expectTabs(page, ["Chercher", "Favoris", "Messages", "Compte"], "Chercher");
    } else {
      await page.getByRole("link", { name: "Favoris" }).click();
      await expect(page).toHaveURL("/acquereur/favoris");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Favoris");
      // The seed saves three published listings for buyer_c (L1-18).
      await expect(page.getByRole("list", { name: "Biens sauvegardés" })).toBeVisible();
    }
  });

  test("admin : barre latérale en desktop, en-tête et onglets en mobile", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "admin", "/admin");
    const nav = page.getByRole("navigation", { name: ADMIN_NAV });
    await expectFooter(page);
    if (isMobile) {
      await expect(page.getByRole("banner")).toContainText("Back office");
      await expect(page.getByRole("banner")).toContainText("Tableau de bord");
      await expect(nav.getByRole("link")).toHaveText([
        "Annonces",
        "Dossiers",
        "Utilisateurs",
        "Assistant",
      ]);
      await nav.getByRole("link", { name: "Annonces" }).click();
      await expect(page).toHaveURL("/admin/annonces");
      await expect(nav.getByRole("link", { name: "Annonces" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      // The header shows the title; the H1 stays for screen readers.
      await expect(page.getByRole("banner")).toContainText("Annonces");
      await expect(page.getByRole("heading", { level: 1, name: "Annonces" })).toBeAttached();
    } else {
      await expect(nav.getByRole("link")).toHaveText([
        "Tableau de bord",
        "Annonces",
        "Utilisateurs",
        "Dossiers",
        "Offres",
        "Signalements",
        "Assistant",
      ]);
      await expect(nav.getByRole("link", { name: "Tableau de bord" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await nav.getByRole("link", { name: "Signalements" }).click();
      await expect(page).toHaveURL("/admin/signalements");
      await expect(nav.getByRole("link", { name: "Signalements" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(nav.getByRole("link", { name: "Tableau de bord" })).not.toHaveAttribute(
        "aria-current",
        /.+/,
      );
      await expect(page.getByRole("heading", { level: 1, name: "Signalements" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Cédric/ })).toBeVisible();
      // No buyer or seller tabs in the back office.
      await expect(page.getByRole("navigation", { name: MAIN_NAV })).toHaveCount(0);
    }
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("l'espace suit la page sans rechargement : la phrase de la cloche change", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "cloche et favoris de la barre haute à partir de 768 px");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, "seller_a", "/vendeur");
    const bell = page.getByRole("button", { name: "Notifications", exact: true });
    const panel = page.getByRole("dialog", { name: "Notifications" });
    // Kept by a client navigation, lost by a full load.
    await page.evaluate(() => Object.assign(window, { lkSameDocument: true }));
    await page.getByRole("link", { name: "Favoris" }).click();
    await expect(page).toHaveURL("/acquereur/favoris");
    await bell.click();
    await expect(panel).toContainText("des réponses des vendeurs");
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Vendre mon bien" }).click();
    await expect(page).toHaveURL("/vendeur");
    await bell.click();
    await expect(panel).toContainText("des offres reçus pour votre bien");
    expect(await page.evaluate(() => "lkSameDocument" in window)).toBe(true);
  });

  test("la cloche ouvre le panneau vide, Échap le referme", async ({ page }) => {
    // No 220 ms entrance (DESIGN.md 2.2): axe measures the panel in place.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, "seller_a", "/vendeur");
    const bell = page.getByRole("button", { name: "Notifications", exact: true });
    await bell.click();
    const panel = page.getByRole("dialog", { name: "Notifications" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Aucune notification" })).toBeVisible();
    await expect(panel).toContainText("des messages, des visites et des offres");
    await expect(panel.getByRole("link", { name: "Réglages des notifications" })).toHaveAttribute(
      "href",
      "/compte",
    );
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(bell).toBeFocused();
    // The close button and the settings link close it too.
    await bell.click();
    await panel.getByRole("button", { name: "Fermer les notifications" }).click();
    await expect(panel).toBeHidden();
    await bell.click();
    await panel.getByRole("link", { name: "Réglages des notifications" }).click();
    await expect(page).toHaveURL("/compte");
    await expect(panel).toBeHidden();
  });

  test("le menu du compte se pilote au clavier et déconnecte", async ({ page, isMobile }) => {
    // In mobile, the account menu is the one of the back office header.
    const [account, home] = isMobile
      ? (["admin", "/admin"] as const)
      : (["seller_a", "/vendeur"] as const);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, account, home);
    const trigger = page.getByRole("button", { name: "Menu du compte" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Mon espace",
      "Mon compte",
      "Se déconnecter",
    ]);
    await expect(menu.getByRole("menuitem", { name: "Mon espace" })).toHaveAttribute("href", home);
    await expect(menu.getByRole("menuitem", { name: "Mon compte" })).toHaveAttribute(
      "href",
      "/compte",
    );
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await menu.getByRole("menuitem", { name: "Se déconnecter" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto(home);
    await expect(page).toHaveURL(`/connexion?next=${encodeURIComponent(home)}`);
  });

  test("pages d'attente : 200 pour le bon rôle, 404 pour un vendeur dans le back office", async ({
    page,
  }) => {
    await signIn(page, "seller_a", "/vendeur");
    for (const [path, title] of [
      ["/vendeur/dossier", "Dossier de vente"],
      ["/messages", "Messages"],
      ["/acquereur/favoris", "Favoris"],
      ["/compte", "Mon compte"],
    ] as const) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(title);
      await expect(page, path).toHaveTitle(new RegExp(`^${title} · Leenkey$`));
    }
    // Until the account page (L1-39), it signs out (the only way in mobile).
    await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
    for (const path of [
      "/admin/annonces",
      "/admin/utilisateurs",
      "/admin/dossiers",
      "/admin/offres",
      "/admin/signalements",
      "/admin/assistant",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test("pages d'attente du back office : 200 pour l'admin", async ({ page }) => {
    await signIn(page, "admin", "/admin");
    for (const [path, title] of [
      ["/admin/annonces", "Annonces"],
      ["/admin/utilisateurs", "Utilisateurs"],
      ["/admin/dossiers", "Dossiers"],
      ["/admin/offres", "Offres"],
      ["/admin/signalements", "Signalements"],
      ["/admin/assistant", "Assistant"],
    ] as const) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(title);
      await expect(page, path).toHaveTitle(`${title} · Back office · Leenkey`);
    }
    // No bell for the back office yet (DECISIONS 2026-10-17), nor on the
    // account page of an admin-only account.
    await page.goto("/compte");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mon compte");
    await expect(page.getByRole("button", { name: /^Notifications/ })).toHaveCount(0);
  });

  test("« Compte » déconnecte en mobile (jusqu'à la page compte)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "en desktop, le menu du compte");
    await signIn(page, "buyer_c", "/acquereur");
    await mainNav(page).getByRole("link", { name: "Compte" }).click();
    await expect(page).toHaveURL("/compte");
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await page.waitForURL((url) => url.pathname === "/");
  });
});
