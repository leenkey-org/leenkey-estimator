// Leenkey's navigation (SPEC-V2 section 3, docs/DESIGN.md 10.6, DECISIONS
// 2026-10-17): which space a page belongs to, and the items of each bar. Plain
// data for the bars of components/shared, which know no route of the site.

import { loginPath } from "@/core/auth/next-path";
import type { NavItem } from "@/components/shared/nav-items";
import { homePathForRoles } from "@/leenkey/auth/routes";
import { fr } from "@/lib/i18n/fr";
import { ROUTES, type Space } from "./spaces";

export {
  allowedSpace,
  followSpace,
  ownSpace,
  pageSpace,
  ROUTES,
  spaceFor,
  type Space,
} from "./spaces";

const tabs = fr.nav.tabs;

const SHARED_TABS: readonly NavItem[] = [
  { href: ROUTES.messages, label: tabs.messages, icon: "message" },
  { href: ROUTES.account, label: tabs.account, icon: "user" },
];

const ADMIN_TABS: readonly NavItem[] = [
  { href: ROUTES.adminListings, label: tabs.listings, icon: "listings" },
  { href: ROUTES.adminCases, label: tabs.cases, icon: "folder" },
  { href: ROUTES.adminUsers, label: tabs.users, icon: "users" },
  { href: ROUTES.adminAssistant, label: tabs.assistant, icon: "sparkles" },
];

/**
 * Tabs of the BottomNav of a space (DESIGN.md 10.6). Every account buys and
 * sells (DECISIONS 2026-10-19): in the middle of the seller and buyer bars,
 * the way to the other side. « Acheter » opens the search; « Vendre » the
 * seller area once signed in, otherwise the two ways to start a sale
 * (/vendre, DECISIONS 2026-10-26; the search shows the buyer tabs to every
 * visitor).
 */
export function bottomTabs(space: Space, signedIn = true): readonly NavItem[] {
  switch (space) {
    case "seller":
      return [
        { href: ROUTES.seller, label: tabs.sale, icon: "dashboard" },
        // The page of a property is the file of the sale (L1-14).
        {
          href: ROUTES.sellerFile,
          label: tabs.file,
          icon: "file",
          match: [ROUTES.sellerProperties],
        },
        { href: ROUTES.search, label: tabs.buy, icon: "search" },
        ...SHARED_TABS,
      ];
    case "buyer":
      return [
        { href: ROUTES.search, label: tabs.search, icon: "search" },
        { href: ROUTES.favourites, label: tabs.favourites, icon: "heart" },
        {
          href: signedIn ? ROUTES.seller : ROUTES.sell,
          label: tabs.sell,
          icon: "square-plus",
        },
        ...SHARED_TABS,
      ];
    case "admin":
      return ADMIN_TABS;
  }
}

/**
 * Links of the TopNav. « Vendre » is the home page, written for the sellers;
 * « Acheter » stays current on a listing (AnnonceDesktop); « Tarifs » joins
 * them with the public site in V2 (DECISIONS 2026-10-19), then « Qui
 * sommes-nous » and « Contact » (DECISIONS 2026-10-20). « Qui sommes-nous »
 * opens the company and its founder, then the page of the investors, where
 * the vision is (L1-51, DECISIONS 2026-10-24): current on both. No
 * « Guides »: no such page in the SPEC.
 */
export const TOP_NAV_LINKS: readonly NavItem[] = [
  { href: ROUTES.search, label: fr.nav.links.buy, match: [ROUTES.listing] },
  { href: ROUTES.sell, label: fr.nav.links.sell },
  // Below their width, they would run into « Vendre mon bien »: the footer
  // and the mobile menu have them.
  { href: ROUTES.pricing, label: fr.site.links.pricing, from: "lg" },
  { href: ROUTES.valuation, label: fr.nav.links.valuation },
  {
    href: ROUTES.about,
    label: fr.site.links.about,
    from: "xl",
    items: [
      { href: ROUTES.about, label: fr.site.links.aboutCompany },
      { href: ROUTES.invest, label: fr.site.links.aboutInvest },
    ],
  },
  { href: ROUTES.contact, label: fr.site.links.contact, from: "lg" },
];

/**
 * Pages of the public site (DECISIONS 2026-10-19, « V2 finale »): in the
 * footer of every V2 page and in the mobile menu, after the TopNav links. Not
 * /contact: the legal links of the footer already end with « Contact » (the
 * email of Leenkey, L1-36).
 */
export const SITE_LINKS: readonly NavItem[] = [
  { href: ROUTES.concept, label: fr.site.links.concept },
  { href: ROUTES.pricing, label: fr.site.links.pricing },
  { href: ROUTES.faq, label: fr.site.links.faq },
  { href: ROUTES.invest, label: fr.site.links.invest },
  { href: ROUTES.about, label: fr.site.links.about },
];

/** The pages the TopNav leads to, those of its groups included. */
const TOP_NAV_PAGES = TOP_NAV_LINKS.flatMap((link) => link.items ?? [link]).map(
  (link) => link.href,
);

/** Links of the mobile menu of the public pages (G1): the TopNav, then the rest of the site. */
export const MENU_LINKS: readonly NavItem[] = [
  ...TOP_NAV_LINKS,
  ...SITE_LINKS.filter((link) => !TOP_NAV_PAGES.includes(link.href)),
];

const admin = fr.nav.admin;

/** Back office sidebar, in the order of AdminDesktop (/admin/messages comes with L1-34). */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { href: ROUTES.admin, label: admin.dashboard, icon: "layout-grid", exact: true },
  { href: ROUTES.adminListings, label: admin.listings, icon: "listings" },
  { href: ROUTES.adminUsers, label: admin.users, icon: "users" },
  { href: ROUTES.adminCases, label: admin.cases, icon: "folder" },
  { href: ROUTES.adminOffers, label: admin.offers, icon: "file" },
  { href: ROUTES.adminReports, label: admin.reports, icon: "flag" },
  { href: ROUTES.adminAssistant, label: admin.assistant, icon: "sparkles" },
];

/** « Vendre mon bien »: the two ways to start a sale, signed in or not (DECISIONS 2026-10-26). */
export function sellCta(): { href: string; label: string } {
  return { href: ROUTES.sell, label: fr.nav.sellCta };
}

/** « Mon compte » when signed out: the login page, which comes back to `path`. */
export function signInLink(path: string): { href: string; label: string } {
  return { href: loginPath(path), label: fr.nav.signIn };
}

export const FAVOURITES_LINK = { href: ROUTES.favourites, label: fr.nav.favourites } as const;

/** Bell of a space: the sentence and the action of its empty panel, its settings (L1-22). */
export function notificationBell(space: Space): {
  emptyText: string;
  emptyAction?: { href: string; label: string };
  settingsHref: string;
} {
  const t = fr.nav.notifications;
  const empty = {
    seller: {
      emptyText: t.emptySeller,
      emptyAction: { href: ROUTES.sellerFile, label: t.completeListing },
    },
    // DESIGN.md 10.7; the buyer's « Créer une alerte » comes with the alerts (L3-06).
    buyer: { emptyText: t.emptyBuyer },
    admin: {
      emptyText: t.emptyAdmin,
      emptyAction: { href: ROUTES.adminListingsToReview, label: t.reviewListings },
    },
  }[space];
  return { ...empty, settingsHref: ROUTES.notificationSettings };
}

/** Capital initial of the first name, for the avatar. */
export function accountInitial(firstName: string | null | undefined): string | null {
  const first = firstName?.trim().charAt(0);
  return first ? first.toLocaleUpperCase("fr-FR") : null;
}

/**
 * Account menu of a profile, without its sign-out action (a Server Action).
 * An admin's space is the Cockpit, named so (Younes, 2026-10-26), with the
 * way back to the site.
 */
export function accountMenu(profile: { firstName: string | null; roles: readonly string[] }): {
  initial: string | null;
  homeHref: string;
  homeLabel: string;
  accountHref: string;
  siteHref?: string;
} {
  const admin = profile.roles.includes("admin");
  return {
    initial: accountInitial(profile.firstName),
    homeHref: homePathForRoles(profile.roles),
    homeLabel: admin ? fr.nav.menu.cockpit : fr.nav.menu.home,
    accountHref: ROUTES.account,
    ...(admin ? { siteHref: ROUTES.home } : {}),
  };
}
