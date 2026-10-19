import { expect, test, type Page } from "@playwright/test";
import { consentValue, fakeGoogle } from "./google";

// L1-01: the V1 site (marketing pages, valuation wizard, contact forms,
// analytics) must behave the same once ported to Next.js.

const pages = [
  "/",
  "/concept",
  "/investir",
  "/tarifs",
  "/faq",
  "/cgu",
  "/mentions-legales",
  "/qui-sommes-nous",
];

for (const path of pages) {
  test(`page ${path} s'affiche`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator(".lk-nav-logo").first()).toBeVisible();
    await expect(page.locator("main").first()).not.toBeEmpty();
  });
}

// The menu of the marketing pages leads to the listings and to the account
// (DECISIONS 2026-10-19): /connexion takes a signed-in account to its space.
test("le menu des pages marketing mène aux annonces et au compte", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tarifs");
  const nav = page.locator("nav.lk-nav");
  await expect(nav.getByRole("link", { name: "Acheter", exact: true })).toHaveAttribute(
    "href",
    "/acheter",
  );
  await expect(nav.getByRole("link", { name: "Mon compte" })).toHaveAttribute("href", "/connexion");

  // Below 1 240 px, in the menu.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.locator(".lk-nav-mobile-overlay");
  await menu.getByRole("link", { name: "Mon compte" }).click();
  await expect(page).toHaveURL("/connexion");
});

test("le formulaire de contact de l'accueil part vers /api/contact", async ({ page }) => {
  let body: { source?: string; data?: Record<string, string> } = {};
  await page.route("**/api/contact", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto("/");
  const form = page.locator("#contact-form");
  await form.scrollIntoViewIfNeeded();
  await form.locator('[name="motif"]').selectOption({ index: 1 });
  await form.locator('[name="prenom"]').fill("Test");
  await form.locator('[name="nom"]').fill("Recette");
  await form.locator('[name="email"]').fill("test@example.com");
  await form.locator('[name="message"]').fill("Message de recette");
  await form.locator('button[type="submit"], input[type="submit"]').first().click();
  await expect(page.locator("#contact-form ~ .form-success")).toBeVisible();
  expect(body.source).toBe("contact");
  expect(body.data?.email).toBe("test@example.com");
});

test("l'estimateur affiche sa première étape", async ({ page }) => {
  await page.goto("/estimer");
  await expect(page.getByText("Quel type de bien souhaitez-vous vendre ?")).toBeVisible();
});

// Audience measurement accepted (L1-37): GA4 and GTM may load, through the
// stand-ins of ./google (no real hit).
async function acceptAudience(page: Page, baseURL: string | undefined) {
  await fakeGoogle(page.context());
  await page
    .context()
    .addCookies([{ name: "lk_consent", value: consentValue(true), url: baseURL ?? "" }]);
}

test("GA4 et GTM ne chargent qu'en production, une fois la mesure d'audience acceptée", async ({
  page,
  baseURL,
}) => {
  await acceptAudience(page, baseURL);
  await page.goto("/");
  // The tags are `afterInteractive` scripts: they run after hydration, which
  // can come after the load event that `goto` waits for.
  if (process.env.NEXT_PUBLIC_ENV === "production") {
    await page.waitForFunction(() => {
      const w = window as { gtag?: unknown; dataLayer?: Array<{ event?: string }> };
      return typeof w.gtag === "function" && !!w.dataLayer?.some((e) => e?.event === "gtm.js");
    });
  } else {
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe("undefined");
  }
});

test("GA4 reçoit un page_view à chaque navigation", async ({ page, isMobile, baseURL }) => {
  test.skip(isMobile, "lien de navigation dans le menu desktop");
  test.skip(process.env.NEXT_PUBLIC_ENV !== "production", "GA4 actif en production uniquement");
  await acceptAudience(page, baseURL);
  await page.goto("/");
  await page.waitForFunction(() => typeof (window as { gtag?: unknown }).gtag === "function");
  await page.locator('nav a[href="/tarifs"]').first().click();
  await page.waitForURL("**/tarifs");
  const views = await page.evaluate(() =>
    ((window as unknown as { dataLayer: IArguments[] }).dataLayer ?? [])
      .map((entry) => Array.from(entry as ArrayLike<unknown>))
      .filter((args) => args[0] === "event" && args[1] === "page_view")
      .map((args) => (args[2] as { page_path?: string }).page_path),
  );
  expect(views).toContain("/tarifs");
});
