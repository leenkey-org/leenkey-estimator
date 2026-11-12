import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import Stripe from "stripe";

// L1-32: the mandatory journeys of SPEC-V2 section 22, end to end, each
// one following the last on the same accounts (the other specs check each
// screen in detail; these check that the screens follow one another):
//   1. Seller: sign-up, a complete property, sent for review, validated by
//      the team, found in the search.
//   2. Buyer: filtered search, the listing, sign-up, financing declared, a
//      message to the seller, who answers with a suggestion of the
//      assistant (deterministic model, AI_MOCK=1).
//   3. Payment: the seller orders Sérénité, Stripe simulated (STRIPE_MOCK=1),
//      the webhook activates it, the team finds the case.
//   7. Permissions: another seller and the buyer are refused the property
//      and the conversation. Documents, offers and visits come with lots 2
//      and 3 (their part of the journey with them).
// New accounts and a new listing each run, with real emails (Mailpit): only
// on a local stack just made by `scripts/local-stack.sh up`, with
// E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, AI_MOCK=1 and the variables of
// `scripts/local-stack.sh env` (project « seed-mutations »).

const SEED_PASSWORD = process.env.SEED_PASSWORD;
const MAILPIT_URL = process.env.MAILPIT_URL;
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const ready =
  process.env.E2E_SEED === "1" &&
  process.env.E2E_MUTATE === "1" &&
  process.env.AI_MOCK === "1" &&
  process.env.STRIPE_MOCK === "1" &&
  Boolean(SEED_PASSWORD && MAILPIT_URL && SECRET) &&
  ["localhost", "127.0.0.1"].includes(
    new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
  );

test.skip(
  !ready,
  "pile locale requise (E2E_SEED, E2E_MUTATE, AI_MOCK, STRIPE_MOCK, SEED_PASSWORD, MAILPIT_URL, STRIPE_WEBHOOK_SECRET)",
);
// Each journey starts where the one before it ended.
test.describe.configure({ mode: "serial" });

const run = Date.now().toString(36);
const PASSWORD = "Maison-91-Parcours";
const seller = { name: "Sophie Parcours", email: `sophie.${run}@exemple.test` };
const buyer = { name: "Hugo Parcours", email: `hugo.${run}@exemple.test` };
const title = `Appartement parcours ${run}`;
/** What each journey leaves to the next ones. */
const state = { propertyId: "", reference: "", conversation: "" };

const MOCK_REPLY =
  "Bonjour, merci pour votre message. Je vérifie ce point et je reviens vers vous rapidement avec une réponse précise.";

function consentCookie(baseURL: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  return { name: "lk_consent", value: `v1.0.${day}`, url: baseURL };
}

async function openBrowser(browser: Browser, baseURL: string, phone: boolean): Promise<Page> {
  const context = await browser.newContext(
    phone
      ? { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, baseURL }
      : { viewport: { width: 1280, height: 900 }, baseURL },
  );
  await context.addCookies([consentCookie(baseURL)]);
  return context.newPage();
}

/** The link of the confirmation email, from the catcher of the local stack. */
async function confirmationLink(to: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const query = `to:"${to}" subject:"Confirmez votre adresse email"`;
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(query)}`);
    const { messages } = (await search.json()) as { messages?: Array<{ ID: string }> };
    if (messages?.length) {
      const message = (await (
        await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)
      ).json()) as { HTML: string };
      const href = message.HTML.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no confirmation email for ${to}`);
}

/** Signs an account up from the page it is on, then confirms its address. */
async function signUp(page: Page, account: { name: string; email: string }) {
  await page.getByLabel("Prénom et nom").fill(account.name);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();
  await page.goto(await confirmationLink(account.email));
  await page.getByRole("button", { name: "Confirmer mon adresse" }).click();
  await page.waitForURL((url) => url.pathname !== "/confirmation");
}

async function signIn(page: Page, email: string, password: string, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  await page.goto(path);
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page
      .waitForURL((url) => url.pathname !== "/conditions", { timeout: 5_000 })
      .catch(() => {});
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

/** The card of the listing of these journeys in the results of a search. */
const resultOf = (page: Page) =>
  page
    .getByRole("list", { name: "Résultats" })
    .locator(`a[href$="-${state.reference.replace("-", "").toLowerCase()}"]:visible`)
    .first();

const thread = (page: Page) => page.getByRole("log", { name: "Messages de la conversation" });

test("parcours 1, vendeur : inscription, bien complet, validation par l'équipe, annonce trouvée", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "";
  const page = await openBrowser(browser, base, true);

  await test.step("inscription d'un vendeur depuis le téléphone", async () => {
    await page.goto(`/inscription?next=${encodeURIComponent("/vendeur/biens/nouveau")}`);
    await page.getByText("Je vends").click();
    await signUp(page, seller);
    await expect(page).toHaveURL("/vendeur/biens/nouveau");
  });

  await test.step("le bien : adresse, caractéristiques et DPE repris de l'ADEME", async () => {
    const next = page.getByRole("button", { name: "Continuer" });
    await next.click();
    await page.getByRole("combobox", { name: "Adresse du bien" }).fill("12 rue de la gare");
    await page.getByRole("option", { name: /12 Rue de la Gare/ }).click();
    await next.click();
    await expect(page).toHaveURL(/\/vendeur\/biens\/[0-9a-f-]{36}\/caracteristiques$/);
    state.propertyId = new URL(page.url()).pathname.split("/")[3];
    await page.getByLabel("Type de bien").selectOption("appartement");
    await page.getByLabel("Surface habitable").fill("71");
    await page.getByLabel("Pièces", { exact: true }).fill("3");
    const energy = page.getByRole("group", {
      name: "Diagnostic de performance énergétique (DPE)",
    });
    await energy.getByLabel("Numéro du DPE").fill("2491E0000001A");
    await energy.getByRole("button", { name: "Récupérer les informations de mon DPE" }).click();
    await expect(energy.getByText(/^Repris du registre de l'ADEME/)).toBeVisible();
    await energy.getByLabel("Année des prix").selectOption("2023");
    const costs = energy.getByRole("group", { name: "Dépenses annuelles d'énergie" });
    await costs.getByLabel("Minimum").fill("900");
    await costs.getByLabel("Maximum").fill("1300");
    await next.click();
    await expect(page).toHaveURL(`/vendeur/biens/${state.propertyId}/prix`);
  });

  await test.step("l'annonce : titre, prix, description, aperçu, envoi en validation", async () => {
    await page.getByLabel("Titre de l'annonce").fill(title);
    await page.getByLabel("Prix de vente").fill("259 000");
    await page
      .getByRole("textbox", { name: "Description" })
      .fill("Trois pièces lumineux au calme, à cinq minutes de la gare d'Épinay-sur-Orge.");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page).toHaveURL(`/vendeur/biens/${state.propertyId}/apercu`);
    await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
    await page.getByRole("button", { name: "Envoyer en validation" }).click();
    await expect(page).toHaveURL(`/vendeur/biens/${state.propertyId}/envoye`);
    await expect(page.getByRole("heading", { level: 1, name: "C'est envoyé." })).toBeVisible();
  });

  await test.step("l'équipe la valide et la publie", async () => {
    const admin = await openBrowser(browser, base, false);
    await signIn(
      admin,
      "admin@test.leenkey.fr",
      SEED_PASSWORD ?? "",
      "/admin/annonces?statut=a-valider",
    );
    const row = admin
      .getByRole("table", { name: "Annonces" })
      .locator("tbody")
      .filter({ hasText: title });
    await expect(row).toHaveCount(1);
    state.reference = /LK-\d+/.exec(await row.innerText())?.[0] ?? "";
    expect(state.reference).toMatch(/^LK-\d+$/);
    await admin
      .getByRole("group", { name: `Décisions sur l'annonce ${state.reference}` })
      .getByRole("button", { name: "Valider et publier" })
      .click();
    await expect(admin.getByRole("status").filter({ hasText: "Annonce publiée." })).toBeVisible();
    await admin.context().close();
  });

  await test.step("un visiteur la trouve dans la recherche", async () => {
    const visitor = await openBrowser(browser, base, false);
    await visitor.goto("/acheter?ville=epinay-sur-orge&type=appartement");
    // A card is named by the property (« Appartement 3 p · 71 m² »); its address ends with the reference.
    const card = resultOf(visitor);
    await expect(card).toBeVisible();
    await card.click();
    await expect(visitor.getByRole("heading", { level: 1 })).toContainText(title);
    // Its address carries the reference; the page shows its price and description.
    expect(visitor.url()).toMatch(
      new RegExp(`-${state.reference.replace("-", "").toLowerCase()}$`),
    );
    await expect(visitor.getByText("Trois pièces lumineux au calme").first()).toBeVisible();
    await visitor.context().close();
  });

  await page.context().close();
});

test("parcours 2, acquéreur : recherche, annonce, inscription, financement, message, réponse suggérée", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  test.skip(!state.propertyId, "suit le parcours 1");
  const base = baseURL ?? "";
  const page = await openBrowser(browser, base, false);
  const message = `Bonjour, l'appartement est-il toujours disponible ? (${run})`;

  await test.step("recherche filtrée, puis l'annonce", async () => {
    await page.goto("/acheter?ville=epinay-sur-orge&type=appartement&budget_max=300000");
    await resultOf(page).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
  });

  await test.step("« Contacter le vendeur » passe par l'inscription d'un acquéreur", async () => {
    await page
      .getByRole("complementary")
      .getByRole("link", { name: "Contacter le vendeur" })
      .click();
    await expect(page).toHaveURL(/\/inscription\?/);
    await signUp(page, buyer);
    await expect(page).toHaveURL(/\/messages\/nouveau\?annonce=[0-9a-f-]{36}$/);
  });
  const firstMessage = page.url();

  await test.step("il déclare son projet et son financement", async () => {
    await page.goto("/acquereur/profil");
    await page.getByRole("radio", { name: "Résidence principale" }).click();
    await page.getByLabel("Villes recherchées").fill("Épinay-sur-Orge");
    await page.getByLabel("Budget maximum").fill("280 000");
    await page.getByLabel("Apport personnel").fill("30000");
    await page.getByRole("radio", { name: "Avec prêt" }).click();
    await page.getByLabel("Montant du prêt").fill("250 000");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Votre projet est enregistré.")).toBeVisible();
    await expect(page.getByRole("status").getByText("Informations déclarées")).toBeVisible();
  });

  await test.step("son premier message au vendeur", async () => {
    await page.goto(firstMessage);
    await page.getByRole("textbox", { name: "Votre message" }).fill(message);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
    state.conversation = new URL(page.url()).pathname;
    await expect(thread(page).getByText(message)).toBeVisible();
  });

  await test.step("le vendeur répond avec la suggestion de l'assistant", async () => {
    const owner = await openBrowser(browser, base, true);
    await signIn(owner, seller.email, PASSWORD, state.conversation);
    await expect(thread(owner).getByText(message)).toBeVisible();
    // Their buyer's file: what was declared, never the amounts.
    await expect(owner.getByText("Informations déclarées").first()).toBeVisible();
    await expect(owner.getByText(/250\s000/)).toHaveCount(0);
    const box = owner.getByRole("region", { name: "Réponse suggérée par l'assistant" });
    await expect(async () => {
      await owner.getByRole("button", { name: "Suggérer une réponse" }).click();
      await expect(box).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await box.getByRole("button", { name: "Utiliser" }).click();
    await owner.getByRole("button", { name: "Envoyer" }).click();
    await expect(thread(owner).getByText(MOCK_REPLY)).toBeVisible();
    await expectNoSeriousViolation(owner);
    await owner.context().close();
  });

  await test.step("l'acquéreur reçoit la réponse sans recharger", async () => {
    await expect(thread(page).getByText(MOCK_REPLY)).toBeVisible({ timeout: 15_000 });
  });

  await page.context().close();
});

test("parcours 3, paiement : Sérénité commandée, activée par le webhook, dossier côté équipe", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  test.skip(!state.reference, "suit le parcours 1");
  const base = baseURL ?? "";
  const page = await openBrowser(browser, base, false);
  const planPage = `/vendeur/formule?bien=${state.propertyId}`;

  await test.step("le vendeur commande Sérénité", async () => {
    await signIn(page, seller.email, PASSWORD, planPage);
    await page
      .getByRole("list", { name: "Choisir ma formule" })
      .getByRole("button", { name: "Choisir Sérénité" })
      .click();
    const recap = page.getByRole("region", { name: "Récapitulatif de votre commande" });
    await recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ }).check();
    await recap.getByRole("button", { name: "Commander et payer 1 500 € TTC" }).click();
    await page.waitForURL(/paiement=ok/);
    await expect(
      page.getByRole("heading", { name: "Paiement en cours de confirmation" }),
    ).toBeVisible();
  });

  await test.step("le webhook de Stripe active la formule", async () => {
    const encoded = new URL(page.url()).searchParams.get("mock_session") ?? "";
    const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      id: string;
      amountTotal: number;
      metadata: Record<string, string>;
    };
    expect(session.metadata).toMatchObject({ property_id: state.propertyId, plan: "serenite" });
    expect(session.amountTotal).toBe(150_000);
    const payload = JSON.stringify({
      id: `evt_journey_${session.id}`,
      object: "event",
      type: "checkout.session.completed",
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: session.id,
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          status: "complete",
          amount_total: session.amountTotal,
          total_details: { amount_discount: 0 },
          metadata: session.metadata,
          payment_intent: `pi_${session.id}`,
          customer_email: seller.email,
          customer_details: { email: seller.email },
        },
      },
    });
    const header = new Stripe("sk_test_signature_only").webhooks.generateTestHeaderString({
      payload,
      secret: SECRET ?? "",
    });
    const response = await page.request.post("/api/webhooks/stripe", {
      data: payload,
      headers: { "content-type": "application/json", "stripe-signature": header },
    });
    expect(response.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "C'est activé." })).toBeVisible({
      timeout: 10_000,
    });
  });

  await test.step("son conseiller apparaît dans « Ma vente »", async () => {
    await page.goto(`/vendeur?bien=${state.propertyId}`);
    const adviser = page.getByRole("region", { name: "Mon conseiller Leenkey" });
    await expect(adviser.getByRole("link", { name: "Écrire à mon conseiller" })).toBeVisible();
    await expect(adviser.getByText("Accessible avec la formule Accompagné")).toHaveCount(0);
  });

  await test.step("l'équipe trouve le dossier de la formule", async () => {
    const admin = await openBrowser(browser, base, false);
    await signIn(
      admin,
      "admin@test.leenkey.fr",
      SEED_PASSWORD ?? "",
      `/admin/dossiers?q=${state.reference}`,
    );
    const row = admin
      .getByRole("table", { name: "Dossiers" })
      .locator("tbody tr")
      .filter({ hasText: "Formule Sérénité souscrite" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(state.reference);
    await admin.context().close();
  });

  await page.context().close();
});

test("parcours 7, permissions : un autre vendeur et l'acquéreur sont refusés", async ({
  browser,
  baseURL,
}) => {
  test.skip(!state.conversation, "suit les parcours 1 et 2");
  const base = baseURL ?? "";

  await test.step("seller_b : ni le bien, ni ses étapes, ni la conversation", async () => {
    const other = await openBrowser(browser, base, false);
    await signIn(other, "seller_b@test.leenkey.fr", SEED_PASSWORD ?? "", "/vendeur");
    for (const path of [
      `/vendeur/biens/${state.propertyId}`,
      `/vendeur/biens/${state.propertyId}/caracteristiques`,
      `/vendeur/biens/${state.propertyId}/apercu`,
      state.conversation,
    ]) {
      expect((await other.goto(path))?.status(), path).toBe(404);
    }
    // « Ma vente » of another seller's property: their own sale, never this one.
    await other.goto(`/vendeur?bien=${state.propertyId}`);
    await expect(other.getByText(title)).toHaveCount(0);
    await other.context().close();
  });

  await test.step("l'acquéreur : ni le bien du vendeur, ni ses étapes", async () => {
    const page = await openBrowser(browser, base, false);
    await signIn(page, buyer.email, PASSWORD, "/acquereur");
    for (const path of [
      `/vendeur/biens/${state.propertyId}`,
      `/vendeur/biens/${state.propertyId}/prix`,
    ]) {
      const response = await page.goto(path);
      // No seller space for a buyer, or no such property for them.
      expect(
        response?.status() === 404 || !new URL(page.url()).pathname.startsWith("/vendeur/biens"),
        path,
      ).toBe(true);
      await expect(page.getByText(title)).toHaveCount(0);
    }
    await page.context().close();
  });
});
