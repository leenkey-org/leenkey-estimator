import { expect, test } from "@playwright/test";

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

test("GA4 reçoit un page_view à chaque navigation", async ({ page, isMobile }) => {
  test.skip(isMobile, "lien de navigation dans le menu desktop");
  await page.goto("/");
  await page.waitForFunction(() => Array.isArray((window as { dataLayer?: unknown[] }).dataLayer));
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
