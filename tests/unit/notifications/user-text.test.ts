import { describe, expect, it } from "vitest";
import { emailSafeText, looksLikeLink } from "@/core/notifications/user-text";

// L1-22: words of a user that a mail client would make a link of stay out of
// the emails of Leenkey (phishing from bonjour@leenkey.fr).

describe("looksLikeLink", () => {
  it.each([
    "Voir https://leenkey-verif.com/compte",
    "http://exemple.fr",
    "rendez-vous sur www.exemple.fr",
    "écrivez-moi : jean.dupont@gmail.com",
    "Mon annonce sur leboncoin.fr",
    "paiement sur exemple.com/payer",
    "Écrivez-moi sur t.me/vendeur_rapide",
    "suivez x.com/abc",
    "g.co/x",
    "a.b.fr",
  ])("« %s » could become a link", (text) => {
    expect(looksLikeLink(text)).toBe(true);
  });

  it.each([
    "Bonjour, je suis intéressé par votre maison.",
    "Prix : 239.000 €, visite samedi à 10 h.",
    "M. Dupont, 3 p. au 2e étage, etc.",
    "Appartement 3 pièces 68 m² · Épinay-sur-Orge",
    "Chloé",
  ])("« %s » stays text", (text) => {
    expect(looksLikeLink(text)).toBe(false);
  });
});

describe("emailSafeText", () => {
  it("keeps plain words, trimmed; leaves out the rest", () => {
    expect(emailSafeText("  Chloé ")).toBe("Chloé");
    expect(emailSafeText("www.piege.fr")).toBeNull();
    expect(emailSafeText("")).toBeNull();
    expect(emailSafeText(42)).toBeNull();
  });
});
