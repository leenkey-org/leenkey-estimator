import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-44: the valuation wizard and its result in Façade (docs/DESIGN.md 13.1),
// with the logic and the words of the V1 (the engine has its own regression
// tests): Sora only (charte D, L1-58), no emoji (DESIGN.md 1), no serious accessibility
// violation, in mobile and desktop. The result is restored from this
// browser, as after a reload.

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Contrast on the final rendering: the steps and the cards fade in.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
  expect(serious).toEqual([]);
}

/** The texts of the page, without emoji nor an arrow at the end of a button. */
async function expectNoEmoji(page: Page) {
  expect(await page.getByRole("main").innerText()).not.toMatch(/\p{Extended_Pictographic}/u);
  for (const label of await page.getByRole("main").getByRole("button").allInnerTexts())
    expect(label.trim()).not.toMatch(/→$/);
}

/** The families of the fonts of the page: Sora (next/font, charte D since L1-58) and its fallback only. */
const SITE_FONTS = ["Sora", "Sora Fallback"];

async function fontFamilies(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() =>
    [...new Set([...document.fonts].map((font) => font.family.replace(/["']/g, "")))].sort(),
  );
}

async function restoreResult(page: Page) {
  await page.goto("/");
  await page.evaluate(() =>
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
          prenom: "",
          email: "marie@example.com",
          telephone: "0612345678",
          disponibilites: [],
        },
        submitted: { ref: "EST-2026-12345" },
      }),
    ),
  );
  await page.goto("/estimer");
}

test("le wizard est en Sora, sans police de la V1, et sans violation sérieuse", async ({
  page,
}) => {
  await page.goto("/estimer");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText("Quel type de bien souhaitez-vous vendre ?");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "8");
  expect(await fontFamilies(page)).toEqual(SITE_FONTS);
  expect(await title.evaluate((node) => getComputedStyle(node).fontFamily)).toMatch(/^"?Sora/);
  await expectNoEmoji(page);
  await expectNoSeriousViolation(page);

  // A choice says it is chosen, then the next step.
  const flat = page.getByRole("button", { name: /^Appartement\b/ });
  await flat.click();
  await expect(flat).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText(/^Étape 2 sur \d+/)).toBeVisible();
  await expectNoSeriousViolation(page);

  // Without an address: the field is focused, in danger, and says why.
  await page.getByRole("button", { name: "Continuer" }).click();
  const address = page.getByLabel(/^Adresse/);
  await expect(address).toBeFocused();
  await expect(address).toHaveAttribute("aria-invalid", "true");
  await expect(address).toHaveAccessibleDescription("L'adresse est requise");
  // Once its colour transition is over.
  await expect
    .poll(() => address.evaluate((node) => getComputedStyle(node).borderTopColor))
    .toBe("rgb(185, 28, 28)");
  expect(await address.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe("none");
  await expectNoSeriousViolation(page);

  // The home page loads no V1 font either.
  await page.goto("/");
  expect(await fontFamilies(page)).toEqual(SITE_FONTS);
});

test("le résultat, et la demande de rappel par un conseiller au clavier", async ({
  page,
  isMobile,
}) => {
  // The request waits until the test lets it go: the dialog is seen sending.
  let sent: { source?: string; data?: Record<string, string> } = {};
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/contact", async (route) => {
    sent = route.request().postDataJSON();
    await released;
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await restoreResult(page);
  // Without a first name: « Bonjour, voici… », not « Bonjour , voici… ».
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Bonjour, voici la valeur estimée de votre bien",
  );
  await expectNoEmoji(page);
  await expectNoSeriousViolation(page);

  // Opened from the keyboard, it keeps the focus inside; Échap closes it and
  // the focus comes back to its button.
  const open = page.getByRole("button", { name: "Prendre contact avec un conseiller" });
  await open.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Prendre contact avec un conseiller" });
  await expect(dialog).toBeVisible();
  const first = dialog.getByRole("button", { name: isMobile ? "Retour" : "Fermer" });
  const send = dialog.getByRole("button", { name: "Envoyer ma demande" });
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(send).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await expect(dialog.getByLabel("Quand préférez-vous être contacté ?")).toHaveValue(
    "Dès que possible",
  );
  await expectNoSeriousViolation(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();

  // While it is sent, the dialog stays; once sent, it says so, then closes.
  await page.keyboard.press("Enter");
  await dialog.getByLabel("Votre message (optionnel)").fill("Je vends au printemps.");
  await send.click();
  await expect(dialog.getByRole("button", { name: "Envoi…" })).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  release();
  await expect(page.getByRole("dialog", { name: "Demande envoyée !" })).toBeVisible({
    timeout: 15_000,
  });
  expect(sent.source).toBe("rappel-conseiller");
  expect(sent.data?.message).toBe("Je vends au printemps.");
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });
  await expect(open).toBeFocused();
});

test("les coordonnées : la case de consentement et sa politique de confidentialité", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "leenkey_form_v1",
      JSON.stringify({ form: { type: "appartement" }, step: 12 }),
    ),
  );
  await page.goto("/estimer");
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect(page.getByText(/^Étape 12 sur 12/)).toBeVisible();
  const consent = page.getByRole("checkbox", { name: /^J'accepte que Leenkey utilise/ });
  await expect(consent).not.toBeChecked();
  // The policy opens beside the form (it led nowhere in the V1).
  const policy = page.getByRole("link", { name: "politique de confidentialité" });
  await expect(policy).toHaveAttribute("href", "/confidentialite");
  await expect(policy).toHaveAttribute("target", "_blank");
  await consent.check();
  await expect(consent).toBeChecked();
  await expectNoEmoji(page);
  await expectNoSeriousViolation(page);
});

test("les boutons d'une question sont groupés sous son libellé", async ({ page }) => {
  const openStep = async (step: number) => {
    await page.goto("/");
    await page.evaluate(
      (at) =>
        localStorage.setItem(
          "leenkey_form_v1",
          JSON.stringify({ form: { type: "appartement" }, step: at }),
        ),
      step,
    );
    await page.goto("/estimer");
    await page.getByRole("button", { name: "Reprendre", exact: true }).click();
    await expect(page.getByText(new RegExp(`^Étape ${step} sur `))).toBeVisible();
  };
  // A text field is named by its label, not grouped.
  await openStep(3);
  await expect(page.getByRole("spinbutton", { name: /^Surface loi Carrez/ })).toBeVisible();
  await expect(page.getByRole("group", { name: /^Surface loi Carrez/ })).toHaveCount(0);
  // Numbers: a group named by the question.
  await openStep(4);
  const bedrooms = page.getByRole("group", { name: /^Nombre de chambres/ });
  const two = bedrooms.getByRole("button", { name: "2", exact: true });
  await two.click();
  await expect(two).toHaveAttribute("aria-pressed", "true");
});
