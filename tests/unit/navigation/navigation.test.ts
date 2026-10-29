import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  currentHref,
  matchesPath,
  NAV_ICONS,
  pathnameOf,
  type NavItem,
} from "@/components/shared/nav-items";
import {
  accountInitial,
  accountMenu,
  ADMIN_NAV_ITEMS,
  allowedSpace,
  bottomTabs,
  FAVOURITES_LINK,
  followSpace,
  MENU_LINKS,
  notificationBell,
  ownSpace,
  pageSpace,
  ROUTES,
  sellCta,
  signInLink,
  SITE_LINKS,
  spaceFor,
  TOP_NAV_LINKS,
  type Space,
} from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";
import { adminListingsHref } from "@/lib/validations/admin";

// L1-10: navigation shells (docs/DESIGN.md 10.6, DECISIONS 2026-10-17).

const SPACES: Space[] = ["seller", "buyer", "admin"];

const summary = (items: readonly NavItem[]) =>
  items.map(({ href, label, icon }) => ({ href, label, icon }));

describe("spaceFor", () => {
  it("reads the space of a page from its path", () => {
    expect(spaceFor("/admin", ["admin"])).toBe("admin");
    expect(spaceFor("/admin/annonces", ["admin", "seller"])).toBe("admin");
    expect(spaceFor("/vendeur", ["seller"])).toBe("seller");
    expect(spaceFor("/vendeur/dossier", ["seller", "buyer"])).toBe("seller");
    expect(spaceFor("/acquereur", ["seller", "buyer"])).toBe("buyer");
    expect(spaceFor("/acquereur/favoris", ["seller"])).toBe("buyer");
    expect(spaceFor("/acheter", [])).toBe("buyer");
    expect(spaceFor("/acheter?ville=savigny-sur-orge&rayon=5", ["seller"])).toBe("buyer");
  });

  it("gives the shared pages the space of the account's roles", () => {
    for (const path of ["/messages", "/messages/42", "/compte", "/assistant"]) {
      expect(spaceFor(path, ["seller"]), path).toBe("seller");
      expect(spaceFor(path, ["buyer"]), path).toBe("buyer");
      // A seller who also buys: the sale comes first.
      expect(spaceFor(path, ["buyer", "seller"]), path).toBe("seller");
      expect(spaceFor(path, ["admin"]), path).toBe("admin");
      expect(spaceFor(path, ["admin", "buyer"]), path).toBe("buyer");
      expect(spaceFor(path, ["admin", "seller"]), path).toBe("seller");
      expect(spaceFor(path, []), path).toBe("buyer");
    }
  });

  // The back office is a 404 for an account without the admin role.
  it("never gives the back office to an account without the admin role", () => {
    expect(spaceFor("/admin", ["seller"])).toBe("seller");
    expect(spaceFor("/admin/annonces", ["buyer"])).toBe("buyer");
    expect(spaceFor("/admin/annonces", ["buyer", "seller"])).toBe("seller");
    expect(spaceFor("/admin", [])).toBe("buyer");
  });

  it("cuts paths on segments only", () => {
    expect(spaceFor("/administration", ["seller"])).toBe("seller");
    expect(spaceFor("/vendeurs", ["buyer"])).toBe("buyer");
    expect(spaceFor("/acheteur", ["seller"])).toBe("seller");
    expect(spaceFor("/vendeur/", ["buyer"])).toBe("seller");
  });
});

describe("followSpace (client navigation, SpaceProvider)", () => {
  it("takes the space of a page that has one", () => {
    expect(ownSpace("/vendeur/dossier")).toBe("seller");
    expect(ownSpace("/acheter?ville=savigny-sur-orge")).toBe("buyer");
    expect(followSpace("seller", "/acquereur/favoris")).toBe("buyer");
    expect(followSpace("buyer", "/vendeur")).toBe("seller");
    expect(followSpace("seller", "/admin/annonces")).toBe("admin");
  });

  it("keeps the previous space on the pages without one, listings included", () => {
    for (const path of [
      "/messages",
      "/messages/42",
      "/compte",
      "/assistant",
      "/annonce/x-lk0001",
    ]) {
      expect(ownSpace(path), path).toBeNull();
      for (const space of SPACES) expect(followSpace(space, path), path).toBe(space);
      // Opened first: no space yet, the roles decide (spaceFor).
      expect(followSpace(null, path), path).toBeNull();
    }
    // The search belongs to the buyer area: a seller who goes from it to the
    // messages keeps the buyer tabs.
    expect(followSpace(followSpace("seller", "/acheter"), "/messages")).toBe("buyer");
  });
});

describe("allowedSpace (useSpace)", () => {
  it("drops the back office for an account without the admin role", () => {
    expect(allowedSpace("admin", ["admin"])).toBe("admin");
    expect(allowedSpace("admin", ["admin", "seller"])).toBe("admin");
    expect(allowedSpace("admin", ["seller"])).toBeNull();
    expect(allowedSpace("admin", ["buyer", "seller"])).toBeNull();
    expect(allowedSpace("admin", [])).toBeNull();
    expect(allowedSpace(null, ["admin"])).toBeNull();
  });

  it("keeps the seller and buyer areas, open to every account", () => {
    for (const roles of [["seller"], ["buyer"], ["admin"], []]) {
      expect(allowedSpace("seller", roles)).toBe("seller");
      expect(allowedSpace("buyer", roles)).toBe("buyer");
    }
  });

  // seller_a opens /admin (a 404), then goes home: the provider keeps the
  // back office, the page takes the space of the account's roles (useSpace).
  it("after the 404 of the back office, the space of the account's roles", () => {
    const last = followSpace(followSpace("seller", "/admin"), "/");
    expect(last).toBe("admin");
    expect(pageSpace(last, "/", ["seller"])).toBe("seller");
    expect(pageSpace(followSpace(last, "/compte"), "/compte", ["buyer"])).toBe("buyer");
  });
});

describe("pageSpace (useSpace)", () => {
  it("keeps the back office for an admin on a page without a space of its own", () => {
    const last = followSpace(null, "/admin");
    expect(pageSpace(followSpace(last, "/compte"), "/compte", ["admin"])).toBe("admin");
    expect(pageSpace(followSpace(last, "/compte"), "/compte", ["admin", "seller"])).toBe("admin");
  });

  it("keeps the last space visited, otherwise the one of the page and of the roles", () => {
    expect(pageSpace("buyer", "/messages", ["seller"])).toBe("buyer");
    expect(pageSpace(null, "/messages", ["seller"])).toBe("seller");
    expect(pageSpace(null, "/admin", ["seller"])).toBe("seller");
    expect(pageSpace(null, "/admin", ["admin"])).toBe("admin");
  });
});

describe("bottom tabs (DESIGN.md 10.6)", () => {
  it("seller: Ma vente, Dossier, Acheter, Messages, Compte", () => {
    expect(summary(bottomTabs("seller"))).toEqual([
      { href: "/vendeur", label: "Ma vente", icon: "dashboard" },
      { href: "/vendeur/dossier", label: "Dossier", icon: "file" },
      { href: "/acheter", label: "Acheter", icon: "search" },
      { href: "/messages", label: "Messages", icon: "message" },
      { href: "/compte", label: "Compte", icon: "user" },
    ]);
  });

  it("buyer: Chercher, Favoris, Vendre, Messages, Compte", () => {
    expect(summary(bottomTabs("buyer"))).toEqual([
      { href: "/acheter", label: "Chercher", icon: "search" },
      { href: "/acquereur/favoris", label: "Favoris", icon: "heart" },
      { href: "/vendeur", label: "Vendre", icon: "square-plus" },
      { href: "/messages", label: "Messages", icon: "message" },
      { href: "/compte", label: "Compte", icon: "user" },
    ]);
  });

  it("every account buys and sells: the other side in the middle (DECISIONS 2026-10-19)", () => {
    expect(bottomTabs("seller")[2]).toMatchObject({ href: "/acheter", label: "Acheter" });
    expect(bottomTabs("buyer")[2]).toMatchObject({ href: "/vendeur", label: "Vendre" });
    // Signed out, on the search: the two ways to start a sale (DECISIONS 2026-10-26).
    expect(bottomTabs("buyer", false)[2]).toMatchObject({ href: "/vendre", label: "Vendre" });
    expect(bottomTabs("buyer", false).map((tab) => tab.href)).toEqual([
      "/acheter",
      "/acquereur/favoris",
      "/vendre",
      "/messages",
      "/compte",
    ]);
    // Messages and Compte stay in place from one side to the other.
    expect(bottomTabs("seller").slice(3)).toEqual(bottomTabs("buyer").slice(3));
  });

  it("admin: Annonces, Dossiers, Utilisateurs, Assistant", () => {
    expect(summary(bottomTabs("admin"))).toEqual([
      { href: "/admin/annonces", label: "Annonces", icon: "listings" },
      { href: "/admin/dossiers", label: "Dossiers", icon: "folder" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "users" },
      { href: "/admin/assistant", label: "Assistant", icon: "sparkles" },
    ]);
  });

  it("five tabs for the seller and the buyer, four in the back office, a known icon each", () => {
    expect(bottomTabs("seller")).toHaveLength(5);
    expect(bottomTabs("buyer")).toHaveLength(5);
    expect(bottomTabs("admin")).toHaveLength(4);
    for (const tabs of [...SPACES.map((space) => bottomTabs(space)), bottomTabs("buyer", false)]) {
      for (const tab of tabs) expect(NAV_ICONS).toContain(tab.icon);
    }
  });
});

describe("TopNav", () => {
  it("links: Acheter, Vendre (its two ways), Tarifs, Valoriser mon bien, Qui sommes-nous, Contact; no Guides", () => {
    expect(TOP_NAV_LINKS.map(({ href, label, from }) => ({ href, label, from }))).toEqual([
      { href: "/acheter", label: "Acheter", from: undefined },
      { href: "/vendre", label: "Vendre", from: undefined },
      // Where the bar has room for them (DESIGN.md 10.6).
      { href: "/tarifs", label: "Tarifs", from: "lg" },
      { href: "/estimer", label: "Valoriser mon bien", from: undefined },
      { href: "/qui-sommes-nous", label: "Qui sommes-nous", from: "xl" },
      { href: "/contact", label: "Contact", from: "lg" },
    ]);
  });

  it("« Qui sommes-nous » opens the company and its founder, then the investors (L1-51)", () => {
    const about = TOP_NAV_LINKS.find((link) => link.label === "Qui sommes-nous");
    expect(about?.items?.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: "/qui-sommes-nous", label: "Leenkey et son fondateur" },
      { href: "/investir", label: "Investir dans Leenkey" },
    ]);
    // The only group of the bar.
    expect(TOP_NAV_LINKS.filter((link) => link.items)).toHaveLength(1);
  });

  it("pages of the site: in the footer, and in the mobile menu after the TopNav", () => {
    expect(SITE_LINKS.map((link) => link.label)).toEqual([
      "Concept",
      "Tarifs",
      "FAQ",
      "Investir",
      "Qui sommes-nous",
    ]);
    // /investir under « Qui sommes-nous », not again after the TopNav.
    expect(MENU_LINKS.map((link) => link.label)).toEqual([
      "Acheter",
      "Vendre",
      "Tarifs",
      "Valoriser mon bien",
      "Qui sommes-nous",
      "Contact",
      "Concept",
      "FAQ",
    ]);
    // Each page once, those of the group included; every page of the footer.
    const pages = MENU_LINKS.flatMap((link) => link.items ?? [link]).map((link) => link.href);
    expect(new Set(pages).size).toBe(pages.length);
    for (const link of SITE_LINKS) expect(pages).toContain(link.href);
  });

  it("never says « estimer » nor « estimation » (CLAUDE.md section 16)", () => {
    const labels = [
      ...TOP_NAV_LINKS,
      ...TOP_NAV_LINKS.flatMap((link) => link.items ?? []),
      ...ADMIN_NAV_ITEMS,
      ...SPACES.flatMap((space) => bottomTabs(space)),
    ].map((item) => item.label);
    for (const label of labels) expect(label).not.toMatch(/estim/i);
  });

  it("« Vendre mon bien »: the two ways to start a sale, signed in or not", () => {
    expect(sellCta()).toEqual({ href: "/vendre", label: "Vendre mon bien" });
  });

  it("« Mon compte » signed out comes back to the page, its filters included", () => {
    expect(signInLink("/acheter")).toEqual({
      href: "/connexion?next=%2Facheter",
      label: "Mon compte",
    });
    expect(signInLink("/acheter?ville=savigny-sur-orge&rayon=5").href).toBe(
      "/connexion?next=%2Facheter%3Fville%3Dsavigny-sur-orge%26rayon%3D5",
    );
    // Never back to a page outside the site.
    expect(signInLink("//evil.example").href).toBe("/connexion");
  });

  it("favourites lead to the buyer's list", () => {
    expect(FAVOURITES_LINK).toEqual({ href: "/acquereur/favoris", label: "Favoris" });
  });
});

describe("back office sidebar", () => {
  it("follows the order of AdminDesktop", () => {
    expect(summary(ADMIN_NAV_ITEMS)).toEqual([
      { href: "/admin", label: "Tableau de bord", icon: "layout-grid" },
      { href: "/admin/annonces", label: "Annonces", icon: "listings" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "users" },
      { href: "/admin/dossiers", label: "Dossiers", icon: "folder" },
      { href: "/admin/offres", label: "Offres", icon: "file" },
      { href: "/admin/signalements", label: "Signalements", icon: "flag" },
      { href: "/admin/assistant", label: "Assistant", icon: "sparkles" },
    ]);
  });

  it("shows no counter before the back office data (L1-19, L1-30)", () => {
    for (const item of ADMIN_NAV_ITEMS) expect(item.count).toBeUndefined();
  });
});

describe("current item: longest prefix of the path", () => {
  it("the tab of a sub-page, the deeper tab when two match", () => {
    const seller = bottomTabs("seller");
    expect(currentHref("/vendeur", seller)).toBe("/vendeur");
    // The page of a property is the file of the sale (L1-14).
    expect(currentHref("/vendeur/biens/5eed1000-0000-4000-8000-000000000001", seller)).toBe(
      "/vendeur/dossier",
    );
    expect(currentHref("/vendeur/biens/5eed1000-0000-4000-8000-000000000001/photos", seller)).toBe(
      "/vendeur/dossier",
    );
    expect(currentHref("/vendeur/dossier", seller)).toBe("/vendeur/dossier");
    expect(currentHref("/vendeur/dossier/pieces", seller)).toBe("/vendeur/dossier");
    expect(currentHref("/messages/123", seller)).toBe("/messages");
    expect(currentHref("/compte", seller)).toBe("/compte");
  });

  it("no tab for a page outside the bar", () => {
    expect(currentHref("/vendeurs", bottomTabs("seller"))).toBeNull();
    expect(currentHref("/acquereur", bottomTabs("buyer"))).toBeNull();
    expect(currentHref("/admin", bottomTabs("admin"))).toBeNull();
    expect(currentHref(null, bottomTabs("buyer"))).toBeNull();
    expect(currentHref("", bottomTabs("buyer"))).toBeNull();
  });

  it("ignores the query, the hash and a trailing slash", () => {
    const buyer = bottomTabs("buyer");
    expect(currentHref("/acheter?ville=epinay-sur-orge", buyer)).toBe("/acheter");
    expect(currentHref("/acquereur/favoris/#liste", buyer)).toBe("/acquereur/favoris");
  });

  it("back office: the dashboard only on /admin itself", () => {
    expect(currentHref("/admin", ADMIN_NAV_ITEMS)).toBe("/admin");
    expect(currentHref("/admin/annonces", ADMIN_NAV_ITEMS)).toBe("/admin/annonces");
    expect(currentHref("/admin/annonces/7f3c", ADMIN_NAV_ITEMS)).toBe("/admin/annonces");
    // A page without an item (/admin/messages joins with L1-34) lights none.
    expect(currentHref("/admin/messages", ADMIN_NAV_ITEMS)).toBeNull();
  });

  it("TopNav: « Acheter » on the search and on a listing, « Vendre » on its page only", () => {
    expect(currentHref("/acheter", TOP_NAV_LINKS)).toBe("/acheter");
    expect(currentHref("/annonce/maison-5-pieces-lk0002", TOP_NAV_LINKS)).toBe("/acheter");
    expect(currentHref("/vendre", TOP_NAV_LINKS)).toBe("/vendre");
    expect(currentHref("/", TOP_NAV_LINKS)).toBeNull();
    expect(currentHref("/estimer", TOP_NAV_LINKS)).toBe("/estimer");
    expect(currentHref("/vendeur", TOP_NAV_LINKS)).toBeNull();
    expect(currentHref("/annonces", TOP_NAV_LINKS)).toBeNull();
  });

  it("TopNav: « Qui sommes-nous » on its two pages, each of its links on its own", () => {
    const about = TOP_NAV_LINKS.find((link) => link.items);
    expect(currentHref("/qui-sommes-nous", TOP_NAV_LINKS)).toBe(about?.href);
    expect(currentHref("/investir", TOP_NAV_LINKS)).toBe(about?.href);
    expect(currentHref("/qui-sommes-nous", about?.items ?? [])).toBe("/qui-sommes-nous");
    expect(currentHref("/investir", about?.items ?? [])).toBe("/investir");
    expect(currentHref("/concept", TOP_NAV_LINKS)).toBeNull();
  });

  it("a group is current on the pages of its links and their sub-pages, without a match of its own", () => {
    const group: NavItem = {
      href: "/a",
      label: "A",
      items: [
        { href: "/a", label: "A" },
        { href: "/b", label: "B" },
        { href: "/c", label: "C", match: ["/d"] },
      ],
    };
    expect(currentHref("/b", [group])).toBe("/a");
    expect(currentHref("/c/x", [group])).toBe("/a");
    expect(currentHref("/d", [group])).toBe("/a");
    expect(currentHref("/e", [group])).toBeNull();
  });
});

describe("path helpers", () => {
  it("pathnameOf keeps the path alone", () => {
    expect(pathnameOf("/acheter?ville=x#y")).toBe("/acheter");
    expect(pathnameOf("/vendeur/")).toBe("/vendeur");
    expect(pathnameOf("/")).toBe("/");
    expect(pathnameOf("")).toBe("/");
    expect(pathnameOf("?a=1")).toBe("/");
  });

  it("matchesPath cuts on segments, « / » covers itself only", () => {
    expect(matchesPath("/admin/annonces", "/admin")).toBe(true);
    expect(matchesPath("/admin", "/admin")).toBe(true);
    expect(matchesPath("/administration", "/admin")).toBe(false);
    expect(matchesPath("/acheter", "/")).toBe(false);
    expect(matchesPath("/", "/")).toBe(true);
  });
});

describe("bell and account menu", () => {
  it("the empty panel speaks to its space, the gear leads to the preferences (L1-22)", () => {
    expect(notificationBell("seller")).toEqual({
      emptyText: fr.nav.notifications.emptySeller,
      // « Compléter mon annonce » (DESIGN.md 10.7, L1-14): the « Dossier » tab.
      emptyAction: { href: "/vendeur/dossier", label: "Compléter mon annonce" },
      settingsHref: "/compte/notifications",
    });
    expect(notificationBell("buyer").emptyAction).toBeUndefined();
    expect(notificationBell("buyer").emptyText).toBe(fr.nav.notifications.emptyBuyer);
    expect(notificationBell("admin")).toEqual({
      emptyText: fr.nav.notifications.emptyAdmin,
      emptyAction: {
        href: "/admin/annonces?statut=a-valider",
        label: "Voir les annonces à valider",
      },
      settingsHref: "/compte/notifications",
    });
    // The same address as the filter of the back office.
    expect(ROUTES.adminListingsToReview).toBe(adminListingsHref({ status: "pending" }));
  });

  it("the avatar shows the capital initial of the first name", () => {
    expect(accountInitial("alice")).toBe("A");
    expect(accountInitial("Élodie")).toBe("É");
    expect(accountInitial("  chloé ")).toBe("C");
    expect(accountInitial("")).toBeNull();
    expect(accountInitial("   ")).toBeNull();
    expect(accountInitial(null)).toBeNull();
  });

  it("« Cockpit » leads to the home of the role; an admin's is the back office", () => {
    // The Cockpit is the space of a client, the back office the one of an
    // admin (Younes, 2026-10-28). « Voir le site » is added by the back
    // office only (app/(admin)/admin/layout.tsx).
    expect(accountMenu({ firstName: "Cédric", roles: ["admin"] })).toEqual({
      initial: "C",
      homeHref: "/admin",
      homeLabel: "Back office",
      accountHref: "/compte",
    });
    expect(accountMenu({ firstName: "Alice", roles: ["seller"] }).homeHref).toBe("/vendeur");
    expect(accountMenu({ firstName: "Chloé", roles: ["buyer"] }).homeHref).toBe("/acquereur");
    expect(accountMenu({ firstName: null, roles: ["buyer", "seller"] })).toEqual({
      initial: null,
      homeHref: "/vendeur",
      homeLabel: "Cockpit",
      accountHref: "/compte",
    });
    expect(accountMenu({ firstName: "Cédric", roles: ["admin"] })).not.toHaveProperty(
      "cockpitHref",
    );
  });

  it("an admin who also sells or buys has their Cockpit after the back office (L1-64)", () => {
    expect(accountMenu({ firstName: "Younes", roles: ["admin", "seller"] })).toEqual({
      initial: "Y",
      homeHref: "/admin",
      homeLabel: "Back office",
      cockpitHref: "/vendeur",
      accountHref: "/compte",
    });
    expect(accountMenu({ firstName: "Younes", roles: ["buyer", "admin"] }).cockpitHref).toBe(
      "/acquereur",
    );
    expect(
      accountMenu({ firstName: "Younes", roles: ["admin", "buyer", "seller"] }).cockpitHref,
    ).toBe("/vendeur");
    // A client never has a second entry.
    expect(accountMenu({ firstName: "Alice", roles: ["seller", "buyer"] })).not.toHaveProperty(
      "cockpitHref",
    );
  });
});

describe("every link of the navigation leads to a page", () => {
  // Routes of the app directory: folders without route groups or private ones.
  const appDir = fileURLToPath(new URL("../../../app/", import.meta.url));
  const routes = new Set(
    readdirSync(appDir, { recursive: true })
      .map((entry) => String(entry).replaceAll("\\", "/"))
      .filter((entry) => entry === "page.tsx" || entry.endsWith("/page.tsx"))
      .map((entry) => {
        const segments = entry
          .split("/")
          .slice(0, -1)
          .filter((segment) => !/^\(.*\)$/.test(segment));
        return `/${segments.join("/")}`;
      }),
  );

  it.each([
    ...TOP_NAV_LINKS.flatMap((link) => link.items ?? [link]).map((link) => link.href),
    ...SITE_LINKS.map((link) => link.href),
    ...ADMIN_NAV_ITEMS.map((item) => item.href),
    ...SPACES.flatMap((space) => bottomTabs(space).map((tab) => tab.href)),
    ...bottomTabs("buyer", false).map((tab) => tab.href),
    sellCta().href,
    FAVOURITES_LINK.href,
    ROUTES.account,
  ])("%s", (href) => {
    expect(routes).toContain(pathnameOf(href));
  });
});
