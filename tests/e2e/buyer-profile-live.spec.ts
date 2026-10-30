import { expect, test, type Page } from "@playwright/test";

// L1-25: a buyer declares their project; their file moves to « Informations
// déclarées » and their seller sees it, never the amounts. buyer_d (David)
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

const DAVID_WITH_ALICE = "/messages/5eed2000-0000-4000-8000-000000000012";

/** Signs a seed account in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, account: "seller_a" | "buyer_d", path: string) {
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
      file.getByRole("heading", { name: "Votre dossier acquéreur : 0 étape sur 2 faite" }),
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

  await test.step("son dossier est complet : en fin d'accueil, pour le modifier", async () => {
    await buyer.goto("/acquereur");
    const file = buyer.getByRole("region", {
      name: "Votre dossier fait la différence auprès des vendeurs",
    });
    await expect(
      file.getByRole("heading", { name: "Votre dossier acquéreur : 2 étapes sur 2 faites" }),
    ).toBeVisible();
    await expect(file.getByRole("link", { name: "Modifier mon projet" })).toBeVisible();
  });

  await test.step("son vendeur voit « Informations déclarées », jamais les montants", async () => {
    await signIn(seller, "seller_a", DAVID_WITH_ALICE);
    await expect(seller.getByText("Avec David · Informations déclarées")).toBeVisible();
    await expect(seller.locator("body")).not.toContainText(/\b(300|40|260)\s?000\b/);
  });

  await sellerContext.close();
});
