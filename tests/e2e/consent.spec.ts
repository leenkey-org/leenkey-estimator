import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-37: cookie consent (Q23). Nothing from Google before an explicit
// « Accepter »; refusing is as easy as accepting and is kept six months;
// « Gérer mes cookies » reopens the choice. These tests start without the
// consent cookie the other suites get from playwright.config.ts.
test.use({ storageState: { cookies: [], origins: [] } });

const production = process.env.NEXT_PUBLIC_ENV === "production";
const GOOGLE = /googletagmanager\.com|google-analytics\.com/;

function watchGoogle(page: Page): string[] {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (GOOGLE.test(request.url())) requests.push(request.url());
  });
  return requests;
}

async function consentCookie(page: Page) {
  return (await page.context().cookies()).find((cookie) => cookie.name === "lk_consent");
}

async function analyticsCookies(page: Page) {
  return (await page.context().cookies())
    .map((cookie) => cookie.name)
    .filter((name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid");
}

const banner = (page: Page) => page.getByRole("region", { name: "Cookies" });
const preferences = (page: Page) => page.getByRole("region", { name: "Vos préférences" });

test("premier passage : le bandeau demande l'accord, rien de Google avant", async ({ page }) => {
  const google = watchGoogle(page);
  await page.goto("/");
  await expect(banner(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe("undefined");
  expect(await analyticsCookies(page)).toEqual([]);
  expect(google).toEqual([]);
});

test("Refuser : rien ne se charge, et le choix est gardé six mois", async ({ page }) => {
  const google = watchGoogle(page);
  await page.goto("/acheter");
  await banner(page).getByRole("button", { name: "Refuser" }).click();
  await expect(banner(page)).toBeHidden();
  const cookie = await consentCookie(page);
  expect(cookie?.value).toMatch(/^v1\.0\.\d{4}-\d{2}-\d{2}$/);
  const days = ((cookie?.expires ?? 0) - Date.now() / 1000) / 86_400;
  expect(days).toBeGreaterThan(179);
  expect(days).toBeLessThan(184);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(banner(page)).toBeHidden();
  expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe("undefined");
  expect(await analyticsCookies(page)).toEqual([]);
  expect(google).toEqual([]);
});

test("Accepter : la mesure d'audience démarre (en production seulement)", async ({ page }) => {
  await page.goto("/");
  await banner(page).getByRole("button", { name: "Accepter" }).click();
  await expect(banner(page)).toBeHidden();
  expect((await consentCookie(page))?.value).toMatch(/^v1\.1\./);
  if (production) {
    await page.waitForFunction(() => typeof (window as { gtag?: unknown }).gtag === "function");
  } else {
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe("undefined");
  }
});

test("Personnaliser : la mesure d'audience est décochée par défaut", async ({ page }) => {
  await page.goto("/cookies");
  await banner(page).getByRole("button", { name: "Personnaliser" }).click();
  const panel = preferences(page);
  await expect(panel.getByRole("checkbox", { name: /Mesure d'audience/ })).not.toBeChecked();
  await panel.getByRole("button", { name: "Enregistrer mes choix" }).click();
  await expect(panel).toBeHidden();
  expect((await consentCookie(page))?.value).toMatch(/^v1\.0\./);
});

test("« Gérer mes cookies » rouvre les choix, depuis le pied de page V2 et V1", async ({
  page,
}) => {
  await page.goto("/cookies");
  await banner(page).getByRole("button", { name: "Refuser" }).click();
  await page.getByRole("contentinfo").getByRole("button", { name: "Gérer mes cookies" }).click();
  const panel = preferences(page);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Vos préférences" })).toBeFocused();
  await panel.getByRole("checkbox", { name: /Mesure d'audience/ }).check();
  await panel.getByRole("button", { name: "Enregistrer mes choix" }).click();
  expect((await consentCookie(page))?.value).toMatch(/^v1\.1\./);

  await page.goto("/");
  await page.locator("footer").getByRole("button", { name: "Gérer mes cookies" }).click();
  await expect(preferences(page)).toBeVisible();
  await expect(
    preferences(page).getByRole("checkbox", { name: /Mesure d'audience/ }),
  ).toBeChecked();
});

test("retirer son accord recharge la page sans Google", async ({ page }) => {
  test.skip(!production, "GA4 actif en production uniquement");
  await page.goto("/cookies");
  await banner(page).getByRole("button", { name: "Accepter" }).click();
  await page.waitForFunction(() => typeof (window as { gtag?: unknown }).gtag === "function");
  await page.getByRole("contentinfo").getByRole("button", { name: "Gérer mes cookies" }).click();
  await Promise.all([
    page.waitForEvent("load"),
    preferences(page).getByRole("button", { name: "Refuser" }).click(),
  ]);
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe("undefined");
  expect(await analyticsCookies(page)).toEqual([]);
  expect((await consentCookie(page))?.value).toMatch(/^v1\.0\./);
});

test("le bandeau n'a aucune violation sérieuse ou critique @a11y", async ({ page }) => {
  for (const path of ["/", "/acheter"]) {
    await page.goto(path);
    await expect(banner(page)).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
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
