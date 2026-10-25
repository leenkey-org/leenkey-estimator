// Spaces of the site and their routes (SPEC-V2 section 3, DECISIONS
// 2026-10-17). No label here: the root layout tracks the space on every page
// (space-context.tsx) and must not bring the texts of the site to the V1 pages.

import { matchesPath, pathnameOf } from "@/components/shared/nav-items";

export type Space = "seller" | "buyer" | "admin";

export const ROUTES = {
  home: "/",
  search: "/acheter",
  listing: "/annonce",
  valuation: "/estimer",
  concept: "/concept",
  pricing: "/tarifs",
  faq: "/faq",
  invest: "/investir",
  about: "/qui-sommes-nous",
  contact: "/contact",
  sellerSignUp: "/inscription?role=seller",
  seller: "/vendeur",
  sellerProperties: "/vendeur/biens",
  newProperty: "/vendeur/biens/nouveau",
  sellerFile: "/vendeur/dossier",
  buyer: "/acquereur",
  favourites: "/acquereur/favoris",
  messages: "/messages",
  account: "/compte",
  notificationSettings: "/compte/notifications",
  admin: "/admin",
  adminListings: "/admin/annonces",
  /** The listings to review first (lib/validations/admin.ts, ADMIN_LISTING_FILTERS). */
  adminListingsToReview: "/admin/annonces?statut=a-valider",
  adminUsers: "/admin/utilisateurs",
  adminCases: "/admin/dossiers",
  adminOffers: "/admin/offres",
  adminReports: "/admin/signalements",
  adminAssistant: "/admin/assistant",
} as const;

/**
 * Space a path belongs to: the back office, the seller and the buyer areas
 * (the search with them). Null for the pages shared by all (messages,
 * account, assistant), the listings and the other public pages.
 */
export function ownSpace(path: string): Space | null {
  const pathname = pathnameOf(path);
  if (matchesPath(pathname, ROUTES.admin)) return "admin";
  if (matchesPath(pathname, ROUTES.seller)) return "seller";
  if (matchesPath(pathname, ROUTES.buyer) || matchesPath(pathname, ROUTES.search)) return "buyer";
  return null;
}

/**
 * A space the account may be in: the back office for an admin only, a 404
 * for any other account, which keeps the tabs and the bell of its own space
 * (the seller and buyer areas are open to every account). Null otherwise.
 */
export function allowedSpace(space: Space | null, roles: readonly string[]): Space | null {
  return space === "admin" && !roles.includes("admin") ? null : space;
}

/**
 * Space of a page, which picks the bottom tabs and the notifications text,
 * without history: its own (ownSpace) when the account may be in it,
 * otherwise the roles of the account: seller when it sells, otherwise buyer,
 * admin for an admin-only account. In the browser, a page without a space of
 * its own takes the last one visited first (SpaceProvider).
 */
export function spaceFor(path: string, roles: readonly string[]): Space {
  const own = allowedSpace(ownSpace(path), roles);
  if (own) return own;
  if (roles.includes("seller")) return "seller";
  if (roles.includes("admin") && !roles.includes("buyer")) return "admin";
  return "buyer";
}

/**
 * Last space visited after a client navigation to `path` (SpaceProvider):
 * the page's own, or the previous one for a page without one.
 */
export function followSpace(previous: Space | null, path: string): Space | null {
  return ownSpace(path) ?? previous;
}
