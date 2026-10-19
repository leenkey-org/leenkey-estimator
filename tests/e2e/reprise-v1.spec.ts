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

// L1-13b: the result of the wizard (restored from this browser, as after a
// reload) leads to the creation of the listing, through the sign-up for an
// analysis made without an account; the token never goes in the address.
test("le résultat de l'estimateur mène à la création de l'annonce", async ({ page }) => {
  const estimationId = "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27";
  const claimToken = "c".repeat(48);
  await page.goto("/");
  await page.evaluate(
    ([id, token]) =>
      localStorage.setItem(
        "leenkey_dashboard_v1",
        JSON.stringify({
          form: {
            type: "appartement",
            adresse: "12 Rue de la Gare 91360 Épinay-sur-Orge",
            code_postal: "91360",
            ville: "Épinay-sur-Orge",
            surface_habitable: 68,
            pieces: 3,
          },
          submitted: { ref: "EST-2026-12345", estimation: { id, claimToken: token } },
        }),
      ),
    [estimationId, claimToken],
  );
  await page.goto("/estimer");
  const create = page.getByRole("link", { name: "Créer mon annonce" });
  await expect(create).toHaveAttribute(
    "href",
    `/inscription?role=seller&next=${encodeURIComponent(`/vendeur/biens/nouveau?estimation=${estimationId}`)}`,
  );
  await create.click();
  await expect(page).toHaveURL(/\/inscription\?role=seller&next=/);
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
