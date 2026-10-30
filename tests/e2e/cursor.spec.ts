import { expect, test } from "@playwright/test";

// The hand on everything that can be clicked (Younes, 2026-10-30, app/globals.css):
// the buttons, tabs, radios, checkboxes and switches of the pages shown
// without an account, the text fields keeping their cursor. A disabled or
// busy control keeps its own (forbidden, progress).

const CLICKABLE =
  'button, summary, [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"]';

for (const path of ["/", "/acheter", "/estimer", "/connexion", "/inscription"]) {
  test(`${path} : la main sur ce qui se clique, pas sur les champs`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { wrong, clickable, fields } = await page.evaluate((selector) => {
      const visible = (element: Element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== "hidden";
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
      const inputs = [
        ...document.querySelectorAll(
          'input[type="text"], input[type="email"], input:not([type]), textarea',
        ),
      ].filter(visible);
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
    }, CLICKABLE);
    expect(clickable, `${path}: clickable controls found`).toBeGreaterThan(0);
    expect(wrong, `${path}: ${fields} field(s) checked too`).toEqual([]);
  });
}
