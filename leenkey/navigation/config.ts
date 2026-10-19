// Leenkey's navigation (SPEC-V2 section 3, docs/DESIGN.md 10.6, DECISIONS
// 2026-10-17): which space a page belongs to, and the items of each bar. Plain
// data for the bars of components/shared, which know no route of the site.

import { loginPath } from "@/core/auth/next-path";
import type { NavItem } from "@/components/shared/nav-items";
import { homePathForRoles } from "@/leenkey/auth/routes";
import { fr } from "@/lib/i18n/fr";
import { ROUTES, type Space } from "./spaces";

export { followSpace, ownSpace, ROUTES, spaceFor, type Space } from "./spaces";

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
 * seller area once signed in, otherwise the landing page written for the
 * sellers (the search shows the buyer tabs to every visitor).
 */
export function bottomTabs(space: Space, signedIn = true): readonly NavItem[] {
  switch (space) {
    case "seller":
      return [
        { href: ROUTES.seller, label: tabs.sale, icon: "dashboard" },
        { href: ROUTES.sellerFile, label: tabs.file, icon: "file" },
        { href: ROUTES.search, label: tabs.buy, icon: "search" },
        ...SHARED_TABS,
      ];
    case "buyer":
      return [
        { href: ROUTES.search, label: tabs.search, icon: "search" },
        { href: ROUTES.favourites, label: tabs.favourites, icon: "heart" },
        {
          href: signedIn ? ROUTES.seller : ROUTES.home,
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
 * Links of the TopNav. « Vendre » is the V1 landing page, written for the
 * sellers; « Acheter » stays current on a listing (AnnonceDesktop). No
 * « Guides »: no such page in the SPEC.
 */
export const TOP_NAV_LINKS: readonly NavItem[] = [
  { href: ROUTES.search, label: fr.nav.links.buy, match: [ROUTES.listing] },
  { href: ROUTES.home, label: fr.nav.links.sell },
  { href: ROUTES.valuation, label: fr.nav.links.valuation },
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

/**
 * « Vendre mon bien »: the seller sign-up when signed out, the seller area
 * otherwise (the property creation of L1-11 will take its place).
 */
export function sellCta(signedIn: boolean): { href: string; label: string } {
  return { href: signedIn ? ROUTES.seller : ROUTES.sellerSignUp, label: fr.nav.sellCta };
}

/** « Mon compte » when signed out: the login page, which comes back to `path`. */
export function signInLink(path: string): { href: string; label: string } {
  return { href: loginPath(path), label: fr.nav.signIn };
}

export const FAVOURITES_LINK = { href: ROUTES.favourites, label: fr.nav.favourites } as const;

/** Bell of a space: nothing unread until the notifications (L1-22). */
export function notificationBell(space: Space): {
  count: number;
  emptyText: string;
  settingsHref: string;
} {
  const t = fr.nav.notifications;
  return {
    count: 0,
    emptyText: space === "seller" ? t.emptySeller : t.emptyBuyer,
    settingsHref: ROUTES.account,
  };
}

/** Capital initial of the first name, for the avatar. */
export function accountInitial(firstName: string | null | undefined): string | null {
  const first = firstName?.trim().charAt(0);
  return first ? first.toLocaleUpperCase("fr-FR") : null;
}

/** Account menu of a profile, without its sign-out action (a Server Action). */
export function accountMenu(profile: { firstName: string | null; roles: readonly string[] }): {
  initial: string | null;
  homeHref: string;
  accountHref: string;
} {
  return {
    initial: accountInitial(profile.firstName),
    homeHref: homePathForRoles(profile.roles),
    accountHref: ROUTES.account,
  };
}
