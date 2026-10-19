import { expect, test } from "@playwright/test";

// L1-21: without a session, « Contacter le vendeur » and « Demander une
// visite » of a listing lead to the sign-up of a buyer, then to the first
// message (SPEC-V2 8.5, 8.6). Read only, on the seed listing LK-0001
// (E2E_SEED=1); the exchanges between two browsers are in
// messaging-live.spec.ts.

const seeded = process.env.E2E_SEED === "1";

test.skip(!seeded, "annonces du seed requises (E2E_SEED=1)");

const LK0001 = "/annonce/appartement-3-pieces-savigny-sur-orge-lk0001";

test("« Contacter le vendeur » et « Demander une visite » passent par l'inscription", async ({
  page,
  isMobile,
}) => {
  await page.goto(LK0001);
  const zone = isMobile ? page : page.getByRole("complementary");
  const contact = zone.getByRole("link", { name: "Contacter le vendeur" });
  const visit = zone.getByRole("link", { name: "Demander une visite" });
  const next = async (link: typeof contact) => {
    const href = (await link.getAttribute("href")) ?? "";
    const params = new URL(href, "http://localhost").searchParams;
    expect(href.startsWith("/inscription?")).toBe(true);
    expect(params.get("role")).toBe("buyer");
    return params.get("next") ?? "";
  };
  expect(await next(contact)).toMatch(/^\/messages\/nouveau\?annonce=[0-9a-f-]{36}$/);
  expect(await next(visit)).toMatch(/^\/messages\/nouveau\?annonce=[0-9a-f-]{36}&visite=1$/);
  if (!isMobile) {
    await expect(
      zone.getByText("Un compte acquéreur est nécessaire pour contacter le vendeur"),
    ).toBeVisible();
  }

  // The page of the first message asks for a session.
  await page.goto(await next(contact));
  await expect(page).toHaveURL(/\/connexion\?next=%2Fmessages%2Fnouveau/);
});
