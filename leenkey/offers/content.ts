import type { Database, Json } from "@/types/database";
import type {
  AcquisitionMode,
  FinancingMode,
  FinancingProgress,
  OfferIdentityInput,
  OfferSciInput,
  SciStatus,
} from "@/lib/validations/offer";
import { SCI_STATUSES, sirenDigits } from "@/lib/validations/offer";

// The content of an offer as the code reads it (L2-03): the columns and the
// JSON of `offers` (shapes decided in L2-01, DECISIONS.md 2026-11-13) turned
// into plain values, and back. A field missing in the JSON reads as an empty
// string: the view of the seller hides some of them before acceptance.

export type OfferStatus = Database["public"]["Enums"]["offer_status"];

export type OfferIdentity = {
  lastName: string;
  firstName: string;
  /** YYYY-MM-DD. */
  birthDate: string;
  addressLine: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
};

export type OfferSci = {
  name: string;
  status: SciStatus | null;
  siren: string;
  seatAddress: string;
  representative: string;
};

export const OFFER_ANNEXES = ["parking", "cellar", "garden", "balcony", "terrace"] as const;
export type OfferAnnex = (typeof OFFER_ANNEXES)[number];

/** The property of the offer: the listing as it is (draft), or as it was when sent. */
export type OfferProperty = {
  listingReference: string;
  title: string;
  postalCode: string;
  city: string;
  type: Database["public"]["Enums"]["property_type"];
  surfaceM2: number;
  rooms: number;
  annexes: OfferAnnex[];
  askingPriceCents: number;
};

export type OfferDeclarations = {
  accuracy: boolean;
  priceAndFinancingChecked: boolean;
  legalEffectsUnderstood: boolean;
  infoRead: boolean;
  /** When the offer was sent with them (written by the database). */
  acceptedAt: string | null;
};

export type OfferContent = {
  id: string;
  reference: string;
  version: number;
  status: OfferStatus;
  listingId: string;
  submittedAt: string | null;
  buyer: OfferIdentity;
  coBuyers: OfferIdentity[];
  acquisitionMode: AcquisitionMode;
  acquisitionModeOther: string;
  sci: OfferSci | null;
  priceCents: number | null;
  /** Written by the database at sending; null in a draft. */
  priceInWords: string | null;
  financingMode: FinancingMode | null;
  downPaymentCents: number;
  loanAmountCents: number;
  loanDurationYears: number | null;
  loanRateMaxPct: number | null;
  lenderName: string;
  financingProgress: FinancingProgress | null;
  financingProgressOther: string;
  conditionPriorSale: boolean;
  conditionAuthorization: boolean;
  conditionOther: boolean;
  conditionsDetails: string;
  validityUntil: string | null;
  visited: boolean | null;
  declarations: OfferDeclarations;
  supersededBy: string | null;
  expiredAt: string | null;
};

type JsonObject = { [key: string]: Json | undefined };

const isObject = (value: Json | undefined): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: Json | undefined): string => (typeof value === "string" ? value : "");
const flag = (value: Json | undefined): boolean => value === true;

export function readIdentity(json: Json | undefined): OfferIdentity {
  const value = isObject(json) ? json : {};
  const address = isObject(value.address) ? value.address : {};
  return {
    lastName: text(value.last_name),
    firstName: text(value.first_name),
    birthDate: text(value.birth_date),
    addressLine: text(address.line),
    postalCode: text(address.postal_code),
    // Before acceptance, the seller reads the town beside the names.
    city: text(address.city) || text(value.city),
    email: text(value.email),
    phone: text(value.phone),
  };
}

export function writeIdentity(identity: OfferIdentityInput): Json {
  return {
    last_name: identity.lastName,
    first_name: identity.firstName,
    birth_date: identity.birthDate,
    address: { line: identity.addressLine, postal_code: identity.postalCode, city: identity.city },
    email: identity.email,
    phone: identity.phone,
  };
}

export function readSci(json: Json | undefined): OfferSci | null {
  if (!isObject(json)) return null;
  const status = SCI_STATUSES.find((candidate) => candidate === json.status) ?? null;
  return {
    name: text(json.name),
    status,
    siren: text(json.siren),
    seatAddress: text(json.seat_address),
    representative: text(json.representative),
  };
}

export function writeSci(sci: OfferSciInput): Json {
  const registered = sci.status === "registered";
  return {
    name: sci.name,
    status: sci.status,
    // A company not yet registered has no SIREN.
    ...(registered ? { siren: sirenDigits(sci.siren) } : {}),
    ...(sci.seatAddress ? { seat_address: sci.seatAddress } : {}),
    representative: sci.representative,
  };
}

export function readDeclarations(json: Json | undefined): OfferDeclarations {
  const value = isObject(json) ? json : {};
  return {
    accuracy: flag(value.accuracy),
    priceAndFinancingChecked: flag(value.price_and_financing_checked),
    legalEffectsUnderstood: flag(value.legal_effects_understood),
    infoRead: flag(value.info_read),
    acceptedAt: text(value.accepted_at) || null,
  };
}

/** The photograph of the property taken by offer_submit; null when it is empty (a draft). */
export function readPropertySnapshot(json: Json | undefined): OfferProperty | null {
  if (!isObject(json) || typeof json.listing_reference !== "string") return null;
  const address = isObject(json.address) ? json.address : {};
  const annexes = Array.isArray(json.annexes) ? json.annexes : [];
  const type = text(json.type);
  return {
    listingReference: json.listing_reference,
    title: text(json.title),
    postalCode: text(address.postal_code),
    city: text(address.city),
    type:
      type === "appartement" || type === "maison" || type === "terrain" || type === "autre"
        ? type
        : "autre",
    surfaceM2: typeof json.surface_m2 === "number" ? json.surface_m2 : 0,
    rooms: typeof json.rooms === "number" ? json.rooms : 0,
    annexes: OFFER_ANNEXES.filter((annex) => annexes.includes(annex)),
    askingPriceCents: typeof json.asking_price_cents === "number" ? json.asking_price_cents : 0,
  };
}

/** The columns of `offers` the content is read from. */
export const OFFER_COLUMNS =
  "id, reference, version, status, listing_id, submitted_at, buyer_identity, co_buyers, acquisition_mode, acquisition_mode_other, sci_details, property_snapshot, price_cents, price_in_words, financing_mode, down_payment_cents, loan_amount_cents, loan_duration_years, loan_rate_max_pct, lender_name, financing_progress, financing_progress_other, condition_prior_sale, condition_authorization, condition_other, conditions_details, validity_until, visited, declarations, superseded_by, expired_at" as const;

export type OfferRow = Pick<
  Database["public"]["Tables"]["offers"]["Row"],
  | "id"
  | "reference"
  | "version"
  | "status"
  | "listing_id"
  | "submitted_at"
  | "buyer_identity"
  | "co_buyers"
  | "acquisition_mode"
  | "acquisition_mode_other"
  | "sci_details"
  | "property_snapshot"
  | "price_cents"
  | "price_in_words"
  | "financing_mode"
  | "down_payment_cents"
  | "loan_amount_cents"
  | "loan_duration_years"
  | "loan_rate_max_pct"
  | "lender_name"
  | "financing_progress"
  | "financing_progress_other"
  | "condition_prior_sale"
  | "condition_authorization"
  | "condition_other"
  | "conditions_details"
  | "validity_until"
  | "visited"
  | "declarations"
  | "superseded_by"
  | "expired_at"
>;

export function readOffer(row: OfferRow): OfferContent {
  return {
    id: row.id,
    reference: row.reference,
    version: row.version,
    status: row.status,
    listingId: row.listing_id,
    submittedAt: row.submitted_at,
    buyer: readIdentity(row.buyer_identity),
    coBuyers: Array.isArray(row.co_buyers) ? row.co_buyers.map(readIdentity) : [],
    acquisitionMode: row.acquisition_mode,
    acquisitionModeOther: row.acquisition_mode_other ?? "",
    sci: row.acquisition_mode === "sci" ? readSci(row.sci_details) : null,
    priceCents: row.price_cents,
    priceInWords: row.price_in_words,
    financingMode: row.financing_mode,
    downPaymentCents: row.down_payment_cents,
    loanAmountCents: row.loan_amount_cents,
    loanDurationYears: row.loan_duration_years,
    loanRateMaxPct: row.loan_rate_max_pct,
    lenderName: row.lender_name ?? "",
    financingProgress: row.financing_progress,
    financingProgressOther: row.financing_progress_other ?? "",
    conditionPriorSale: row.condition_prior_sale,
    conditionAuthorization: row.condition_authorization,
    conditionOther: row.condition_other,
    conditionsDetails: row.conditions_details ?? "",
    validityUntil: row.validity_until,
    visited: row.visited,
    declarations: readDeclarations(row.declarations),
    supersededBy: row.superseded_by,
    expiredAt: row.expired_at,
  };
}

/** A complete identity, as offer_identity_complete checks it in the database. */
export function isIdentityComplete(identity: OfferIdentity): boolean {
  return (
    identity.lastName.trim() !== "" &&
    identity.firstName.trim() !== "" &&
    /^\d{4}-\d{2}-\d{2}$/.test(identity.birthDate) &&
    identity.addressLine.trim() !== "" &&
    identity.postalCode.trim() !== "" &&
    identity.city.trim() !== "" &&
    identity.email.trim() !== "" &&
    identity.phone.trim() !== ""
  );
}

/**
 * How far a draft goes: the number of the first step still to fill, 8 when the
 * seven are filled (the review). Step 2 has nothing to fill.
 */
export function firstStepToFill(offer: OfferContent | null): number {
  if (!offer || !isIdentityComplete(offer.buyer)) return 1;
  if (offer.priceCents === null) return 3;
  if (offer.financingMode === null) return 4;
  // Step 5 has no required field: the validity is the next one to fill.
  if (offer.validityUntil === null) return 6;
  const said = offer.declarations;
  if (
    offer.visited === null ||
    !said.accuracy ||
    !said.priceAndFinancingChecked ||
    !said.legalEffectsUnderstood ||
    !said.infoRead
  ) {
    return 7;
  }
  return 8;
}
