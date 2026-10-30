import { expect, test } from "@playwright/test";

// The hand on everything that can be clicked (Younes, 2026-10-30, app/globals.css):
// the buttons, tabs, radios, checkboxes, switches, selects, options and menu
// items of the pages shown without an account, every field typed into keeping
// its cursor; then a menu opened, and a disabled control.

const CLICKABLE =
  'button, summary, select, [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], [role="option"], [role="menuitem"]';
/** Every field typed into: text, email, password, number, search, phone, and text areas. */
const FIELDS =
  'input:not([type="checkbox"], [type="radio"], [type="file"], [type="range"], [type="submit"], [type="button"], [type="hidden"]), textarea';

for (const path of ["/", "/acheter", "/estimer", "/connexion", "/inscription"]) {
  test(`${path} : la main sur ce qui se clique, pas sur les champs`, async ({ page }) => {
    // The rule is in the CSS of the page: its load is enough (never networkidle:
    // the photos may keep the network busy, PR #47).
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    const { wrong, clickable, fields } = await page.evaluate(
      ([selector, fieldSelector]) => {
        const visible = (element: Element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== "hidden"
          );
        };
        const controls = [...document.querySelectorAll(selector)].filter(
          (element) =>
            visible(element) &&
            !(element as HTMLButtonElement).disabled &&
            element.getAttribute("aria-disabled") !== "true" &&
            !element.hasAttribute("data-disabled") &&
            element.getAttribute("aria-busy") !== "true",
        );
        const name = (element: Element) =>
          `${element.tagName.toLowerCase()}[${element.getAttribute("role") ?? ""}] « ${(
            element.getAttribute("aria-label") ??
            element.textContent ??
            ""
          )
            .trim()
            .slice(0, 40)} »`;
        const inputs = [...document.querySelectorAll(fieldSelector)].filter(visible);
        return {
          clickable: controls.length,
          wrong: [
            ...controls
              .filter((element) => getComputedStyle(element).cursor !== "pointer")
              .map((element) => `${name(element)}: ${getComputedStyle(element).cursor}`),
            ...inputs
              .filter((element) => getComputedStyle(element).cursor === "pointer")
              .map((element) => `${name(element)}: pointer on a field`),
          ],
          fields: inputs.length,
        };
      },
      [CLICKABLE, FIELDS],
    );
    expect(clickable, `${path}: clickable controls found`).toBeGreaterThan(0);
    if (path === "/connexion")
      expect(fields, `${path}: email and password checked`).toBeGreaterThan(1);
    expect(wrong, `${path}: ${fields} field(s) checked too`).toEqual([]);
  });
}

test("un bouton désactivé, quelles que soient ses classes : le curseur interdit", async ({
  page,
}) => {
  await page.goto("/");
  const cursor = await page.evaluate(() => {
    const button = document.createElement("button");
    button.disabled = true;
    button.textContent = "Désactivé";
    document.body.append(button);
    const value = getComputedStyle(button).cursor;
    button.remove();
    return value;
  });
  expect(cursor).toBe("not-allowed");
});

test("/design : la main sur les choix d'un menu ouvert", async ({ page }) => {
  test.skip(process.env.NEXT_PUBLIC_ENV === "production", "catalogue absent en production");
  await page.goto("/design");
  const trigger = page
    .getByRole("main")
    .getByRole("button", { name: /^Trier par/ })
    .first();
  await trigger.click();
  const choices = page.getByRole("menuitemradio");
  await expect(choices.first()).toBeVisible();
  const cursors = await choices.evaluateAll((items) =>
    items.map((item) => getComputedStyle(item).cursor),
  );
  expect(cursors.length).toBeGreaterThan(1);
  expect(new Set(cursors)).toEqual(new Set(["pointer"]));
});
