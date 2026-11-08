import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";

// Security of every page and limits of requests per address (L1-38). The
// address of a request is the one the platform gives (x-real-ip): on the
// local stack the test sends it, a new one each run (a window lasts an hour).

const seeded = process.env.E2E_SEED === "1";

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
  test.skip(!seeded, "pile locale requise (E2E_SEED=1)");
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
  test.skip(!seeded, "pile locale requise (E2E_SEED=1)");
  await page.setExtraHTTPHeaders({ "x-real-ip": address() });
  await page.goto("/mot-de-passe-oublie");
  for (let n = 0; n < 5; n += 1) {
    await page.getByLabel("Email").fill(`personne-${n}@example.com`);
    await page.getByRole("button", { name: /Envoyer/ }).click();
    await expect(page.getByText("Trop de tentatives")).toHaveCount(0);
    await page.goto("/mot-de-passe-oublie");
  }
  await page.getByLabel("Email").fill("personne-6@example.com");
  await page.getByRole("button", { name: /Envoyer/ }).click();
  await expect(
    page.getByText("Trop de tentatives. Réessayez dans quelques minutes."),
  ).toBeVisible();
});
