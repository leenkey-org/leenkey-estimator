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
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
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
 * The links of the TopNav at each width (DESIGN.md 10.6, DECISIONS 2026-10-20),
 * and from 1280 px the button of « Qui sommes-nous » between the last two
 * (L1-51, DECISIONS 2026-10-24).
 */
const TOP_NAV = {
  768: ["Acheter", "Vendre", "Valoriser mon bien"],
  1024: ["Acheter", "Vendre", "Tarifs", "Valoriser mon bien", "Contact"],
  1280: ["Acheter", "Vendre", "Tarifs", "Valoriser mon bien", "Contact"],
} as const;
const ABOUT = "Qui sommes-nous";

/**
 * The TopNav at 768 px, the narrowest (criterion of L1-10: the links end
 * before the buttons on the right), and where it gains links (1024 and 1280
 * px, L1-45: at least 24 px before them); nothing leaves the screen.
 */
async function expectTopNavFits(page: Page) {
  for (const width of [768, 1024, 1280] as const) {
    await page.setViewportSize({ width, height: 900 });
    // Measured with Sora, not with the fallback font.
    await page.evaluate(() => document.fonts.ready);
    await expect(mainNav(page).getByRole("link"), `${width}`).toHaveText([...TOP_NAV[width]]);
    const about = mainNav(page).getByRole("button", { name: ABOUT });
    if (width === 1280) await expect(about).toBeVisible();
    else await expect(about, `${width}`).toBeHidden();
    const lastLink = await mainNav(page).getByRole("link").last().boundingBox();
    const cta = await page.getByRole("link", { name: "Vendre mon bien" }).boundingBox();
    const room = width === 768 ? 0 : 24;
    expect(lastLink && cta && lastLink.x + lastLink.width + room, `${width}`).toBeLessThanOrEqual(
      cta?.x ?? 0,
    );
    const right = await page
      .getByRole("banner")
      .evaluate((header) =>
        Math.max(
          ...[...header.querySelectorAll("a, button")].map(
            (el) => el.getBoundingClientRect().right,
          ),
        ),
      );
    expect(right, `${width}`).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `${width}`,
    ).toBeLessThanOrEqual(width);
  }
}

const BUYER_TABS = ["Chercher", "Favoris", "Vendre", "Messages", "Compte"];
const SELLER_TABS = ["Ma vente", "Dossier", "Acheter", "Messages", "Compte"];

/** The tabs of the BottomNav, in order, each label whole (never cut). */
async function expectTabs(page: Page, labels: string[], current: string | null) {
  const nav = mainNav(page);
  await expect(nav.getByRole("link")).toHaveText(labels);
  for (const label of labels) {
    const link = nav.getByRole("link", { name: label, exact: true });
    if (label === current) await expect(link).toHaveAttribute("aria-current", "page");
    else await expect(link).not.toHaveAttribute("aria-current", /.+/);
  }
  const cut = await nav
    .locator("a span")
    .evaluateAll((spans) =>
      spans.filter((span) => span.scrollWidth > span.clientWidth).map((span) => span.textContent),
    );
  expect(cut).toEqual([]);
}

test.describe("visiteur sans session", () => {
  test("/acheter en mobile : onglets de l'acquéreur, pas de barre haute", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "navigation basse sous 768 px");
    const response = await page.goto("/acheter");
    expect(response?.status()).toBe(200);
    await expectTabs(page, BUYER_TABS, "Chercher");
    await expect(mainNav(page).getByRole("link", { name: "Favoris" })).toHaveAttribute(
      "href",
      "/acquereur/favoris",
    );
    // Every visitor may sell (DECISIONS 2026-10-19): the two ways to start (2026-10-26).
    await expect(mainNav(page).getByRole("link", { name: "Vendre" })).toHaveAttribute(
      "href",
      "/vendre",
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
    await expect(nav.getByRole("link")).toHaveText([...TOP_NAV[1280]]);
    await expect(nav.getByRole("link", { name: "Acheter" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Vendre" })).toHaveAttribute("href", "/vendre");
    await expect(nav.getByRole("link", { name: "Valoriser mon bien" })).toHaveAttribute(
      "href",
      "/estimer",
    );
    await expect(nav.getByRole("button", { name: ABOUT })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(nav.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    // The logo of the header (the footer has its own since L1-58).
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Leenkey", exact: true }),
    ).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Vendre mon bien" })).toHaveAttribute(
      "href",
      "/vendre",
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

  test("/acheter à 768, 1 024 et 1 280 px : la barre haute tient sans chevauchement", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "barre haute à partir de 768 px");
    await page.goto("/acheter");
    await expectTopNavFits(page);
  });

  test("« Qui sommes-nous » ouvre ses deux pages : souris, clic, clavier (L1-51)", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "barre haute à partir de 768 px");
    await page.goto("/");
    const nav = mainNav(page);
    const about = nav.getByRole("button", { name: ABOUT });
    const company = nav.getByRole("link", { name: "Leenkey et son fondateur" });
    const invest = nav.getByRole("link", { name: "Investir dans Leenkey" });
    const expanded = (value: boolean) =>
      expect(about).toHaveAttribute("aria-expanded", String(value));
    /** Open, read at once (the time of a click that follows the opening counts). */
    const opened = async () =>
      page.waitForFunction(
        (button) => button?.getAttribute("aria-expanded") === "true",
        await about.elementHandle(),
        { polling: "raf" },
      );
    // A point of the page out of the group: the left margin, under the bar.
    const banner = await page.getByRole("banner").boundingBox();
    const away = { x: 8, y: (banner?.y ?? 0) + (banner?.height ?? 0) + 200 };

    await expanded(false);
    await expect(company).toBeHidden();

    await test.step("la souris posée dessus l'ouvre, la souris qui s'en va le referme", async () => {
      await about.hover();
      await expanded(true);
      await expect(company).toHaveAttribute("href", "/qui-sommes-nous");
      await expect(invest).toHaveAttribute("href", "/investir");
      await page.mouse.move(away.x, away.y);
      await expanded(false);
    });

    await test.step("un clic juste après cette ouverture la confirme, un clic plus tard referme", async () => {
      await about.hover();
      await opened();
      await about.click();
      await expanded(true);
      await about.click();
      await expanded(false);
      await page.mouse.move(away.x, away.y);
      await about.hover();
      await opened();
      await page.waitForTimeout(700);
      await about.click();
      await expanded(false);
    });

    await test.step("ouvert d'un clic, il reste ouvert quand la souris s'en va ; un appui ailleurs le referme", async () => {
      await about.click();
      await expanded(true);
      await page.mouse.move(away.x, away.y);
      await page.waitForTimeout(400);
      await expanded(true);
      await page.mouse.click(away.x, away.y);
      await expanded(false);
    });

    await test.step("le focus dans le panneau le garde ouvert quand la souris s'en va", async () => {
      await about.focus();
      await about.hover();
      await expanded(true);
      await page.keyboard.press("Tab");
      await expect(company).toBeFocused();
      await page.mouse.move(away.x, away.y);
      await page.waitForTimeout(400);
      await expanded(true);
      await expect(company).toBeFocused();
      await page.keyboard.press("Escape");
      await expanded(false);
      await expect(about).toBeFocused();
    });

    await test.step("clavier : Entrée ouvre, Tab parcourt ses liens, Échap referme", async () => {
      await page.keyboard.press("Enter");
      await expanded(true);
      await page.keyboard.press("Tab");
      await expect(company).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(invest).toBeFocused();
      expect(await seriousViolations(page)).toEqual([]);
      // Over the sticky header of a page (layer 20), as the one of a conversation.
      await page.evaluate(() => {
        const bar = document.createElement("div");
        bar.style.cssText =
          "position: sticky; top: 72px; z-index: 20; height: 160px; background: #fff";
        document.querySelector("main")?.prepend(bar);
      });
      for (const link of [company, invest]) {
        const box = await link.boundingBox();
        const point = {
          x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
          y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
        };
        const onTop = await link.evaluate((element, { x, y }) => {
          const top = document.elementFromPoint(x, y);
          return top !== null && element.contains(top);
        }, point);
        expect(onTop).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expanded(false);
      await expect(about).toBeFocused();
      // Past its links, the focus leaving the group closes it.
      await page.keyboard.press("Enter");
      for (let i = 0; i < 3; i += 1) await page.keyboard.press("Tab");
      await expect(nav.getByRole("link", { name: "Contact" })).toBeFocused();
      await expanded(false);
    });

    await test.step("un lien suivi : sa page, le groupe courant et la page dans le panneau", async () => {
      await about.click();
      await invest.click();
      await expect(page).toHaveURL("/investir");
      await expanded(false);
      await expect(about).toHaveAttribute("aria-current", "true");
      await about.click();
      await expect(invest).toHaveAttribute("aria-current", "page");
      await expect(company).not.toHaveAttribute("aria-current", /.+/);
    });
  });

  test.describe("au toucher, à 1 280 px", () => {
    test.use({ hasTouch: true });

    test("« Qui sommes-nous » : un appui ouvre, un appui ailleurs referme, un lien se suit", async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "barre haute à partir de 768 px");
      await page.goto("/");
      const nav = mainNav(page);
      const about = nav.getByRole("button", { name: ABOUT });
      const banner = await page.getByRole("banner").boundingBox();
      await about.tap();
      await expect(about).toHaveAttribute("aria-expanded", "true");
      await page.touchscreen.tap(8, (banner?.y ?? 0) + (banner?.height ?? 0) + 200);
      await expect(about).toHaveAttribute("aria-expanded", "false");
      await about.tap();
      await nav.getByRole("link", { name: "Investir dans Leenkey" }).tap();
      await expect(page).toHaveURL("/investir");
      await expect(about).toHaveAttribute("aria-expanded", "false");
    });
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

  test("/vendre : l'analyse de valeur ou l'annonce directe (DECISIONS 2026-10-26)", async ({
    page,
  }) => {
    await page.goto("/vendre");
    await expect(page).toHaveTitle("Vendre votre bien · Leenkey");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Comment voulez-vous commencer ?",
    );
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 2 })).toHaveText([
      "Connaître la valeur de mon bien",
      "Publier directement mon annonce",
    ]);
    await expect(
      main.getByRole("link", { name: "Valoriser mon bien gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
    // Signed out: the seller sign-up first, then the creation of the property.
    await expect(main.getByRole("link", { name: "Publier mon annonce" })).toHaveAttribute(
      "href",
      `/inscription?role=seller&next=${encodeURIComponent("/vendeur/biens/nouveau")}`,
    );
    await expectFooter(page);
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

  test("« Retour aux annonces » ramène à la recherche, jamais à la page d'avant si ce n'est pas elle (DECISIONS 2026-10-26)", async ({
    page,
    isMobile,
  }) => {
    // The text link from 1 024 px, the button over the mobile gallery: the same name.
    const back = page.getByRole("link", { name: "Retour aux annonces" }).locator("visible=true");
    const search = "/acheter?ville=epinay-sur-orge&rayon=10";
    await page.goto(search);
    await page.getByRole("list", { name: "Résultats" }).locator("a:visible").first().click();
    await expect(page).toHaveURL(/\/annonce\//);
    const listing = new URL(page.url()).pathname;
    await back.click();
    // Back in the history: the same search, its filters kept.
    await expect(page).toHaveURL(search);

    // From the home page (its logo, from 768 px: the search has no header
    // below), a listing leads to the last search of the visit, not home. In
    // mobile, the conversation test covers a page before that is not the search.
    if (!isMobile) {
      await page.getByRole("banner").locator('a[href="/"]').first().click();
      await expect(page).toHaveURL("/");
      await page.locator('main a[href^="/annonce/"]:visible').first().click();
      await expect(page).toHaveURL(/\/annonce\//);
      await expect(back).toHaveAttribute("href", search);
      await back.click();
      await expect(page).toHaveURL(search);
    }

    // Opened directly (a new visit), it leads to the search.
    await page.goto(listing);
    await expect(back).toHaveAttribute("href", "/acheter");
    await back.click();
    await expect(page).toHaveURL("/acheter");
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

/**
 * The way from a conversation to what it is about: a button of its header
 * from 768 px, the first item of its menu below (DECISIONS 2026-10-26).
 */
async function conversationLink(page: Page, isMobile: boolean, name: string) {
  if (!isMobile) return page.getByRole("link", { name }).locator("visible=true");
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  return page.getByRole("menu").getByRole("menuitem", { name });
}

test.describe("comptes connectés (base de seed)", () => {
  test.skip(!seeded || !SEED_PASSWORD, SEED_REQUIRED);

  test("vendeur : onglets « Ma vente » et cloche en mobile, barre haute en desktop", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "seller_a", "/vendeur");
    // « Ma vente » (L1-24): the greeting above the title.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ma vente");
    await expect(page.getByText("Bonjour Alice", { exact: true })).toBeVisible();
    await expectFooter(page);
    const bell = page.getByRole("button", { name: "Notifications", exact: true });
    // One bell at each width: next to the title in mobile, in the TopNav after.
    await expect(bell).toHaveCount(1);
    await expect(bell).toBeVisible();
    if (isMobile) {
      await expectTabs(page, SELLER_TABS, "Ma vente");
      await expect(page.getByRole("button", { name: "Menu du compte" })).toBeHidden();
      await mainNav(page).getByRole("link", { name: "Dossier" }).click();
      await expect(page).toHaveURL("/vendeur/dossier");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dossier de vente");
      await expectTabs(page, SELLER_TABS, "Dossier");
      // The bell is on every page of the area, not only on its home (Q26).
      await expect(bell).toBeVisible();
      // The seller buys too (DECISIONS 2026-10-19): the listings, then back.
      await mainNav(page).getByRole("link", { name: "Acheter" }).click();
      await expect(page).toHaveURL("/acheter");
      await expect(page.getByRole("list", { name: "Résultats" })).toBeVisible();
      await expectTabs(page, BUYER_TABS, "Chercher");
      await mainNav(page).getByRole("link", { name: "Vendre" }).click();
      await expect(page).toHaveURL("/vendeur");
      await expectTabs(page, SELLER_TABS, "Ma vente");
    } else {
      await expect(mainNav(page).getByRole("link")).toHaveText([...TOP_NAV[1280]]);
      await expect(page.getByRole("link", { name: "Vendre mon bien" })).toHaveAttribute(
        "href",
        "/vendre",
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
    if (!isMobile) await expectTopNavFits(page);
  });

  test("une page commune garde l'espace d'où l'on vient, recherche comprise", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "onglets sous 768 px");
    // seller_a only sells: on /messages opened first, the seller tabs.
    await signIn(page, "seller_a", "/acheter");
    await expectTabs(page, BUYER_TABS, "Chercher");
    await mainNav(page).getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL("/messages");
    await expectTabs(page, BUYER_TABS, "Messages");
    await expect(page.getByRole("button", { name: /^Notifications/ })).toBeVisible();
    await page.getByRole("button", { name: /^Notifications/ }).click();
    // The panel of the buyer space: its filters (L1-22).
    await expect(
      page
        .getByRole("dialog", { name: "Notifications" })
        .getByRole("group", { name: "Filtrer les notifications" })
        .getByRole("button"),
    ).toHaveText(["Toutes", "Mes recherches", "Visites et offres"]);
  });

  test("acquéreur : onglets de l'acquéreur", async ({ page, isMobile }) => {
    await signIn(page, "buyer_c", "/acquereur");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour Chloé");
    await expectFooter(page);
    if (isMobile) {
      // The buyer home is not one of the tabs (DESIGN.md 10.6).
      await expectTabs(page, BUYER_TABS, null);
      await mainNav(page).getByRole("link", { name: "Favoris" }).click();
      await expect(page).toHaveURL("/acquereur/favoris");
      await expectTabs(page, BUYER_TABS, "Favoris");
      // The buyer home is not a tab: the bell is on this page too (Q26), with the
      // answer of Alice unread in the seed (L1-22).
      await expect(page.getByRole("button", { name: "Notifications, 1 nouvelle" })).toBeVisible();
      // On the search too, the buyer keeps the same tabs.
      await mainNav(page).getByRole("link", { name: "Chercher" }).click();
      await expect(page).toHaveURL("/acheter");
      await expectTabs(page, BUYER_TABS, "Chercher");
      // The buyer sells too (DECISIONS 2026-10-19): the seller area, empty.
      await mainNav(page).getByRole("link", { name: "Vendre" }).click();
      await expect(page).toHaveURL("/vendeur");
      await expectTabs(page, SELLER_TABS, "Ma vente");
      await expect(page.getByRole("link", { name: "Créer mon annonce" })).toHaveAttribute(
        "href",
        "/vendeur/biens/nouveau",
      );
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
    // The dashboard comes with L1-30; the listings to review are already there.
    await expect(page.getByRole("heading", { name: "Le tableau de bord arrive" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les annonces à valider" })).toHaveAttribute(
      "href",
      "/admin/annonces?statut=a-valider",
    );
    if (isMobile) {
      await expect(page.getByRole("banner")).toContainText("Back office");
      await expect(page.getByRole("banner")).toContainText("Tableau de bord");
      // Always a way back to the site, in the header too (DECISIONS 2026-10-26).
      await expect(
        page.getByRole("banner").getByRole("link", { name: "Voir le site" }),
      ).toHaveAttribute("href", "/");
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
      // Always a way back to the site (DECISIONS 2026-10-26).
      await expect(page.getByRole("link", { name: "Voir le site" })).toHaveAttribute("href", "/");
      // No buyer or seller tabs in the back office.
      await expect(page.getByRole("navigation", { name: MAIN_NAV })).toHaveCount(0);
    }
    expect(await seriousViolations(page)).toEqual([]);
  });

  // The buyer side, conversation to listing to search: messaging-live.spec.ts
  // (opening the conversation of buyer_c reads it).
  test("une conversation mène au bien, pour le vendeur", async ({ page, isMobile }) => {
    await signIn(page, "seller_a", "/messages");
    await page.locator('main a[href^="/messages/"]:visible').first().click();
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
    await expect(await conversationLink(page, isMobile, "Voir mon bien")).toHaveAttribute(
      "href",
      /^\/vendeur\/biens\/[0-9a-f-]{36}$/,
    );
  });

  test("admin sur le site : son espace s'appelle « Back office », sans « Voir le site »", async ({
    page,
    isMobile,
  }) => {
    await signIn(page, "admin", "/");
    if (isMobile) {
      await page.getByRole("button", { name: "Menu" }).click();
      const menu = page.getByRole("dialog");
      await expect(menu.getByRole("link", { name: "Back office" })).toHaveAttribute(
        "href",
        "/admin",
      );
      // The Cockpit is the space of a client (Younes, 2026-10-28): the admin
      // of the seed has no client role. One who sells or buys has it too
      // (L1-64): a property created with this account on the preprod adds
      // the role, until the next db:seed.
      await expect(menu.getByRole("link", { name: "Cockpit" })).toHaveCount(0);
    } else {
      await page.getByRole("button", { name: "Menu du compte" }).click();
      await expect(page.getByRole("menu").getByRole("menuitem")).toHaveText([
        "Back office",
        "Mon compte",
        "Se déconnecter",
      ]);
    }
  });

  test("vendeur : « Publier mon annonce » mène à la création du bien", async ({ page }) => {
    await signIn(page, "seller_a", "/vendre");
    await expect(
      page.getByRole("main").getByRole("link", { name: "Publier mon annonce" }),
    ).toHaveAttribute("href", "/vendeur/biens/nouveau");
  });

  test("l'espace suit la page sans rechargement : les filtres de la cloche changent", async ({
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
    const filters = panel
      .getByRole("group", { name: "Filtrer les notifications" })
      .getByRole("button");
    await page.getByRole("link", { name: "Favoris" }).click();
    await expect(page).toHaveURL("/acquereur/favoris");
    await bell.click();
    await expect(filters).toHaveText(["Toutes", "Mes recherches", "Visites et offres"]);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Menu du compte" }).click();
    await page.getByRole("menuitem", { name: "Cockpit" }).click();
    await expect(page).toHaveURL("/vendeur");
    await bell.click();
    await expect(filters).toHaveText(["Toutes", "Messages", "Offres et visites"]);
    expect(await page.evaluate(() => "lkSameDocument" in window)).toBe(true);
  });

  test("la cloche ouvre le panneau, Échap le referme", async ({ page }) => {
    // No 220 ms entrance (DESIGN.md 2.2): axe measures the panel in place.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, "seller_a", "/vendeur");
    const bell = page.getByRole("button", { name: "Notifications", exact: true });
    await bell.click();
    const panel = page.getByRole("dialog", { name: "Notifications" });
    await expect(panel).toBeVisible();
    // The messages of the seed, read (L1-22); the empty panel: tests/e2e/design.spec.ts.
    await expect(
      panel.getByRole("link").filter({ hasText: "Nouveau message de" }).first(),
    ).toBeVisible();
    await expect(panel.getByRole("link", { name: "Réglages des notifications" })).toHaveAttribute(
      "href",
      "/compte/notifications",
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
    await expect(page).toHaveURL("/compte/notifications");
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
    // The space of an admin is the back office, with the way back to the
    // site; the space of a client, the Cockpit (Younes, 2026-10-28).
    const homeLabel = isMobile ? "Back office" : "Cockpit";
    await expect(menu.getByRole("menuitem")).toHaveText(
      isMobile
        ? ["Back office", "Voir le site", "Mon compte", "Se déconnecter"]
        : ["Cockpit", "Mon compte", "Se déconnecter"],
    );
    await expect(menu.getByRole("menuitem", { name: homeLabel })).toHaveAttribute("href", home);
    if (isMobile) {
      await expect(menu.getByRole("menuitem", { name: "Voir le site" })).toHaveAttribute(
        "href",
        "/",
      );
    }
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
    // The 404 of the site, alone on the screen, which never names the back
    // office, not even in the title of the tab (app/(admin)/admin/layout.tsx).
    for (const path of [
      "/admin",
      "/admin/annonces",
      "/admin/utilisateurs",
      "/admin/dossiers",
      "/admin/offres",
      "/admin/signalements",
      "/admin/assistant",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page, path).toHaveTitle("Page introuvable · Leenkey");
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(
        "Cette page n'existe pas.",
      );
      await expect(page.getByRole("main"), path).toHaveCount(1);
      await expect(page.getByRole("navigation", { name: ADMIN_NAV }), path).toHaveCount(0);
    }
  });

  test("après la 404 du back office, un vendeur garde la cloche et les onglets de sa vente", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "la cloche de la TopNav, à partir de 768 px");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, "seller_a", "/vendeur");
    expect((await page.goto("/admin"))?.status()).toBe(404);
    // Kept by a client navigation, lost by a full load: from here, the
    // browser keeps the space of /admin (SpaceProvider), which the bell and
    // the tabs of a seller ignore.
    await page.evaluate(() => Object.assign(window, { lkSameDocument: true }));
    await page.getByRole("link", { name: "Retour à l'accueil" }).click();
    await expect(page).toHaveURL("/");
    await page
      .getByRole("button", { name: /^Notifications/ })
      .locator("visible=true")
      .click();
    // The filters of the sale; the back office has a single one, without group.
    await expect(
      page
        .getByRole("dialog", { name: "Notifications" })
        .getByRole("group", { name: "Filtrer les notifications" })
        .getByRole("button"),
    ).toHaveText(["Toutes", "Messages", "Offres et visites"]);
    await page.keyboard.press("Escape");
    // A page without a space of its own: under 768 px, the tabs of the sale.
    await page.getByRole("button", { name: "Menu du compte" }).click();
    await page.getByRole("menu").getByRole("menuitem", { name: "Mon compte" }).click();
    await expect(page).toHaveURL("/compte");
    await page.setViewportSize({ width: 390, height: 844 });
    await expectTabs(page, SELLER_TABS, "Compte");
    expect(await page.evaluate(() => "lkSameDocument" in window)).toBe(true);
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
    // The bell of the back office (L1-22), on the account page too: the
    // listings sent for review of the seed, unread.
    await page.goto("/compte");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mon compte");
    const bell = page.getByRole("button", { name: /^Notifications, \d+ nouvelles?$/ });
    await expect(bell.locator("visible=true")).toHaveCount(1);
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
