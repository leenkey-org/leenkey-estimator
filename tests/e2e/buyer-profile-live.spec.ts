import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-25: a buyer declares their project; their file moves to « Informations
// déclarées » and their seller sees it, never the amounts. L2-02: he files a
// proof of financing (« Justificatif fourni »), the team checks it
// (« Justificatif vérifié »), his seller sees the status, never the file.
// buyer_d (David)
// has declared nothing in the seed; once saved, his project stays: this spec
// changes the seed for good (project « seed-mutations », after auth-journey
// has shown him the terms gate). Needs E2E_SEED=1, SEED_PASSWORD,
// E2E_MUTATE=1 and a local stack.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec enregistre un projet",
);

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
}

const DAVID_WITH_ALICE = "/messages/5eed2000-0000-4000-8000-000000000012";

/** Signs a seed account in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, account: "seller_a" | "buyer_d" | "admin", path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  await page.goto(path);
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL((url) => url.pathname !== "/conditions");
    if (new URL(page.url()).pathname !== new URL(path, page.url()).pathname) await page.goto(path);
  }
  await expect(page).toHaveURL(path);
}

test("un acquéreur déclare son projet ; son vendeur voit le statut, pas les montants", async ({
  page: buyer,
  browser,
  baseURL,
}) => {
  const url = baseURL ?? "http://localhost:3100";
  // The seller in a browser of their own, cookies already answered.
  const sellerContext = await browser.newContext({ baseURL: url });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  await sellerContext.addCookies([{ name: "lk_consent", value: `v1.0.${day}`, url }]);
  const seller = await sellerContext.newPage();

  await test.step("un dossier vide : en tête de l'accueil, à compléter", async () => {
    await signIn(buyer, "buyer_d", "/acquereur");
    const file = buyer.getByRole("region", {
      name: "Votre dossier fait la différence auprès des vendeurs",
    });
    await expect(
      file.getByRole("heading", { name: "Votre dossier acquéreur : 0 étape sur 3 faite" }),
    ).toBeVisible();
    await expect(file.getByText("Financement non renseigné")).toBeVisible();
    const order = await buyer
      .locator("main section[aria-labelledby]")
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("aria-labelledby")),
      );
    expect(order.indexOf("dossier")).toBeLessThan(order.indexOf("favoris"));
    await file.getByRole("link", { name: "Compléter mon dossier" }).click();
    await expect(buyer).toHaveURL("/acquereur/profil");
  });

  await test.step("il déclare son projet et son financement", async () => {
    await expect(buyer.getByRole("status").getByText("Financement non renseigné")).toBeVisible();
    // No proof before the project is declared: the team compares the two.
    await expect(
      buyer.getByText(/^Renseignez d'abord votre projet, votre budget, votre apport/),
    ).toBeVisible();
    await expect(buyer.getByRole("button", { name: "Déposer le justificatif" })).toHaveCount(0);
    // A typing error first: said on the field, the focus on it.
    await buyer.getByLabel("Budget maximum").fill("300 000,50");
    await buyer.getByRole("button", { name: "Enregistrer" }).click();
    await expect(buyer.getByLabel("Budget maximum")).toBeFocused();
    await expect(buyer.getByText("Indiquez un montant en euros, sans centimes.")).toBeVisible();

    await buyer.getByRole("radio", { name: "Résidence principale" }).click();
    await buyer.getByLabel("Villes recherchées").fill("Juvisy-sur-Orge, Savigny-sur-Orge");
    await buyer.getByLabel("Budget maximum").fill("300 000");
    await buyer.getByLabel("Apport personnel").fill("40000");
    await buyer.getByRole("radio", { name: "Avec prêt" }).click();
    await buyer.getByLabel("Montant du prêt").fill("260 000");
    await buyer.getByRole("button", { name: "Enregistrer" }).click();
    await expect(buyer.getByText("Votre projet est enregistré.")).toBeVisible();
    await expect(buyer.getByRole("status").getByText("Informations déclarées")).toBeVisible();

    await buyer.reload();
    await expect(buyer.getByLabel("Villes recherchées")).toHaveValue(
      "Juvisy-sur-Orge, Savigny-sur-Orge",
    );
    await expect(buyer.getByLabel("Apport personnel")).toHaveValue(/^40\s000$/);
    await expect(buyer.getByLabel("Montant du prêt")).toHaveValue(/^260\s000$/);
  });

  await test.step("son dossier attend encore son justificatif (L2-02)", async () => {
    await buyer.goto("/acquereur");
    const file = buyer.getByRole("region", {
      name: "Votre dossier fait la différence auprès des vendeurs",
    });
    await expect(
      file.getByRole("heading", { name: "Votre dossier acquéreur : 2 étapes sur 3 faites" }),
    ).toBeVisible();
    await expect(file.getByRole("link", { name: "Compléter mon dossier" })).toBeVisible();
  });

  await test.step("son vendeur voit « Informations déclarées », jamais les montants", async () => {
    await signIn(seller, "seller_a", DAVID_WITH_ALICE);
    await expect(seller.getByText("Avec David · Informations déclarées")).toBeVisible();
    await expect(seller.locator("body")).not.toContainText(/\b(300|40|260)\s?000\b/);
  });

  let documentHref = "";
  await test.step("il dépose son justificatif : « Justificatif fourni »", async () => {
    await buyer.goto("/acquereur/profil");
    const proof = buyer.getByRole("region", { name: "Justificatif de financement" });
    await expect(
      proof.getByText(/^Justificatifs acceptés : accord de principe bancaire/),
    ).toBeVisible();
    // Nothing chosen: each field says what is missing.
    await proof.getByRole("button", { name: "Déposer le justificatif" }).click();
    await expect(proof.getByText("Choisissez le type du justificatif.")).toBeVisible();
    await expect(proof.getByText("Choisissez un fichier.")).toBeVisible();

    await proof.getByLabel("Type de justificatif").selectOption("simulation_bancaire");
    // A document of last year: said old, never refused.
    const old = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10);
    await proof.getByLabel("Date du document").fill(old);
    await expect(proof.getByText(/^Ce document a plus de 3 mois/)).toBeVisible();
    await proof.getByLabel("Fichier").setInputFiles({
      name: "Simulation Banque (David).pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF\n",
      ),
    });
    await proof.getByRole("button", { name: "Déposer le justificatif" }).click();
    await expect(buyer.locator(":focus")).toHaveText(
      "Votre justificatif est déposé. Votre dossier passe à « Justificatif fourni ».",
    );
    await expect(
      proof.getByText("Simulation ou offre bancaire nominative", { exact: true }),
    ).toBeVisible();
    await expect(proof.getByText(/^Justificatif fourni\. Nous le contrôlons/)).toBeVisible();
    await expect(
      buyer.getByRole("status").getByText("Justificatif fourni", { exact: true }),
    ).toBeVisible();
    await expect(await seriousViolations(buyer)).toEqual([]);

    // His file opens for him: the PDF itself, under a new name (never the one chosen).
    documentHref =
      (await proof.getByRole("link", { name: "Voir le document (PDF)" }).getAttribute("href")) ??
      "";
    expect(documentHref).toMatch(/^\/documents\/financement\/[0-9a-f-]{36}$/);
    const opened = await buyer.request.get(documentHref);
    expect(opened.status()).toBe(200);
    expect(opened.url()).not.toContain("David");
    expect((await opened.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  await test.step("son vendeur voit « Justificatif fourni », jamais le fichier", async () => {
    await seller.goto(DAVID_WITH_ALICE);
    await expect(seller.getByText("Avec David · Justificatif fourni")).toBeVisible();
    expect((await seller.request.get(documentHref)).status()).toBe(404);
  });

  await test.step("l'équipe le contrôle : « Justificatif vérifié »", async () => {
    const adminContext = await browser.newContext({ baseURL: url });
    await adminContext.addCookies([{ name: "lk_consent", value: `v1.0.${day}`, url }]);
    const admin = await adminContext.newPage();
    await signIn(admin, "admin", "/admin");
    await admin
      .getByRole("link", { name: /Justificatif de financement à contrôler/ })
      .filter({ hasText: "David" })
      .click();
    await expect(admin).toHaveURL(/\/admin\/utilisateurs\/[0-9a-f-]{36}#justificatif$/);
    const proof = admin.getByRole("region", { name: "Justificatif de financement" });
    await expect(
      proof.getByText("Simulation ou offre bancaire nominative · En vigueur"),
    ).toBeVisible();
    await expect(proof.getByText("Document de plus de 3 mois")).toBeVisible();
    await expect(proof.getByRole("link", { name: "Ouvrir le fichier" })).toHaveAttribute(
      "href",
      documentHref,
    );
    expect((await admin.request.get(documentHref)).status()).toBe(200);
    await proof
      .getByLabel("Note interne")
      .fill("Simulation au nom de David, cohérente avec son projet.");
    await proof.getByRole("button", { name: "Marquer le justificatif comme vérifié" }).click();
    await expect(admin.locator(":focus")).toHaveText("Justificatif marqué comme vérifié.");
    await expect(proof.getByText(/^Contrôlé le .* par /)).toBeVisible();
    await expect(
      proof.getByText("Simulation au nom de David, cohérente avec son projet."),
    ).toBeVisible();
    await expect(
      proof.getByRole("button", { name: "Marquer le justificatif comme vérifié" }),
    ).toHaveCount(0);
    await expect(await seriousViolations(admin)).toEqual([]);
    await adminContext.close();
  });

  await test.step("l'acquéreur et son vendeur le voient vérifié ; la note reste à l'équipe", async () => {
    await buyer.reload();
    const proof = buyer.getByRole("region", { name: "Justificatif de financement" });
    await expect(proof.getByText(/^Contrôlé par Leenkey le /)).toBeVisible();
    await expect(
      buyer.getByRole("status").getByText("Justificatif vérifié", { exact: true }),
    ).toBeVisible();
    await expect(buyer.locator("body")).not.toContainText("cohérente avec son projet");
    await buyer.goto("/acquereur");
    await expect(
      buyer.getByRole("heading", { name: "Votre dossier acquéreur : 3 étapes sur 3 faites" }),
    ).toBeVisible();

    await seller.reload();
    await expect(seller.getByText("Avec David · Justificatif vérifié")).toBeVisible();
    await expect(seller.locator("body")).not.toContainText(/validé/i);
  });

  await sellerContext.close();
});
