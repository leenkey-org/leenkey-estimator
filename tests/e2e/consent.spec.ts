import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { fakeGoogle, GOOGLE } from "./google";
import { MAPS_HOSTS } from "./google-maps";

// L1-37: cookie consent (Q23). No audience (Google Analytics, Tag Manager)
// before an explicit « Accepter »; refusing is as easy as accepting and is
// kept six months;
// « Gérer mes cookies » reopens the choice. These tests start without the
// consent cookie the other suites get from playwright.config.ts.
test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ context }) => fakeGoogle(context));

const production = process.env.NEXT_PUBLIC_ENV === "production";

/**
 * The requests to Google the banner governs: the audience (Tag Manager,
 * Analytics). Not the maps, which load without asking since L1-63
 * (DECISIONS 2026-10-28, Q63).
 */
function watchGoogle(page: Page): string[] {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (GOOGLE.test(url) && !MAPS_HOSTS.test(url)) requests.push(url);
  });
  return requests;
}

async function consentCookie(page: Page) {
  return (await page.context().cookies()).find((cookie) => cookie.name === "lk_consent");
}

/** Value of the consent cookie (written at once by the page). */
function consentValue(page: Page) {
  return expect.poll(async () => (await consentCookie(page))?.value ?? "");
}

/** Answer of the server action that sets the lasting cookie (Safari, iOS). */
function consentAction(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && !!response.request().headers()["next-action"],
  );
}

async function analyticsCookies(page: Page) {
  return (await page.context().cookies())
    .map((cookie) => cookie.name)
    .filter((name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid");
}

const banner = (page: Page) => page.getByRole("region", { name: "Cookies" });
const preferences = (page: Page) => page.getByRole("region", { name: "Vos préférences" });

// No « networkidle »: on /acheter with the photos of the seed, the network
// sometimes never went quiet and the test failed after 30 s (2026-10-25).
// What counts is the moment ConsentManager has read the consent cookie: the
// tags it allows are mounted in that same render, the banner is shown when
// there is no choice yet, and « Gérer mes cookies » opens the preferences.

/**
 * Opens « Vos préférences » from the footer once the page is hydrated (a
 * click before is lost): ConsentManager has then read the consent cookie.
 */
async function openPreferences(page: Page) {
  const manage = page.getByRole("contentinfo").getByRole("button", { name: "Gérer mes cookies" });
  await expect(async () => {
    // Clicked again only while the panel is not there: on a phone it covers
    // the button once open, and React may show it up to 300 ms late.
    if (!(await preferences(page).isVisible())) await manage.click({ timeout: 2_000 });
    await expect(preferences(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

type Watched = Window & {
  lkConsent?: { banner: boolean; read: boolean; loading: number; quietSince: number };
};

/**
 * Records whether the banner (not the preferences) was ever in the page, and
 * since when ConsentManager has read the consent cookie with no script
 * loading. Once the cookie is read, the banner comes in its own chunk, which
 * React may reveal up to 300 ms after (FALLBACK_THROTTLE_MS of React 19): a
 * click before would hide it from the test.
 */
async function watchConsent(page: Page) {
  // CONSENT_OPEN_EVENT of lib/consent.ts.
  await page.addInitScript((openEvent) => {
    const state = { banner: false, read: false, loading: 0, quietSince: 0 };
    Object.assign(window, { lkConsent: state });
    const quiet = () => {
      if (state.read && state.loading === 0) state.quietSince = performance.now();
    };
    // ConsentManager listens for « Gérer mes cookies » in the effect where it
    // has read the cookie and chosen whether to show the banner.
    const listen = window.addEventListener.bind(window);
    window.addEventListener = ((...args: Parameters<typeof listen>) => {
      if (args[0] === openEvent && !state.read) {
        state.read = true;
        quiet();
      }
      listen(...args);
    }) as typeof listen;
    new MutationObserver((records) => {
      for (const node of records.flatMap((record) => [...record.addedNodes])) {
        if (!state.read || !(node instanceof HTMLScriptElement) || !node.src) continue;
        state.loading += 1;
        const done = () => {
          state.loading -= 1;
          quiet();
        };
        node.addEventListener("load", done, { once: true });
        node.addEventListener("error", done, { once: true });
      }
      // A region whose name says « cookies », as banner() finds it (a named
      // section, or role="region"; the preferences are « Vos préférences »).
      for (const region of document.querySelectorAll("section, [role='region']")) {
        const role = region.getAttribute("role");
        if (role && role !== "region") continue;
        const labels = (region.getAttribute("aria-labelledby") ?? "").split(/\s+/);
        const name = [
          region.getAttribute("aria-label") ?? "",
          ...labels.map((id) => (id ? (document.getElementById(id)?.textContent ?? "") : "")),
        ].join(" ");
        if (/cookies/i.test(name)) state.banner = true;
      }
    }).observe(document, { childList: true, subtree: true, characterData: true });
  }, "lk:cookies");
}

/** Whether the banner showed: 600 ms after the cookie is read and no script loads, twice the 300 ms. */
async function bannerShown(page: Page) {
  await page.waitForFunction(
    () => {
      const watch = (window as Watched).lkConsent;
      return !!watch?.read && watch.loading === 0 && performance.now() - watch.quietSince >= 600;
    },
    null,
    // ConsentManager listens for « Gérer mes cookies » once it has read the cookie.
    { timeout: 15_000 },
  );
  return page.evaluate(() => (window as Watched).lkConsent?.banner);
}

/** Nothing of Google in the page: no tag, no gtag, no cookie, no request. */
async function expectNoGoogle(page: Page, requests: string[]) {
  await expect(page.locator('script[src*="googletagmanager"], script#ga4, script#gtm')).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe("undefined");
  expect(await analyticsCookies(page)).toEqual([]);
  expect(requests).toEqual([]);
}

test("premier passage : le bandeau demande l'accord, rien de Google avant", async ({ page }) => {
  const google = watchGoogle(page);
  await page.goto("/");
  // Shown once ConsentManager has found no choice: nothing of Google so far.
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText("Vous pouvez changer d'avis à tout moment");
  await expectNoGoogle(page, google);
});

test("Refuser : rien ne se charge, et le choix est gardé six mois", async ({ page }) => {
  const google = watchGoogle(page);
  await page.goto("/acheter");
  const action = consentAction(page);
  await banner(page).getByRole("button", { name: "Refuser" }).click();
  await expect(banner(page)).toBeHidden();
  await consentValue(page).toMatch(/^v1\.0\.\d{4}-\d{2}-\d{2}$/);
  // The lasting cookie comes from the server: Safari caps script cookies to 7 days.
  const setCookie = (await (await action).headerValue("set-cookie")) ?? "";
  expect(setCookie).toMatch(/lk_consent=v1\.0\.\d{4}-\d{2}-\d{2}/);
  expect(setCookie).toMatch(/Max-Age=15724800/i);
  const cookie = await consentCookie(page);
  const days = ((cookie?.expires ?? 0) - Date.now() / 1000) / 86_400;
  expect(days).toBeGreaterThan(179);
  expect(days).toBeLessThan(184);

  // Again, once the refusal is read: no banner, the audience unchecked, and
  // still nothing of Google.
  await watchConsent(page);
  await page.reload();
  expect(await bannerShown(page), "the banner came back after the refusal").toBe(false);
  await expect(banner(page)).toHaveCount(0);
  await openPreferences(page);
  await expect(
    preferences(page).getByRole("checkbox", { name: /Mesure d'audience/ }),
  ).not.toBeChecked();
  await expectNoGoogle(page, google);
});

test("Accepter : la mesure d'audience démarre (en production seulement)", async ({ page }) => {
  const google = watchGoogle(page);
  await page.goto("/");
  const action = consentAction(page);
  await banner(page).getByRole("button", { name: "Accepter" }).click();
  await expect(banner(page)).toBeHidden();
  await consentValue(page).toMatch(/^v1\.1\./);
  // The choice is rendered before its answer from the server comes back:
  // tags allowed would be mounted by then.
  await action;
  if (production) {
    await page.waitForFunction(() => typeof (window as { gtag?: unknown }).gtag === "function");
  } else {
    await expectNoGoogle(page, google);
  }
});

test("Personnaliser : la mesure d'audience est décochée par défaut", async ({ page }) => {
  await page.goto("/cookies");
  await banner(page).getByRole("button", { name: "Personnaliser" }).click();
  const panel = preferences(page);
  await expect(panel.getByRole("checkbox", { name: /Mesure d'audience/ })).not.toBeChecked();
  await panel.getByRole("button", { name: "Enregistrer mes choix" }).click();
  await expect(panel).toBeHidden();
  await consentValue(page).toMatch(/^v1\.0\./);
});

test("« Gérer mes cookies » rouvre les choix, depuis le pied de page V2 et V1", async ({
  page,
}) => {
  await page.goto("/cookies");
  await banner(page).getByRole("button", { name: "Refuser" }).click();
  const manage = page.getByRole("contentinfo").getByRole("button", { name: "Gérer mes cookies" });
  await manage.click();
  const panel = preferences(page);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Vos préférences" })).toBeFocused();
  await panel.getByRole("checkbox", { name: /Mesure d'audience/ }).check();
  await panel.getByRole("button", { name: "Enregistrer mes choix" }).click();
  await consentValue(page).toMatch(/^v1\.1\./);
  // Keyboard users come back where they were.
  await expect(manage).toBeFocused();

  await page.goto("/");
  await openPreferences(page);
  await expect(
    preferences(page).getByRole("checkbox", { name: /Mesure d'audience/ }),
  ).toBeChecked();
});

test("retirer son accord recharge la page sans Google", async ({ page }) => {
  test.skip(!production, "GA4 actif en production uniquement");
  await page.goto("/cookies");
  await banner(page).getByRole("button", { name: "Accepter" }).click();
  // gtag.js has run and set its cookies: there is something to withdraw.
  await expect.poll(() => analyticsCookies(page)).not.toEqual([]);
  await page.getByRole("contentinfo").getByRole("button", { name: "Gérer mes cookies" }).click();
  await Promise.all([
    page.waitForEvent("load"),
    preferences(page).getByRole("button", { name: "Refuser" }).click(),
  ]);
  // The reloaded page has read the refusal: gtag.js no longer runs.
  await openPreferences(page);
  expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe("undefined");
  expect(await analyticsCookies(page)).toEqual([]);
  await consentValue(page).toMatch(/^v1\.0\./);
});

test("« Gérer mes cookies » est aussi sous la connexion et la recherche", async ({ page }) => {
  await page.goto("/connexion");
  await banner(page).getByRole("button", { name: "Refuser" }).click();
  for (const path of ["/connexion", "/acheter"]) {
    await page.goto(path);
    await openPreferences(page);
  }
});

test("le bandeau n'a aucune violation sérieuse ou critique @a11y", async ({ page }) => {
  for (const path of ["/", "/acheter"]) {
    await page.goto(path);
    await expect(banner(page)).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const results = await new AxeBuilder({ page }).include("section[role=region]").analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(
      blocking.map((violation) => violation.id),
      path,
    ).toEqual([]);
  }
});
