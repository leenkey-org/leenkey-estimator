import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import Stripe from "stripe";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { consentValue } from "./google";

// L1-26: the plan of a property and its payment (SPEC-V2 8.8 and 11), on the
// seed, with Stripe simulated (STRIPE_MOCK=1, core/billing/stripe.ts): the
// page goes to the success address as Stripe would after a payment, and the
// test signs and posts the event Stripe would send (STRIPE_WEBHOOK_SECRET of
// the local stack). Stripe advises against driving its hosted page in tests.
// The payment changes the seed for good (LK-0009 of seller_b becomes
// Accompagné, then Sérénité, then is refunded back to Accompagné): this file
// runs only on a local stack just made by `scripts/local-stack.sh up`, with
// E2E_SEED=1, SEED_PASSWORD and E2E_MUTATE=1, never on the preprod (project
// « seed-mutations »). Read only: LK-0003 of seller_a. The page and its
// summary, without paying, are in billing-page.spec.ts (mobile and desktop).

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack || !SECRET,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, STRIPE_WEBHOOK_SECRET) : la spec paie une formule",
);
test.describe.configure({ mode: "serial" });

const LK0009 = "5eed1000-0000-4000-8000-000000000009";
const LK0003 = "5eed1000-0000-4000-8000-000000000003";
const planPage = (id: string) => `/vendeur/formule?bien=${id}`;

const signer = new Stripe("sk_test_signature_only");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";

async function signIn(page: Page, account: "seller_a" | "seller_b" | "admin", path: string) {
  await page.context().addCookies([{ name: "lk_consent", value: consentValue(false), url: BASE }]);
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
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

type MockSession = {
  id: string;
  amountTotal: number;
  metadata: Record<string, string>;
};

/** The buyer of the plans of this file. */
const SELLER_EMAIL = "seller_b@test.leenkey.fr";

/** The session the simulated Stripe put in the success address. */
function sessionOf(page: Page): MockSession {
  const encoded = new URL(page.url()).searchParams.get("mock_session");
  if (!encoded) throw new Error(`no mock_session in ${page.url()}`);
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MockSession;
}

/** Posts an event as Stripe would, signed with the secret of the stack. */
async function postEvent(page: Page, event: Record<string, unknown>, secret = SECRET ?? "") {
  const payload = JSON.stringify(event);
  const header = signer.webhooks.generateTestHeaderString({ payload, secret });
  return page.request.post("/api/webhooks/stripe", {
    data: payload,
    headers: { "content-type": "application/json", "stripe-signature": header },
  });
}

function checkoutCompleted(session: MockSession, eventId: string) {
  return {
    id: eventId,
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
        customer_email: SELLER_EMAIL,
        customer_details: { email: SELLER_EMAIL },
      },
    },
  };
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test("payer Accompagné : retour de Stripe, confirmation par le webhook, une seule activation", async ({
  page,
}) => {
  await signIn(page, "seller_b", planPage(LK0009));
  const plans = page.getByRole("list", { name: "Choisir ma formule" });
  await plans.getByRole("button", { name: "Choisir Accompagné" }).click();
  const recap = page.getByRole("region", { name: "Récapitulatif de votre commande" });
  await recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ }).check();
  await recap.getByRole("button", { name: "Commander et payer 990 € TTC" }).click();

  // Back from (simulated) Stripe: nothing is active before the webhook.
  await page.waitForURL(/paiement=ok/);
  await expect(
    page.getByRole("heading", { name: "Paiement en cours de confirmation" }),
  ).toBeVisible();
  const session = sessionOf(page);
  expect(session.metadata).toMatchObject({
    property_id: LK0009,
    plan: "accompagne",
    kind: "new",
    early_start: "0",
    cgu_version: LEGAL_VERSIONS.cgu,
    cgv_version: "2026-10-17",
    env: "local",
  });
  // Never the email of the seller in the address.
  expect(page.url()).not.toContain("seller_b");
  expect(session.amountTotal).toBe(99000);

  // A forged event is refused.
  expect(
    (await postEvent(page, checkoutCompleted(session, "evt_e2e_forged"), "whsec_wrong")).status(),
  ).toBe(400);
  const event = checkoutCompleted(session, `evt_e2e_${session.id}`);
  const first = await postEvent(page, event);
  expect(first.status()).toBe(200);
  expect(await first.json()).toMatchObject({ outcome: "processed" });
  // Stripe sends an event again: nothing more happens.
  expect(await (await postEvent(page, event)).json()).toMatchObject({ outcome: "duplicate" });

  await expect(page.getByRole("heading", { name: "C'est activé." })).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText(
      /Votre formule Accompagné est active\. Votre conseiller Leenkey vous contacte à partir du /,
    ),
  ).toBeVisible();
  await expectNoSeriousViolation(page);

  // The page of the plans: Accompagné in force, Sérénité for the difference.
  await page.goto(planPage(LK0009));
  const plansAfter = page.getByRole("list", { name: "Choisir ma formule" });
  await expect(
    plansAfter.getByRole("listitem").filter({ hasText: "Accompagné" }).first(),
  ).toContainText("Formule actuelle");
  await expect(
    plansAfter.getByRole("button", { name: "Passer à Sérénité pour 510 €" }),
  ).toBeVisible();

  // The seller's bell says it.
  await page.goto(`/vendeur?bien=${LK0009}`);
  await page
    .getByRole("button", { name: /^Notifications/ })
    .locator("visible=true")
    .first()
    .click();
  await expect(page.getByText("Formule Accompagné activée").first()).toBeVisible();
});

test("passer à Sérénité avec démarrage immédiat, puis un remboursement ramène Accompagné", async ({
  page,
}) => {
  await signIn(page, "seller_b", planPage(LK0009));
  await page
    .getByRole("list", { name: "Choisir ma formule" })
    .getByRole("button", { name: "Passer à Sérénité pour 510 €" })
    .click();
  const recap = page.getByRole("region", { name: "Récapitulatif de votre commande" });
  await recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ }).check();
  await recap.getByRole("checkbox", { name: /commencent avant la fin du délai/ }).check();
  await recap.getByRole("button", { name: "Commander et payer 510 € TTC" }).click();
  await page.waitForURL(/paiement=ok/);
  const session = sessionOf(page);
  expect(session.metadata).toMatchObject({ plan: "serenite", kind: "upgrade", early_start: "1" });
  expect(session.amountTotal).toBe(51000);
  expect(
    await (await postEvent(page, checkoutCompleted(session, `evt_e2e_${session.id}`))).json(),
  ).toMatchObject({
    outcome: "processed",
  });
  await expect(
    page.getByText(
      "Votre formule Sérénité est active. Votre conseiller Leenkey vous contacte sous 24 h.",
    ),
  ).toBeVisible({ timeout: 10_000 });

  await page.goto(planPage(LK0009));
  const plans = page.getByRole("list", { name: "Choisir ma formule" });
  await expect(plans.getByRole("listitem").filter({ hasText: "Sérénité" }).first()).toContainText(
    "Formule actuelle",
  );
  await expect(plans.getByText("Comprise dans votre formule")).toBeVisible();

  // Cédric refunds the upgrade in Stripe: Accompagné is in force again.
  const refund = await postEvent(page, {
    id: `evt_e2e_refund_${session.id}`,
    object: "event",
    type: "charge.refunded",
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: `ch_${session.id}`,
        object: "charge",
        amount: 51000,
        amount_refunded: 51000,
        refunded: true,
        payment_intent: `pi_${session.id}`,
      },
    },
  });
  expect(await refund.json()).toMatchObject({ outcome: "processed" });
  await page.reload();
  await expect(
    page
      .getByRole("list", { name: "Choisir ma formule" })
      .getByRole("listitem")
      .filter({ hasText: "Accompagné" })
      .first(),
  ).toContainText("Formule actuelle");
});

test("deux onglets, deux paiements du même passage : le second est gardé, l'équipe vérifie", async ({
  page,
  browser,
  baseURL,
}) => {
  // LK-0009 is Accompagné again (the refund above). Two tabs open the same
  // passage to Sérénité; both are paid.
  const orderUpgrade = async () => {
    await page.goto(planPage(LK0009));
    await page
      .getByRole("list", { name: "Choisir ma formule" })
      .getByRole("button", { name: "Passer à Sérénité pour 510 €" })
      .click();
    const recap = page.getByRole("region", { name: "Récapitulatif de votre commande" });
    await recap.getByRole("checkbox", { name: /J'ai lu et j'accepte/ }).check();
    await recap.getByRole("button", { name: "Commander et payer 510 € TTC" }).click();
    await page.waitForURL(/paiement=ok/);
    return sessionOf(page);
  };
  await signIn(page, "seller_b", planPage(LK0009));
  const first = await orderUpgrade();
  const second = await orderUpgrade();
  expect(second.id).not.toBe(first.id);

  expect(
    await (await postEvent(page, checkoutCompleted(first, `evt_e2e_${first.id}`))).json(),
  ).toMatchObject({ outcome: "processed" });
  expect(
    await (await postEvent(page, checkoutCompleted(second, `evt_e2e_${second.id}`))).json(),
  ).toMatchObject({ outcome: "processed" });
  // The page of the second payment: received, not activated a second time.
  await expect(page.getByRole("heading", { name: "Paiement reçu" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(/l'équipe Leenkey vous écrit sous 24/)).toBeVisible();
  await expectNoSeriousViolation(page);

  await page.goto(planPage(LK0009));
  await expect(
    page
      .getByRole("list", { name: "Choisir ma formule" })
      .getByRole("listitem")
      .filter({ hasText: "Sérénité" })
      .first(),
  ).toContainText("Formule actuelle");

  // The team sees it in its bell.
  const context = await browser.newContext({ baseURL });
  const admin = await context.newPage();
  await signIn(admin, "admin", "/admin");
  await admin
    .getByRole("button", { name: /^Notifications/ })
    .locator("visible=true")
    .first()
    .click();
  await expect(admin.getByText("Paiement à vérifier").first()).toBeVisible();
  await context.close();
});

test("retour après annulation, et un événement d'un autre produit est ignoré", async ({ page }) => {
  await signIn(page, "seller_a", `${planPage(LK0003)}&paiement=annule`);
  await expect(page.getByText("Le paiement a été annulé : rien n'a été débité.")).toBeVisible();
  const ignored = await postEvent(page, {
    id: "evt_e2e_other",
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "cs_other",
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        metadata: {},
      },
    },
  });
  expect(await ignored.json()).toMatchObject({ outcome: "ignored" });
});
