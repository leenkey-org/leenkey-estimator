// Thresholds of the upgrade prompts (SPEC-V2 section 11 bis), changed without
// a migration. Proposals waiting for Cédric (DECISIONS.md Q2).

export const UPGRADE_THRESHOLDS = {
  /** low_contacts: fewer contacts than this, once the listing is online for `days`. */
  lowContacts: { below: 3, days: 14 },
  /** contacts_no_visit: at least `contacts`, no visit, online for `days`. */
  contactsNoVisit: { contacts: 5, days: 21 },
  /** visits_no_offer: at least `visits` done, no offer (lot 3). */
  visitsNoOffer: { visits: 3 },
  /** file_incomplete: at least `missing` documents required, online for `days` (lot 3). */
  fileIncomplete: { missing: 3, days: 30 },
} as const;
