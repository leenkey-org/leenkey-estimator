// User-facing texts (CLAUDE.md section 9): no string literal in components.
// One module per part (lib/i18n/sections, P-06): a component of the browser
// imports the parts it shows, never the whole (about 200 kB of JavaScript);
// the server reads them all through `fr`.
import { site } from "./site";
import { frEnv } from "./sections/env";
import { frFormat } from "./sections/format";
import { frField } from "./sections/field";
import { frAuth } from "./sections/auth";
import { frSpaces } from "./sections/spaces";
import { frAccount } from "./sections/account";
import { frSaleDashboard } from "./sections/saleDashboard";
import { frSellStart } from "./sections/sellStart";
import { frErrors } from "./sections/errors";
import { frNav } from "./sections/nav";
import { frNotifications } from "./sections/notifications";
import { frFavorites } from "./sections/favorites";
import { frProperties } from "./sections/properties";
import { frEstimator } from "./sections/estimator";
import { frMessaging } from "./sections/messaging";
import { frPlaceholders } from "./sections/placeholders";
import { frLegal } from "./sections/legal";
import { frFooter } from "./sections/footer";
import { frConsent } from "./sections/consent";
import { frAdminAssistant } from "./sections/adminAssistant";
import { frAdminListings } from "./sections/adminListings";
import { frListingRevisions } from "./sections/listingRevisions";
import { frFinancingDocument } from "./sections/financingDocument";
import { frIdentityDocument } from "./sections/identityDocument";
import { frOffer } from "./sections/offer";
import { frVisits } from "./sections/visits";
import { frSaleFile } from "./sections/saleFile";
import { frAlerts } from "./sections/alerts";
import { frAdminDashboard } from "./sections/adminDashboard";
import { frUpgrade } from "./sections/upgrade";
import { frAdminUsers } from "./sections/adminUsers";
import { frAdminCases } from "./sections/adminCases";
import { frAdminOffers } from "./sections/adminOffers";
import { frAdminMessages } from "./sections/adminMessages";
import { frAdvisorInterventions } from "./sections/advisorInterventions";
import { frAdminReports } from "./sections/adminReports";
import { frEmails } from "./sections/emails";
import { frBilling } from "./sections/billing";
import { frFinancingStatus } from "./sections/financingStatus";
import { frBuyerSpace } from "./sections/buyerSpace";
import { frFinancingMention } from "./sections/financingMention";
import { frListingStatus } from "./sections/listingStatus";
import { frPlan } from "./sections/plan";
import { frPropertyType } from "./sections/propertyType";
import { frDpe } from "./sections/dpe";
import { frShowcaseCard } from "./sections/showcaseCard";
import { frPropertyCard } from "./sections/propertyCard";
import { frMaps } from "./sections/maps";
import { frSearch } from "./sections/search";
import { frListing } from "./sections/listing";
import { frAssistant } from "./sections/assistant";
import { frVisitorAssistant } from "./sections/visitorAssistant";

export const fr = {
  env: frEnv,
  format: frFormat,
  field: frField,
  auth: frAuth,
  spaces: frSpaces,
  account: frAccount,
  saleDashboard: frSaleDashboard,
  sellStart: frSellStart,
  errors: frErrors,
  nav: frNav,
  notifications: frNotifications,
  favorites: frFavorites,
  properties: frProperties,
  estimator: frEstimator,
  messaging: frMessaging,
  placeholders: frPlaceholders,
  legal: frLegal,
  footer: frFooter,
  consent: frConsent,
  adminAssistant: frAdminAssistant,
  adminListings: frAdminListings,
  listingRevisions: frListingRevisions,
  financingDocument: frFinancingDocument,
  identityDocument: frIdentityDocument,
  offer: frOffer,
  visits: frVisits,
  saleFile: frSaleFile,
  alerts: frAlerts,
  adminDashboard: frAdminDashboard,
  upgrade: frUpgrade,
  adminUsers: frAdminUsers,
  adminCases: frAdminCases,
  adminOffers: frAdminOffers,
  adminMessages: frAdminMessages,
  advisorInterventions: frAdvisorInterventions,
  adminReports: frAdminReports,
  emails: frEmails,
  billing: frBilling,
  financingStatus: frFinancingStatus,
  buyerSpace: frBuyerSpace,
  financingMention: frFinancingMention,
  listingStatus: frListingStatus,
  plan: frPlan,
  propertyType: frPropertyType,
  dpe: frDpe,
  showcaseCard: frShowcaseCard,
  propertyCard: frPropertyCard,
  maps: frMaps,
  search: frSearch,
  listing: frListing,
  assistant: frAssistant,
  visitorAssistant: frVisitorAssistant,
  site,
} as const;
