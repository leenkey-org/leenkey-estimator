import { openSync } from "fontkit";
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
import { buildOfferSynthesis, remainingLabel } from "@/leenkey/offers/synthesis";
import { frenchPublicHolidays, withdrawalPeriodEnd } from "@/leenkey/offers/withdrawal";
import { numberInWordsFr, priceInWordsFr } from "@/leenkey/offers/words";
import { fr } from "@/lib/i18n/fr";
import {
  isDrawable,
  isValidityInRange,
  issueKinds,
  issuePaths,
  offerAnswerSchema,
  offerBuyerSchema,
  offerConditionsSchema,
  offerDeclarationsSchema,
  offerFinancingSchema,
  offerPrecontractSchema,
  offerPriceSchema,
  offerValiditySchema,
  parseWholeEuros,
  parseWholeNumber,
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

  it("counts the validity from the days chosen, up to the full hour", () => {
    const now = new Date("2026-11-13T13:37:00Z");
    expect(validityAfterDays(5, now)).toBe("2026-11-18T14:00:00.000Z");
    expect(validityAfterDays(5, new Date("2026-11-13T13:00:00Z"))).toBe("2026-11-18T13:00:00.000Z");
    expect(offerValiditySchema.safeParse({ days: 5 }).success).toBe(true);
    expect(offerValiditySchema.safeParse({ days: 1 }).success).toBe(false);
    expect(offerValiditySchema.safeParse({ days: 11 }).success).toBe(false);
    expect(offerValiditySchema.safeParse({ days: 2.5 }).success).toBe(false);
    expect(validityDays("2026-11-18T14:00:00.000Z", now)).toBe(5);
    expect(validityDays(null, now)).toBe(5);
    expect(validityDays("2026-11-13T14:00:00.000Z", now)).toBe(2);
  });

  it("keeps the hour of margin of the database, whatever the minute of the choice", () => {
    // offer_submit: from now + 2 days - 1 hour to now + 10 days + 1 hour.
    for (const minute of [0, 1, 30, 50, 59]) {
      const chosen = new Date(Date.UTC(2026, 10, 13, 13, minute, 0));
      const hourLater = new Date(chosen.getTime() + 3_600_000);
      for (const days of [2, 10]) {
        const until = validityAfterDays(days, chosen);
        expect(isValidityInRange(until, chosen)).toBe(true);
        // Sent a full hour after the step was saved: still accepted.
        expect(isValidityInRange(until, hourLater)).toBe(true);
      }
    }
    const now = new Date("2026-11-13T13:37:00Z");
    expect(isValidityInRange("2026-11-15T12:00:00.000Z", now)).toBe(false);
    expect(isValidityInRange("2026-11-23T15:00:00.000Z", now)).toBe(false);
  });

  it("reads an amount in whole euros, never thousands as decimals", () => {
    expect(parseWholeEuros("338 000")).toBe(338000);
    expect(parseWholeEuros("338\u202F000")).toBe(338000);
    expect(parseWholeEuros("338000")).toBe(338000);
    expect(parseWholeEuros("338.000")).toBe(338000);
    expect(parseWholeEuros("338,000")).toBe(338000);
    expect(parseWholeEuros("1.250.000")).toBe(1250000);
    expect(parseWholeEuros("")).toBeNull();
    expect(parseWholeEuros("  ")).toBeNull();
    expect(parseWholeEuros("338 000,50")).toBeNaN();
    expect(parseWholeEuros("12,5")).toBeNaN();
    expect(parseWholeEuros("338.00")).toBeNaN();
    expect(parseWholeEuros("abc")).toBeNaN();
    expect(parseWholeEuros("-5")).toBeNaN();
    expect(parseWholeNumber("25")).toBe(25);
    expect(parseWholeNumber("25,5")).toBeNaN();
    expect(parseWholeNumber("")).toBeNull();
  });

  it("takes Latin letters only, and says why a field is refused", () => {
    expect(isDrawable("Łukasz Kovač, Nguyễn Thị Ánh, Ştefan Đorđe — « 12 bis » n° 4 €")).toBe(true);
    expect(isDrawable("Иван")).toBe(false);
    expect(isDrawable("李")).toBe(false);
    expect(isDrawable("Jean 🙂")).toBe(false);
    const parsed = offerBuyerSchema.safeParse({
      ...buyer,
      identity: { ...IDENTITY, lastName: "Иванов", firstName: "a".repeat(81), city: "" },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(issueKinds(parsed.error)).toEqual({
        "identity.lastName": "characters",
        "identity.firstName": "too_long",
        "identity.city": "invalid",
      });
    }
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

  it("has a glyph in its fonts for every letter the form takes", async () => {
    // A name the PDF could not draw would be a wrong identity on the document.
    const { PDF_FONT_FILES } = await import("@/leenkey/offers/pdf");
    const fonts = PDF_FONT_FILES.map((file) => openSync(file));
    const missing: string[] = [];
    for (let code = 0x20; code <= 0x2116; code += 1) {
      const character = String.fromCodePoint(code);
      // The narrow no-break space is replaced before the drawing (pdf.tsx).
      if (code === 0x202f || !isDrawable(character)) continue;
      if (!fonts.some((font) => font.hasGlyphForCodePoint(code))) {
        missing.push(code.toString(16));
      }
    }
    expect(missing).toEqual([]);
    // Sora itself draws French and the usual European names.
    for (const character of "éèêëàâçîïôöùûüÿœæÉÈÀÇŒ«»€’–—…ŁłčšžřńśźćęąőűşţğıČŠŽ") {
      expect(fonts[0].hasGlyphForCodePoint(character.codePointAt(0) ?? 0)).toBe(true);
    }
  });
});

describe("summary for the seller (templates, no model)", () => {
  const offer = readOffer(ROW);
  const input = {
    offer,
    property: PROPERTY,
    financingStatus: "document_checked" as const,
    financingCheckedAt: "2026-09-30T10:00:00Z",
  };

  it("gives the figures of the model of Cédric, in its words", () => {
    expect(buildOfferSynthesis(input)).toEqual({
      askingPriceLabel: `350${NNBSP}000${NNBSP}€`,
      offerPriceLabel: `338${NNBSP}000${NNBSP}€`,
      priceGapLabel: `${MINUS}12${NNBSP}000${NNBSP}€ · ${MINUS}3,4${NNBSP}%`,
      financingDeclared: [
        `Apport : 90${NNBSP}000${NNBSP}€`,
        `Prêt envisagé : 275${NNBSP}000${NNBSP}€`,
      ],
      financingStatus: "document_checked",
      financingLines: ["Document fourni", "Contrôlé par Leenkey le 30/09/2026"],
      conditions: ["Vente préalable d'un autre bien"],
      validityUntil: "2026-11-18T13:00:00Z",
      analysis: [
        `L'offre est inférieure de 3,4${NNBSP}% au prix demandé.`,
        `L'acquéreur déclare financer l'acquisition avec 90${NNBSP}000${NNBSP}€ d'apport et un prêt. Un justificatif de financement a été fourni et contrôlé par Leenkey.`,
        "L'offre mentionne également une vente préalable d'un autre bien.",
        "Avant de prendre votre décision, vérifiez notamment le prix proposé, les modalités de financement et les conditions indiquées.",
      ],
    });
  });

  it("follows the gap, the financing and its proof, the conditions", () => {
    const above = buildOfferSynthesis({
      ...input,
      offer: {
        ...offer,
        priceCents: 35_500_000,
        financingMode: "no_loan",
        conditionPriorSale: false,
      },
      financingStatus: "declared",
      financingCheckedAt: null,
    });
    expect(above.analysis).toEqual([
      `L'offre est supérieure de 1,4${NNBSP}% au prix demandé.`,
      "L'acquéreur déclare financer l'acquisition sans recours à un prêt immobilier. Aucun justificatif de financement n'a été fourni.",
      "Avant de prendre votre décision, vérifiez notamment le prix proposé, les modalités de financement et les conditions indiquées.",
    ]);
    expect(above.financingDeclared).toEqual(["Sans recours à un prêt immobilier"]);
    expect(above.financingLines).toEqual(["Aucun document fourni"]);
    expect(above.conditions).toEqual([]);

    const equal = buildOfferSynthesis({
      ...input,
      offer: {
        ...offer,
        priceCents: 35_000_000,
        downPaymentCents: 0,
        conditionAuthorization: true,
        conditionOther: true,
      },
      financingStatus: "document_provided",
      financingCheckedAt: null,
    });
    expect(equal.priceGapLabel).toBeNull();
    expect(equal.analysis.slice(0, 3)).toEqual([
      "L'offre est égale au prix demandé.",
      "L'acquéreur déclare financer l'acquisition avec un prêt, sans apport. Un justificatif de financement a été fourni ; Leenkey ne l'a pas encore contrôlé.",
      "L'offre mentionne également une vente préalable d'un autre bien, l'obtention d'une autorisation particulière et une autre situation à préciser.",
    ]);
    expect(equal.financingLines).toEqual(["Document fourni"]);
  });

  it("reads a proof checked since the sending as checked, a tiny gap in euros", () => {
    // Sent with « Justificatif fourni », checked by the team an hour later.
    const later = buildOfferSynthesis({
      ...input,
      financingStatus: "document_provided",
      financingCheckedAt: "2026-11-13T15:00:00Z",
    });
    expect(later.financingStatus).toBe("document_checked");
    expect(later.financingLines).toEqual(["Document fourni", "Contrôlé par Leenkey le 13/11/2026"]);
    expect(later.analysis[1]).toContain("fourni et contrôlé par Leenkey");
    expect(JSON.stringify(later)).not.toContain("pas encore contrôlé");

    const close = buildOfferSynthesis({
      ...input,
      offer: { ...offer, priceCents: 34_990_000 },
    });
    expect(close.analysis[0]).toBe(`L'offre est inférieure de 100${NNBSP}€ au prix demandé.`);
  });

  it("never advises to accept or to decline, never says « validé »", () => {
    for (const status of [
      "not_provided",
      "declared",
      "document_provided",
      "document_checked",
    ] as const) {
      const words = JSON.stringify(buildOfferSynthesis({ ...input, financingStatus: status }));
      expect(words).not.toMatch(
        /validé|solvable|peut financer|nous vous conseillons|acceptez|refusez/i,
      );
    }
  });

  it("counts the time left to answer", () => {
    const until = "2026-11-18T13:00:00Z";
    expect(remainingLabel(until, new Date("2026-11-14T06:00:00Z"))).toBe(
      "4 jours et 7 heures restantes",
    );
    expect(remainingLabel(until, new Date("2026-11-17T13:00:00Z"))).toBe("1 jour restant");
    expect(remainingLabel(until, new Date("2026-11-16T13:00:00Z"))).toBe("2 jours restants");
    expect(remainingLabel(until, new Date("2026-11-18T11:30:00Z"))).toBe("1 heure restante");
    expect(remainingLabel(until, new Date("2026-11-18T08:10:00Z"))).toBe("4 heures restantes");
    expect(remainingLabel(until, new Date("2026-11-18T12:40:00Z"))).toBe(
      "Moins d'une heure restante",
    );
    expect(remainingLabel(until, new Date("2026-11-18T13:00:00Z"))).toBeNull();
  });

  it("takes an answer only with the box of the acceptance ticked", () => {
    const answer = { offerId: ROW.id, accept: true, confirmedRead: true, message: "" };
    expect(offerAnswerSchema.safeParse(answer).success).toBe(true);
    expect(offerAnswerSchema.safeParse({ ...answer, confirmedRead: false }).success).toBe(false);
    expect(
      offerAnswerSchema.safeParse({ ...answer, accept: false, confirmedRead: false }).success,
    ).toBe(true);
    expect(offerAnswerSchema.safeParse({ ...answer, message: "a".repeat(1001) }).success).toBe(
      false,
    );
    expect(offerAnswerSchema.safeParse({ ...answer, offerId: "x" }).success).toBe(false);
  });
});

describe("withdrawal period after an avant-contrat (indicative, L2-04b)", () => {
  it("knows the eleven public holidays of a year", () => {
    expect(frenchPublicHolidays(2026)).toEqual([
      "2026-01-01",
      "2026-04-06", // Easter Monday
      "2026-05-01",
      "2026-05-08",
      "2026-05-14", // Ascension
      "2026-05-25", // Whit Monday
      "2026-07-14",
      "2026-08-15",
      "2026-11-01",
      "2026-11-11",
      "2026-12-25",
    ]);
    expect(frenchPublicHolidays(2027)).toContain("2027-03-29");
    expect(frenchPublicHolidays(2030)).toContain("2030-04-22");
  });

  it("ends ten days after the day of the notification, the period starting the day after", () => {
    // Monday 16 November: day 1 is the 17th, day 10 Thursday the 26th.
    expect(withdrawalPeriodEnd("2026-11-16")).toBe("2026-11-26");
  });

  it("goes on to the next working day after a Saturday, a Sunday or a public holiday", () => {
    // Saturday 14 November: Monday the 16th.
    expect(withdrawalPeriodEnd("2026-11-04")).toBe("2026-11-16");
    // Wednesday 11 November, a public holiday: Thursday the 12th.
    expect(withdrawalPeriodEnd("2026-11-01")).toBe("2026-11-12");
    // Friday 25 December, then the week-end: Monday the 28th.
    expect(withdrawalPeriodEnd("2026-12-15")).toBe("2026-12-28");
    // Over the year: Friday 1 January 2027, then the week-end.
    expect(withdrawalPeriodEnd("2026-12-22")).toBe("2027-01-04");
    // Friday 8 May 2026, then the week-end: Monday the 11th.
    expect(withdrawalPeriodEnd("2026-04-28")).toBe("2026-05-11");
  });

  it("says nothing of what is not a day", () => {
    expect(withdrawalPeriodEnd("2026-02-30")).toBeNull();
    expect(withdrawalPeriodEnd("16/11/2026")).toBeNull();
    expect(withdrawalPeriodEnd("")).toBeNull();
  });

  it("takes the day of the signature, and a notification never before it", () => {
    const offerId = "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27";
    expect(
      offerPrecontractSchema.safeParse({ offerId, signedAt: "2026-11-20", notifiedAt: "" }).success,
    ).toBe(true);
    expect(
      offerPrecontractSchema.safeParse({
        offerId,
        signedAt: "2026-11-20",
        notifiedAt: "2026-11-20",
      }).success,
    ).toBe(true);
    const before = offerPrecontractSchema.safeParse({
      offerId,
      signedAt: "2026-11-20",
      notifiedAt: "2026-11-19",
    });
    expect(before.success ? [] : issuePaths(before.error)).toEqual(["notifiedAt"]);
    const empty = offerPrecontractSchema.safeParse({ offerId, signedAt: "", notifiedAt: "" });
    expect(empty.success ? [] : issuePaths(empty.error)).toEqual(["signedAt"]);
    expect(
      offerPrecontractSchema.safeParse({ offerId: "x", signedAt: "2026-11-20", notifiedAt: "" })
        .success,
    ).toBe(false);
  });

  it("the texts of the follow-up are those of the SPEC, without a legal conclusion", () => {
    const t = fr.offer.followUp;
    expect(t.withdrawDialog.description).toBe(
      "Vous êtes sur le point de retirer votre offre. Le vendeur en sera immédiatement informé et votre retrait sera enregistré dans Leenkey.",
    );
    expect(`${t.accepted.title} ${t.accepted.text}`).toBe(
      "Vous souhaitez renoncer à votre projet ? Votre offre a déjà été acceptée par le vendeur. Les conséquences dépendent de votre situation et de l'avancement de la transaction. Contactez le vendeur et votre notaire avant toute démarche.",
    );
    expect(t.precontract.unknownStart).toBe(
      "Le point de départ de votre délai de rétractation dépend de la date de notification ou de remise de l'avant-contrat. Votre notaire peut vous l'indiquer.",
    );
    expect(t.precontract.indicative).toBe("Date indicative. Votre notaire fait foi.");
    expect(fr.offer.seller.precontract.indicative).toBe(
      "Date indicative calculée à partir de la date que vous avez renseignée. Votre notaire fait foi.",
    );
    // Never « ten days after the signature », never a duty to sign to withdraw.
    expect(JSON.stringify({ ...t, periodEnd: t.precontract.periodEnd("24/11/2026") })).not.toMatch(
      /après la signature|devez signer|vous rétracter en/i,
    );
  });
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
    // The texts built by a function too, with any arguments.
    const words = JSON.stringify(fr.offer, (_key, value: unknown) =>
      typeof value === "function"
        ? String((value as (...values: unknown[]) => unknown)("x", "y"))
        : value,
    );
    expect(words).not.toMatch(/financement validé|validé par/i);
    expect(words).not.toMatch(/\bon\b/i);
    expect(words).not.toMatch(/prix ferme/i);
  });
});
