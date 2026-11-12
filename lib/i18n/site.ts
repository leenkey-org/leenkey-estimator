// Texts of the public site in V2 (DECISIONS 2026-10-19, « V2 finale »): the
// pages of the V1 (its HTML pages and /qui-sommes-nous) rebuilt with the Façade components.
// Cédric's texts are kept word for word; the only changes are listed in
// DECISIONS (invented figures, decorative numbering, arrows and emoji left
// out, contact answer « sous 48 h, 7 j/7 » as in CLAUDE.md section 16, no
// « portails » since the listings are exclusive to Leenkey). Part of fr.ts.
// One module per part (lib/i18n/sections/site, P-06): a component of the
// browser imports the parts it shows, not the texts of every page.
import { frSiteLinks } from "./sections/site/links";
import { frSiteMenu } from "./sections/site/menu";
import { frSiteHome } from "./sections/site/home";
import { frSiteConcept } from "./sections/site/concept";
import { frSitePricing } from "./sections/site/pricing";
import { frSiteFaqPage } from "./sections/site/faqPage";
import { frSiteValuation } from "./sections/site/valuation";
import { frSiteInvest } from "./sections/site/invest";
import { frSiteContactPage } from "./sections/site/contactPage";
import { frSiteAbout } from "./sections/site/about";
import { frSiteContact } from "./sections/site/contact";

export const site = {
  links: frSiteLinks,
  menu: frSiteMenu,
  home: frSiteHome,
  concept: frSiteConcept,
  pricing: frSitePricing,
  faqPage: frSiteFaqPage,
  valuation: frSiteValuation,
  invest: frSiteInvest,
  contactPage: frSiteContactPage,
  about: frSiteAbout,
  contact: frSiteContact,
} as const;
