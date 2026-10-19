import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-44: the valuation wizard and its result in Façade (docs/DESIGN.md 13.1),
// with the logic and the words of the V1 (the engine has its own regression
// tests): Archivo only, no emoji (DESIGN.md 1), no serious accessibility
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

/** The families of the fonts of the page: Archivo (next/font) and its fallback only. */
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

test("le wizard est en Archivo, sans police de la V1, et sans violation sérieuse", async ({
  page,
}) => {
  await page.goto("/estimer");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText("Quel type de bien souhaitez-vous vendre ?");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "8");
  expect(await fontFamilies(page)).toEqual(["Archivo", "Archivo Fallback"]);
  expect(await title.evaluate((node) => getComputedStyle(node).fontFamily)).toMatch(/^"?Archivo/);
  await expectNoEmoji(page);
  await expectNoSeriousViolation(page);

  // A choice says it is chosen, then the next step.
  const flat = page.getByRole("button", { name: /^Appartement\b/ });
  await flat.click();
  await expect(flat).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText(/^Étape 2 sur \d+/)).toBeVisible();
  await expectNoSeriousViolation(page);

  // The home page loads no V1 font either.
  await page.goto("/");
  expect(await fontFamilies(page)).toEqual(["Archivo", "Archivo Fallback"]);
});

test("le résultat, et la demande de rappel par un conseiller au clavier", async ({
  page,
  isMobile,
}) => {
  let sent: { source?: string; data?: Record<string, string> } = {};
  await page.route("**/api/contact", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await restoreResult(page);
  // Without a first name: « Bonjour, voici… », not « Bonjour , voici… ».
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Bonjour, voici la valeur estimée de votre bien",
  );
  await expectNoEmoji(page);
  await expectNoSeriousViolation(page);

  // Opened, it holds the focus; Échap closes it, the focus comes back.
  const open = page.getByRole("button", { name: "Prendre contact avec un conseiller" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Prendre contact avec un conseiller" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: isMobile ? "Retour" : "Fermer" })).toBeFocused();
  await expect(dialog.getByLabel("Quand préférez-vous être contacté ?")).toHaveValue(
    "Dès que possible",
  );
  await expectNoSeriousViolation(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();

  // Sent: said in the dialog, which then closes by itself.
  await open.click();
  await dialog.getByLabel("Votre message (optionnel)").fill("Je vends au printemps.");
  await dialog.getByRole("button", { name: "Envoyer ma demande" }).click();
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
