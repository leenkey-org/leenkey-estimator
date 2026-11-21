import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import {
  AlertDigestEmail,
  SimilarListingsEmail,
  alertDigestSubject,
  similarListingsSubject,
} from "@/emails/alert-digest";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";

// L3-06 (SPEC-V2 16 and 18): the emails of the alerts. The digest: the
// listings with their public facts and their links, the search of each alert
// that matched, the way to manage the alerts and the notification settings.
// The similar listings after a sale.

const SITE = "https://leenkey-v2.vercel.app";
const listings = [
  {
    title: "Maison 5 pièces avec jardin",
    city: "Savigny-sur-Orge",
    price: "389 000 €",
    facts: "110 m² · 5 pièces",
    url: `${SITE}/annonce/maison-5-pieces-lk0042`,
  },
  {
    title: null,
    city: "Épinay-sur-Orge",
    price: "245 000 €",
    facts: "62 m² · 3 pièces",
    url: `${SITE}/annonce/appartement-3-pieces-lk0043`,
  },
];

describe("alert digest email", () => {
  it("lists the listings, the searches of the alerts and the way to manage them", async () => {
    const element = AlertDigestEmail({
      firstName: "Chloé",
      listings,
      total: 8,
      alerts: [
        { name: "Savigny maison", count: 5, url: `${SITE}/acheter?ville=savigny-sur-orge` },
        { name: "Épinay", count: 4, url: `${SITE}/acheter?ville=epinay-sur-orge` },
      ],
      alertsUrl: `${SITE}/acquereur/alertes`,
      siteUrl: SITE,
    });
    const html = await render(element);
    const text = await render(element, EMAIL_PLAIN_TEXT);
    expect(alertDigestSubject(8)).toBe("8\u00A0nouveaux biens correspondent à vos alertes");
    expect(alertDigestSubject(1)).toBe("Un nouveau bien correspond à vos alertes");
    expect(text).toContain("Bonjour Chloé,");
    expect(text).toContain("Maison 5 pièces avec jardin · Savigny-sur-Orge");
    expect(text).toContain("389 000 € · 110 m² · 5 pièces");
    // More listings than shown: said.
    expect(text).toContain("Voici les 2 plus récents.");
    for (const listing of listings) expect(html).toContain(listing.url);
    expect(html).toContain(`${SITE}/acheter?ville=savigny-sur-orge`);
    expect(html).toContain(`${SITE}/acheter?ville=epinay-sur-orge`);
    expect(text).toContain("Savigny maison (5\u00A0nouveaux biens)");
    // Several alerts: the button leads to the alerts; the footer to the settings.
    expect(html).toContain(`${SITE}/acquereur/alertes`);
    expect(html).toContain(`${SITE}/compte/notifications`);
    expect(text).toContain(
      "Vous recevez cet email parce que vous avez créé une alerte sur Leenkey.",
    );
    // The voice of Leenkey (CLAUDE.md section 16).
    expect(text).not.toMatch(/\bon\b/i);
  });

  it("one alert: the button opens its search", async () => {
    const text = await render(
      AlertDigestEmail({
        firstName: null,
        listings: listings.slice(0, 1),
        total: 1,
        alerts: [{ name: "Savigny", count: 1, url: `${SITE}/acheter?ville=savigny-sur-orge` }],
        alertsUrl: `${SITE}/acquereur/alertes`,
        siteUrl: SITE,
      }),
      EMAIL_PLAIN_TEXT,
    );
    expect(text).toContain("Bonjour,");
    expect(text).toContain("Voir tous les biens");
    expect(text).not.toContain("plus récents");
  });
});

describe("similar listings email", () => {
  it("says which listing is sold and shows the similar ones", async () => {
    const element = SimilarListingsEmail({
      firstName: "David",
      soldTitle: "Maison au calme",
      city: "Savigny-sur-Orge",
      listings,
      searchUrl: `${SITE}/acheter?ville=savigny-sur-orge`,
      alertsUrl: `${SITE}/acquereur/alertes`,
      siteUrl: SITE,
    });
    const text = await render(element, EMAIL_PLAIN_TEXT);
    expect(similarListingsSubject("Savigny-sur-Orge")).toBe(
      "Des biens similaires à Savigny-sur-Orge",
    );
    expect(text).toContain("Le bien «\u00A0Maison au calme\u00A0» à Savigny-sur-Orge");
    expect(text).toContain("est vendu");
    expect(text).toContain("Gérer mes alertes");
    expect(await render(element)).toContain(`${SITE}/annonce/maison-5-pieces-lk0042`);
  });
});
