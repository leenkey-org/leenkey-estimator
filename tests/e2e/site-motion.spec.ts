import { expect, test, type Page } from "@playwright/test";

// L1-45: the motion of the public pages (DESIGN.md 9, DECISIONS 2026-10-20),
// after the V1 home page. What is on the screen on arrival is never hidden;
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
    // The hero, on the screen on arrival: never hidden, its words rise.
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText("Leenkey vous donne les clés de votre vente.");
    await expect(page.locator("#valoriser [data-reveal-pending]")).toHaveCount(0);
    // The title of the questions, far below: waiting, transparent.
    const faq = page.locator("#faq [data-reveal]").first();
    await expect(faq).toHaveAttribute("data-reveal-pending", "");
    expect(await opacity(page, "#faq [data-reveal]")).toBe("0");
    await faq.scrollIntoViewIfNeeded();
    await expect(faq).toHaveAttribute("data-revealed", "");
    await expect.poll(() => opacity(page, "#faq [data-reveal]")).toBe("1");
    // The cards of a grid, one after the other.
    const steps = page.locator("#comment [data-reveal-stagger] > li");
    await steps.first().scrollIntoViewIfNeeded();
    await expect.poll(() => steps.nth(2).evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    expect(
      await steps.evaluateAll((items) =>
        items.map((item) => parseFloat(getComputedStyle(item).transitionDelay)),
      ),
    ).toEqual([0, 0.08, 0.16]);
    await scrollToEnd(page);
    expect(await waiting(page)).toBe(0);
    // A link of a section that has risen works as before.
    await page.getByRole("link", { name: "Toutes les questions" }).click();
    await expect(page).toHaveURL("/faq");
  });

  test("une autre page du site : ses sections montent en place aussi", async ({ page }) => {
    await page.goto("/concept");
    await scrollToEnd(page);
    expect(await waiting(page)).toBe(0);
    await expect(page.locator("[data-revealed]").first()).toBeAttached();
  });
});

test.describe("moins de mouvement", () => {
  test.use({ reducedMotion: "reduce" });

  test("rien n'attend, rien ne bouge", async ({ page }) => {
    await page.goto("/");
    expect(await waiting(page)).toBe(0);
    await expect(page.locator("[data-reveal-pending]")).toHaveCount(0);
    expect(await opacity(page, "#faq [data-reveal]")).toBe("1");
    // The words of the hero are in place at once.
    const word = page.getByRole("heading", { level: 1 }).locator(".lk-rise").first();
    expect(await word.evaluate((el) => getComputedStyle(el).animationDuration)).toBe("0.001s");
  });
});

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false, reducedMotion: "no-preference" });

  test("toute la page est là", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-reveal-pending]")).toHaveCount(0);
    expect(await opacity(page, "#faq [data-reveal]")).toBe("1");
    await expect(page.getByRole("heading", { name: "Parlons-en ensemble." })).toBeVisible();
  });
});
