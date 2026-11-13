import { describe, expect, it, vi } from "vitest";
import {
  firstStepToFill,
  readIdentity,
  readOffer,
  readPropertySnapshot,
  writeIdentity,
  writeSci,
  type OfferContent,
  type OfferProperty,
  type OfferRow,
} from "@/leenkey/offers/content";
import {
  buildOfferDocument,
  documentTexts,
  formatNumericDateTime,
  formatNumericDay,
} from "@/leenkey/offers/document";
import { formatRate, gapLabel, offerBudget, offerGap } from "@/leenkey/offers/figures";
import { offerFormPath, readOfferFormStep } from "@/leenkey/offers/paths";
import { numberInWordsFr, priceInWordsFr } from "@/leenkey/offers/words";
import { fr } from "@/lib/i18n/fr";
import {
  isValidityInRange,
  issuePaths,
  offerBuyerSchema,
  offerConditionsSchema,
  offerDeclarationsSchema,
  offerFinancingSchema,
  offerPriceSchema,
  offerValiditySchema,
  validityAfterDays,
  validityDays,
} from "@/lib/validations/offer";

vi.mock("server-only", () => ({}));

const NNBSP = " ";
const MINUS = "−";

const IDENTITY = {
  lastName: "Dupont",
  firstName: "Jean",
  birthDate: "1988-03-04",
  addressLine: "12 rue de la Gare",
  postalCode: "91360",
  city: "Épinay-sur-Orge",
  email: "jean.dupont@example.fr",
  phone: "06 12 34 56 78",
};
const NO_SCI = { name: "", status: null, siren: "", seatAddress: "", representative: "" };

const PROPERTY: OfferProperty = {
  listingReference: "LK-00042",
  title: "Appartement 3 pièces lumineux",
  postalCode: "91600",
  city: "Savigny-sur-Orge",
  type: "appartement",
  surfaceM2: 68,
  rooms: 3,
  annexes: ["parking", "cellar"],
  askingPriceCents: 35_000_000,
};

const ROW: OfferRow = {
  id: "8f0c2f0e-6d0b-4a53-9a43-0c1d2e3f4a5b",
  reference: "LK-2026-00012",
  version: 1,
  status: "submitted",
  listing_id: "1b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f8",
  submitted_at: "2026-11-13T13:05:00Z",
  buyer_identity: writeIdentity(IDENTITY),
  co_buyers: [],
  acquisition_mode: "own_name",
  acquisition_mode_other: null,
  sci_details: null,
  property_snapshot: {
    listing_reference: "LK-00042",
    title: "Appartement 3 pièces lumineux",
    address: { postal_code: "91600", city: "Savigny-sur-Orge" },
    type: "appartement",
    surface_m2: 68,
    rooms: 3,
    annexes: ["parking", "cellar"],
    asking_price_cents: 35_000_000,
  },
  price_cents: 33_800_000,
  price_in_words: "trois cent trente-huit mille euros",
  financing_mode: "loan",
  down_payment_cents: 9_000_000,
  loan_amount_cents: 27_500_000,
  loan_duration_years: 25,
  loan_rate_max_pct: 3.85,
  lender_name: "Crédit Exemple",
  financing_progress: "simulation_done",
  financing_progress_other: null,
  condition_prior_sale: true,
  condition_authorization: false,
  condition_other: false,
  conditions_details: "Vente de notre appartement en cours.",
  validity_until: "2026-11-18T13:00:00Z",
  visited: true,
  declarations: {
    accuracy: true,
    price_and_financing_checked: true,
    legal_effects_understood: true,
    info_read: true,
    accepted_at: "2026-11-13T13:05:00Z",
  },
  superseded_by: null,
  expired_at: null,
};

describe("price in words", () => {
  it("writes numbers as the database does (rls_offers.sql)", () => {
    expect(
      [338000, 80, 80000, 200, 201000, 71, 91, 21, 81, 1000, 2200000, 200000000, 1999999].map(
        numberInWordsFr,
      ),
    ).toEqual([
      "trois cent trente-huit mille",
      "quatre-vingts",
      "quatre-vingt mille",
      "deux cents",
      "deux cent un mille",
      "soixante et onze",
      "quatre-vingt-onze",
      "vingt et un",
      "quatre-vingt-un",
      "mille",
      "deux millions deux cent mille",
      "deux cents millions",
      "un million neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf",
    ]);
  });

  it("writes a price in whole euros only", () => {
    expect(priceInWordsFr(33_800_000)).toBe("trois cent trente-huit mille euros");
    expect(priceInWordsFr(100)).toBe("un euro");
    expect(priceInWordsFr(100_000_000)).toBe("un million d'euros");
    expect(priceInWordsFr(33_800_050)).toBeNull();
    expect(priceInWordsFr(0)).toBeNull();
    expect(numberInWordsFr(-1)).toBeNull();
    expect(numberInWordsFr(0)).toBe("zéro");
  });
});

describe("figures beside an offer", () => {
  it("gives the gap to the asking price, neutral", () => {
    const gap = offerGap(33_800_000, 35_000_000);
    expect(gap).toEqual({ amountCents: -1_200_000, percent: -3.4 });
    expect(gap && gapLabel(gap)).toBe(`${MINUS}12${NNBSP}000${NNBSP}€ · ${MINUS}3,4${NNBSP}%`);
    const above = offerGap(35_500_000, 35_000_000);
    expect(above && gapLabel(above)).toBe(`+5${NNBSP}000${NNBSP}€ · +1,4${NNBSP}%`);
    const equal = offerGap(35_000_000, 35_000_000);
    expect(equal && gapLabel(equal)).toBeNull();
    expect(offerGap(35_000_000, 0)).toBeNull();
  });

  it("estimates the budget with indicative costs: 7,5 % old, 2,5 % new (Q3)", () => {
    expect(offerBudget(33_800_000, false)).toEqual({
      rate: 0.075,
      feesCents: 2_535_000,
      totalCents: 36_335_000,
    });
    expect(offerBudget(33_800_000, true).feesCents).toBe(845_000);
    expect(formatRate(0.075)).toBe(`7,5${NNBSP}%`);
  });
});

describe("offer schemas", () => {
  const buyer = {
    identity: IDENTITY,
    coBuyers: [],
    acquisitionMode: "own_name",
    acquisitionModeOther: "",
    sci: NO_SCI,
  };
  const paths = (schema: { safeParse: (input: unknown) => unknown }, input: unknown) => {
    const parsed = schema.safeParse(input) as
      | { success: true }
      | { success: false; error: Parameters<typeof issuePaths>[0] };
    return parsed.success ? [] : issuePaths(parsed.error);
  };

  it("takes a complete buyer and names the fields in error", () => {
    expect(offerBuyerSchema.safeParse(buyer).success).toBe(true);
    expect(
      paths(offerBuyerSchema, {
        ...buyer,
        identity: { ...IDENTITY, lastName: " ", birthDate: "2026-02-31", email: "jean" },
      }),
    ).toEqual(["identity.lastName", "identity.birthDate", "identity.email"]);
    expect(paths(offerBuyerSchema, { ...buyer, coBuyers: [{ ...IDENTITY, phone: "" }] })).toEqual([
      "coBuyers.0.phone",
    ]);
  });

  it("asks for a co-buyer in an indivision, the text of « Autre », the SCI", () => {
    expect(paths(offerBuyerSchema, { ...buyer, acquisitionMode: "joint" })).toEqual(["coBuyers"]);
    expect(paths(offerBuyerSchema, { ...buyer, acquisitionMode: "other" })).toEqual([
      "acquisitionModeOther",
    ]);
    expect(paths(offerBuyerSchema, { ...buyer, acquisitionMode: "sci" })).toEqual([
      "sci.name",
      "sci.status",
      "sci.representative",
    ]);
    const sci = { ...NO_SCI, name: "SCI Les Tilleuls", representative: "Jean Dupont" };
    expect(
      paths(offerBuyerSchema, {
        ...buyer,
        acquisitionMode: "sci",
        sci: { ...sci, status: "registered", siren: "123 456" },
      }),
    ).toEqual(["sci.siren", "sci.seatAddress"]);
    expect(
      offerBuyerSchema.safeParse({
        ...buyer,
        acquisitionMode: "sci",
        sci: { ...sci, status: "in_formation" },
      }).success,
    ).toBe(true);
    expect(
      writeSci({ ...sci, status: "registered", siren: "123 456 789", seatAddress: "1 rue A" }),
    ).toEqual({
      name: "SCI Les Tilleuls",
      status: "registered",
      siren: "123456789",
      seat_address: "1 rue A",
      representative: "Jean Dupont",
    });
  });

  it("takes four co-buyers no more", () => {
    expect(
      paths(offerBuyerSchema, { ...buyer, coBuyers: [IDENTITY, IDENTITY, IDENTITY, IDENTITY] }),
    ).toEqual(["coBuyers"]);
  });

  it("takes a price in whole euros", () => {
    expect(offerPriceSchema.safeParse({ priceEuros: 338000 }).success).toBe(true);
    expect(offerPriceSchema.safeParse({ priceEuros: 0 }).success).toBe(false);
    expect(offerPriceSchema.safeParse({ priceEuros: 338000.5 }).success).toBe(false);
    expect(offerPriceSchema.safeParse({ priceEuros: Number.NaN }).success).toBe(false);
  });

  const loan = {
    mode: "loan",
    downPaymentEuros: 90000,
    loanAmountEuros: 275000,
    loanDurationYears: 25,
    loanRateMaxPct: 3.85,
    lenderName: "",
    progress: "simulation_done",
    progressOther: "",
  };

  it("asks for the loan when there is one, and keeps nothing of it otherwise", () => {
    expect(offerFinancingSchema.safeParse(loan).success).toBe(true);
    expect(
      paths(offerFinancingSchema, {
        ...loan,
        downPaymentEuros: null,
        loanAmountEuros: 0,
        loanDurationYears: 41,
        loanRateMaxPct: 3.855,
        progress: "other",
      }),
    ).toEqual([
      "loanDurationYears",
      "loanRateMaxPct",
      "downPaymentEuros",
      "loanAmountEuros",
      "progressOther",
    ]);
    const cash = offerFinancingSchema.parse({ ...loan, mode: "no_loan" });
    expect(cash).toEqual({
      mode: "no_loan",
      downPaymentEuros: null,
      loanAmountEuros: null,
      loanDurationYears: null,
      loanRateMaxPct: null,
      lenderName: "",
      progress: null,
      progressOther: "",
    });
  });

  it("asks to say the other situation", () => {
    const none = { priorSale: false, authorization: false, other: false, details: "" };
    expect(offerConditionsSchema.safeParse(none).success).toBe(true);
    expect(paths(offerConditionsSchema, { ...none, other: true })).toEqual(["details"]);
    expect(paths(offerConditionsSchema, { ...none, details: "a".repeat(501) })).toEqual([
      "details",
    ]);
  });

  it("takes a validity from 2 to 10 days, with an hour of margin", () => {
    const now = new Date("2026-11-13T13:37:00Z");
    expect(validityAfterDays(5, now)).toBe("2026-11-18T13:00:00.000Z");
    expect(isValidityInRange(validityAfterDays(2, now), now)).toBe(true);
    expect(isValidityInRange(validityAfterDays(10, now), now)).toBe(true);
    expect(isValidityInRange("2026-11-15T12:00:00.000Z", now)).toBe(false);
    expect(isValidityInRange("2026-11-23T15:00:00.000Z", now)).toBe(false);
    expect(
      offerValiditySchema(now).safeParse({ validityUntil: validityAfterDays(5, now) }).success,
    ).toBe(true);
    expect(offerValiditySchema(now).safeParse({ validityUntil: "demain" }).success).toBe(false);
    expect(validityDays("2026-11-18T13:00:00.000Z", now)).toBe(5);
    expect(validityDays(null, now)).toBe(5);
    expect(validityDays("2026-11-13T14:00:00.000Z", now)).toBe(2);
  });

  it("asks for the visit and the four declarations", () => {
    const all = {
      visited: false,
      accuracy: true,
      priceAndFinancingChecked: true,
      legalEffectsUnderstood: true,
      infoRead: true,
    };
    expect(offerDeclarationsSchema.safeParse(all).success).toBe(true);
    expect(paths(offerDeclarationsSchema, { ...all, infoRead: false })).toEqual(["infoRead"]);
    expect(paths(offerDeclarationsSchema, { ...all, visited: null })).toEqual(["visited"]);
  });
});

describe("offer content", () => {
  it("reads what it writes, and the town a seller reads before acceptance", () => {
    expect(readIdentity(writeIdentity(IDENTITY))).toEqual(IDENTITY);
    expect(readIdentity({ last_name: "Dupont", first_name: "Jean", city: "Massy" })).toEqual({
      lastName: "Dupont",
      firstName: "Jean",
      birthDate: "",
      addressLine: "",
      postalCode: "",
      city: "Massy",
      email: "",
      phone: "",
    });
    expect(readPropertySnapshot(ROW.property_snapshot)).toEqual(PROPERTY);
    expect(readPropertySnapshot({})).toBeNull();
  });

  it("opens the steps of a draft one after the other", () => {
    const sent = readOffer(ROW);
    const draft: OfferContent = {
      ...sent,
      status: "draft",
      priceCents: null,
      financingMode: null,
      validityUntil: null,
      visited: null,
      declarations: { ...sent.declarations, accuracy: false },
    };
    expect(firstStepToFill(null)).toBe(1);
    expect(firstStepToFill({ ...draft, buyer: { ...draft.buyer, phone: "" } })).toBe(1);
    expect(firstStepToFill(draft)).toBe(3);
    expect(firstStepToFill({ ...draft, priceCents: 33_800_000 })).toBe(4);
    const financed = { ...draft, priceCents: 33_800_000, financingMode: "loan" as const };
    expect(firstStepToFill(financed)).toBe(6);
    const valid = { ...financed, validityUntil: sent.validityUntil };
    expect(firstStepToFill(valid)).toBe(7);
    expect(firstStepToFill({ ...valid, visited: true })).toBe(7);
    expect(firstStepToFill({ ...sent, status: "draft" })).toBe(8);
  });

  it("names the steps in the address of the form", () => {
    const listing = "1b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f8";
    expect(offerFormPath(listing)).toBe(`/offres/nouvelle?listing=${listing}`);
    expect(offerFormPath(listing, 3)).toBe(`/offres/nouvelle?listing=${listing}&etape=3`);
    expect(offerFormPath(listing, "review")).toBe(
      `/offres/nouvelle?listing=${listing}&etape=relecture`,
    );
    expect(readOfferFormStep("relecture")).toBe("review");
    expect(readOfferFormStep("7")).toBe(7);
    expect(readOfferFormStep("8")).toBeNull();
    expect(readOfferFormStep(undefined)).toBeNull();
  });
});

describe("offer document", () => {
  const offer = readOffer(ROW);
  const document = buildOfferDocument(offer, PROPERTY);
  const texts = documentTexts(document);
  const all = texts.join("\n");

  it("has the title, the reference, the version, the date of issue", () => {
    expect(document.title).toBe("OFFRE D'ACHAT LEENKEY");
    expect(document.meta).toEqual([
      "Référence de l'offre : LK-2026-00012",
      "Version : 1",
      "Date et heure d'émission : 13/11/2026 à 14:05",
    ]);
    expect(document.footer).toBe("LK-2026-00012 · version 1");
  });

  it("has the seven sections of the model of Cédric, in their order", () => {
    expect(document.sections.map((section) => `${section.number}. ${section.title}`)).toEqual([
      "1. L'acquéreur",
      "2. Le bien concerné",
      "3. Mon offre",
      "4. Financement de l'acquisition",
      "5. Conditions de l'offre",
      "6. Durée de validité",
      "7. Déclaration de l'acquéreur",
    ]);
  });

  it("says the price in figures and in words, the financing declared, the validity", () => {
    expect(texts).toContain(
      "Je soussigné(e) Jean Dupont formule une offre d'achat portant sur le bien désigné ci-dessus au prix de :",
    );
    expect(texts).toContain(`338${NNBSP}000${NNBSP}€`);
    expect(texts).toContain("trois cent trente-huit mille euros");
    expect(texts).toContain(`90${NNBSP}000${NNBSP}€`);
    expect(texts).toContain("25 ans");
    expect(texts).toContain(`3,85${NNBSP}%`);
    expect(texts).toContain("Simulation réalisée");
    expect(texts).toContain("Offre formulée avec recours à un prêt immobilier.");
    expect(texts).toContain("Vente préalable d'un autre bien");
    expect(texts).toContain("La présente offre est valable jusqu'au : 18/11/2026 à 14:00");
    expect(texts).toContain("Je confirme avoir visité le bien");
    expect(texts).toContain("Déclarations acceptées le 13/11/2026 à 14:05.");
    expect(texts).toContain("91600 Savigny-sur-Orge");
    expect(texts).toContain("Parking, Cave");
    expect(texts).toContain("04/03/1988");
    expect(document.notice.title).toBe("Avant d'envoyer votre offre");
    expect(document.notice.paragraphs).toHaveLength(3);
  });

  it("never carries a status of qualification, the gap, the asking price", () => {
    // SPEC-V2 13: the offer is a document, the qualification an analysis of Leenkey.
    expect(all).not.toMatch(/validé|vérifié par|contrôlé|justificatif|qualification/i);
    expect(all).not.toMatch(/écart|prix affiché|prix demandé|analyse/i);
    expect(all).not.toContain(`350${NNBSP}000`);
    expect(all).not.toContain(MINUS);
  });

  it("writes several buyers, an offer without a loan, a draft", () => {
    const joint = buildOfferDocument(
      {
        ...offer,
        coBuyers: [{ ...offer.buyer, firstName: "Marie" }],
        acquisitionMode: "joint",
        financingMode: "no_loan",
        conditionPriorSale: false,
        conditionsDetails: "",
        submittedAt: null,
        priceInWords: null,
        visited: false,
      },
      PROPERTY,
    );
    const jointTexts = documentTexts(joint);
    expect(jointTexts).toContain(
      "Nous soussignés Jean Dupont et Marie Dupont formulons une offre d'achat portant sur le bien désigné ci-dessus au prix de :",
    );
    expect(jointTexts).toContain("Co-acquéreur 1");
    expect(jointTexts).toContain("À deux / indivision");
    expect(jointTexts).toContain("Offre formulée sans recours à un prêt immobilier.");
    expect(jointTexts).toContain("Aucun autre élément signalé.");
    expect(jointTexts).toContain("Je formule mon offre sans visite préalable");
    expect(jointTexts).toContain("Date et heure d'émission : à l'envoi de l'offre");
    // The words come from the code until the database writes them.
    expect(jointTexts).toContain("trois cent trente-huit mille euros");
    expect(jointTexts).not.toContain("Apport personnel");
  });

  it("formats days and times in Paris", () => {
    expect(formatNumericDay("1988-03-04")).toBe("04/03/1988");
    expect(formatNumericDateTime("2026-07-01T16:30:00Z")).toBe("01/07/2026 à 18:30");
  });

  it("draws a PDF", async () => {
    const { renderOfferPdf } = await import("@/leenkey/offers/pdf");
    const pdf = await renderOfferPdf(document);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5000);
  }, 30_000);
});

describe("offer texts", () => {
  it("keeps the texts of the model of Cédric word for word", () => {
    expect(fr.offer.declarations.notice.paragraphs[2]).toBe(
      "Aucun versement n'est demandé ou encaissé par Leenkey au titre de cette offre d'achat.",
    );
    expect(fr.offer.conditions.warning).toMatch(
      /^Attention : les conditions juridiques définitives/,
    );
    expect(fr.offer.review.send).toBe("Envoyer mon offre au vendeur");
    expect(fr.offer.declarations.review).toBe("Relire mon offre");
  });

  it("never says « financement validé » nor « on »", () => {
    const words = JSON.stringify(fr.offer, (_key, value: unknown) =>
      typeof value === "function" ? "" : value,
    );
    expect(words).not.toMatch(/financement validé|validé par/i);
    expect(words).not.toMatch(/\bon\b/i);
    expect(words).not.toMatch(/prix ferme/i);
  });
});
