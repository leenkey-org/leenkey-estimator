import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";

// Security of every page and limits of requests per address (L1-38). The
// address of a request is the one the platform gives (x-real-ip): on the
// local stack the test sends it, a new one each run (a window lasts an hour).
// On the preprod, Vercel puts the real one, that of the machine of the tests,
// which would be held back an hour: the limits are tested on the local stack
// only (E2E_MUTATE=1).

const local = process.env.E2E_SEED === "1" && process.env.E2E_MUTATE === "1";
const LOCAL_ONLY = "pile locale requise (E2E_SEED=1, E2E_MUTATE=1)";

/** An address of the documentation range, new at each run (its own /64). */
const address = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;

test("les en-têtes de sécurité de chaque page", async ({ request }) => {
  for (const path of ["/", "/acheter", "/connexion"]) {
    const response = await request.get(path);
    const headers = response.headers();
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["strict-transport-security"], path).toMatch(/^max-age=\d+$/);
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"], path).toContain("camera=()");
  }
});

test("le formulaire de contact : 5 messages par heure et par adresse", async ({ request }) => {
  test.skip(!local, LOCAL_ONLY);
  const from = address();
  const statuses: number[] = [];
  for (let n = 0; n < 6; n += 1) {
    const response = await request.post("/api/contact", {
      headers: { "x-real-ip": from },
      data: {
        source: "contact",
        data: { name: "Test", email: "test@example.com", message: "Bonjour" },
      },
    });
    statuses.push(response.status());
  }
  expect(statuses.slice(0, 5)).not.toContain(429);
  expect(statuses.at(5)).toBe(429);
  const refused = await request.post("/api/contact", {
    headers: { "x-real-ip": from },
    data: { source: "contact", data: { name: "Test", email: "test@example.com" } },
  });
  expect(refused.status()).toBe(429);
  expect(((await refused.json()) as { error: string }).error).toContain("Réessayez plus tard");
  // Another address is not held back.
  const other = await request.post("/api/contact", {
    headers: { "x-real-ip": address() },
    data: {
      source: "contact",
      data: { name: "Test", email: "test@example.com", message: "Bonjour" },
    },
  });
  expect(other.status()).not.toBe(429);
});

test("mot de passe oublié : au-delà de 5 demandes par heure, « Trop de tentatives »", async ({
  page,
}) => {
  test.skip(!local, LOCAL_ONLY);
  await page.setExtraHTTPHeaders({ "x-real-ip": address() });
  await page.goto("/mot-de-passe-oublie");
  for (let n = 0; n < 5; n += 1) {
    await page.getByLabel("Email").fill(`personne-${n}@example.com`);
    await page.getByRole("button", { name: /Envoyer/ }).click();
    // The answer of the request first, then the next one.
    await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();
    await page.goto("/mot-de-passe-oublie");
  }
  await page.getByLabel("Email").fill("personne-6@example.com");
  await page.getByRole("button", { name: /Envoyer/ }).click();
  await expect(page.getByText("Trop de tentatives. Réessayez plus tard.")).toBeVisible();
});
