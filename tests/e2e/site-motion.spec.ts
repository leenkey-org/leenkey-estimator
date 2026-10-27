import { expect, test, type Page } from "@playwright/test";

// L1-45: the motion of the public pages (DESIGN.md 9, DECISIONS 2026-10-20),
// after the V1 home page; the home page of direction C since 2026-10-26. What is on the screen on arrival is never hidden;
// what is below it waits (data-reveal-pending), then rises into place when it
// enters the screen; nothing stays hidden at the end of the page. With
// reduced motion, or without JavaScript, nothing ever waits.

/** Visible elements still waiting to rise into place. */
const waiting = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("[data-reveal-pending]")].filter((element) =>
        element.checkVisibility(),
      ).length,
  );

const opacity = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).opacity);

/** Down to the end of the page, step by step (instantly: the page scrolls smoothly otherwise). */
async function scrollToEnd(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
    }
  });
}

test.describe("mouvement des pages publiques", () => {
  test.use({ reducedMotion: "no-preference" });

  test("ce qui est sous l'écran monte en place quand il y entre, rien ne reste caché", async ({
    page,
  }) => {
    await page.goto("/");
    // The hero and its search card, on the screen on arrival: never hidden.
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText(
      "Vendez votre bien autrement. Moins de frais, plus de contrôle.",
    );
    await expect(page.locator("[data-reveal-pending]:has(h1)")).toHaveCount(0);
    await expect(page.locator("[data-reveal-pending]:has([role=tablist])")).toHaveCount(0);
    // The title of the questions, far below: waiting, transparent.
    const faq = page.locator("#questions");
    await expect(faq).toHaveAttribute("data-reveal-pending", "");
    expect(await opacity(page, "#questions")).toBe("0");
    await faq.scrollIntoViewIfNeeded();
    await expect(faq).toHaveAttribute("data-revealed", "");
    await expect.poll(() => opacity(page, "#questions")).toBe("1");
    // The cards of a grid, one after the other.
    const steps = page.locator('section[aria-labelledby="etapes"] [data-reveal-stagger] > li');
    await steps.first().scrollIntoViewIfNeeded();
    await expect.poll(() => steps.nth(2).evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    expect(
      await steps.evaluateAll((items) =>
        items.map((item) => parseFloat(getComputedStyle(item).transitionDelay)),
      ),
    ).toEqual([0, 0.08, 0.16]);
    await scrollToEnd(page);
    expect(await waiting(page)).toBe(0);
    // The halos of the last banner breathe (redesign D); the orbs behind the
    // simulator, there with the plans of the database, float.
    const animations = await page
      .locator("[data-shape]")
      .evaluateAll((all) => all.map((shape) => getComputedStyle(shape).animationName));
    expect(animations).toEqual(expect.arrayContaining(["lk-glow"]));
    if (animations.length > 3) expect(animations).toEqual(expect.arrayContaining(["lk-float"]));
    // A link of a section that has risen works as before.
    await page.getByRole("link", { name: "Toutes les questions" }).click();
    await expect(page).toHaveURL("/faq");
  });

  for (const path of ["/concept", "/tarifs", "/faq", "/investir", "/qui-sommes-nous", "/contact"]) {
    test(`${path} : ses sections montent en place, rien ne reste caché`, async ({ page }) => {
      await page.goto(path);
      await scrollToEnd(page);
      expect(await waiting(page)).toBe(0);
      await expect(page.locator("[data-revealed]").first()).toBeAttached();
    });
  }
});

test.describe("moins de mouvement", () => {
  test.use({ reducedMotion: "reduce" });

  test("rien n'attend, rien ne bouge", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // No animation waits for its delay, whatever the delays set on the page;
    // the shapes behind the sections stay still.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const shapes = page.locator("[data-shape]");
    await expect(shapes.first()).toBeAttached();
    expect(
      await shapes.evaluateAll(
        (all) => all.filter((shape) => getComputedStyle(shape).animationName !== "none").length,
      ),
    ).toBe(0);
    expect(
      await page.evaluate(() =>
        document
          .getAnimations()
          .map((animation) => animation.effect?.getComputedTiming().delay ?? 0)
          .filter((delay) => delay > 0),
      ),
    ).toEqual([]);
    await page.waitForLoadState("load");
    expect(await waiting(page)).toBe(0);
    await expect(page.locator("[data-reveal-pending]")).toHaveCount(0);
    expect(await opacity(page, "#questions")).toBe("1");
  });
});

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false, reducedMotion: "no-preference" });

  test("toute la page est là", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-reveal-pending]")).toHaveCount(0);
    expect(await opacity(page, "#questions")).toBe("1");
    await expect(
      page.getByRole("heading", { name: "Prêt à garder les clés de votre vente ?" }),
    ).toBeVisible();
  });
});
