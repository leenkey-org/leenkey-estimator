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
  bottomTabs,
  FAVOURITES_LINK,
  followSpace,
  notificationBell,
  ownSpace,
  ROUTES,
  sellCta,
  signInLink,
  spaceFor,
  TOP_NAV_LINKS,
  type Space,
} from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";

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

describe("bottom tabs (DESIGN.md 10.6)", () => {
  it("seller: Ma vente, Dossier, Messages, Compte", () => {
    expect(summary(bottomTabs("seller"))).toEqual([
      { href: "/vendeur", label: "Ma vente", icon: "dashboard" },
      { href: "/vendeur/dossier", label: "Dossier", icon: "file" },
      { href: "/messages", label: "Messages", icon: "message" },
      { href: "/compte", label: "Compte", icon: "user" },
    ]);
  });

  it("buyer: Chercher, Favoris, Messages, Compte", () => {
    expect(summary(bottomTabs("buyer"))).toEqual([
      { href: "/acheter", label: "Chercher", icon: "search" },
      { href: "/acquereur/favoris", label: "Favoris", icon: "heart" },
      { href: "/messages", label: "Messages", icon: "message" },
      { href: "/compte", label: "Compte", icon: "user" },
    ]);
  });

  it("admin: Annonces, Dossiers, Utilisateurs, Assistant", () => {
    expect(summary(bottomTabs("admin"))).toEqual([
      { href: "/admin/annonces", label: "Annonces", icon: "listings" },
      { href: "/admin/dossiers", label: "Dossiers", icon: "folder" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "users" },
      { href: "/admin/assistant", label: "Assistant", icon: "sparkles" },
    ]);
  });

  it("always four tabs, with a known icon", () => {
    for (const space of SPACES) {
      const tabs = bottomTabs(space);
      expect(tabs).toHaveLength(4);
      for (const tab of tabs) expect(NAV_ICONS).toContain(tab.icon);
    }
  });
});

describe("TopNav", () => {
  it("links: Acheter, Vendre (the V1 landing page), Valoriser mon bien; no Guides", () => {
    expect(TOP_NAV_LINKS.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: "/acheter", label: "Acheter" },
      { href: "/", label: "Vendre" },
      { href: "/estimer", label: "Valoriser mon bien" },
    ]);
  });

  it("never says « estimer » nor « estimation » (CLAUDE.md section 16)", () => {
    const labels = [
      ...TOP_NAV_LINKS,
      ...ADMIN_NAV_ITEMS,
      ...SPACES.flatMap((space) => bottomTabs(space)),
    ].map((item) => item.label);
    for (const label of labels) expect(label).not.toMatch(/estim/i);
  });

  it("« Vendre mon bien »: the seller sign-up, or the seller area once signed in", () => {
    expect(sellCta(false)).toEqual({ href: "/inscription?role=seller", label: "Vendre mon bien" });
    expect(sellCta(true)).toEqual({ href: "/vendeur", label: "Vendre mon bien" });
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
    expect(currentHref("/vendeur/biens/nouveau", seller)).toBe("/vendeur");
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

  it("TopNav: « Acheter » on the search and on a listing, « / » only on itself", () => {
    expect(currentHref("/acheter", TOP_NAV_LINKS)).toBe("/acheter");
    expect(currentHref("/annonce/maison-5-pieces-lk0002", TOP_NAV_LINKS)).toBe("/acheter");
    expect(currentHref("/", TOP_NAV_LINKS)).toBe("/");
    expect(currentHref("/estimer", TOP_NAV_LINKS)).toBe("/estimer");
    expect(currentHref("/vendeur", TOP_NAV_LINKS)).toBeNull();
    expect(currentHref("/annonces", TOP_NAV_LINKS)).toBeNull();
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
  it("nothing unread before the notifications (L1-22), text by space", () => {
    expect(notificationBell("seller")).toEqual({
      count: 0,
      emptyText: fr.nav.notifications.emptySeller,
      settingsHref: "/compte",
    });
    expect(notificationBell("buyer").emptyText).toBe(fr.nav.notifications.emptyBuyer);
    expect(notificationBell("admin").emptyText).toBe(fr.nav.notifications.emptyBuyer);
  });

  it("the avatar shows the capital initial of the first name", () => {
    expect(accountInitial("alice")).toBe("A");
    expect(accountInitial("Élodie")).toBe("É");
    expect(accountInitial("  chloé ")).toBe("C");
    expect(accountInitial("")).toBeNull();
    expect(accountInitial("   ")).toBeNull();
    expect(accountInitial(null)).toBeNull();
  });

  it("« Mon espace » leads to the home of the role", () => {
    expect(accountMenu({ firstName: "Cédric", roles: ["admin"] })).toEqual({
      initial: "C",
      homeHref: "/admin",
      accountHref: "/compte",
    });
    expect(accountMenu({ firstName: "Alice", roles: ["seller"] }).homeHref).toBe("/vendeur");
    expect(accountMenu({ firstName: "Chloé", roles: ["buyer"] }).homeHref).toBe("/acquereur");
    expect(accountMenu({ firstName: null, roles: ["buyer", "seller"] })).toEqual({
      initial: null,
      homeHref: "/vendeur",
      accountHref: "/compte",
    });
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
    ...TOP_NAV_LINKS.map((link) => link.href),
    ...ADMIN_NAV_ITEMS.map((item) => item.href),
    ...SPACES.flatMap((space) => bottomTabs(space).map((tab) => tab.href)),
    sellCta(false).href,
    sellCta(true).href,
    FAVOURITES_LINK.href,
    ROUTES.account,
  ])("%s", (href) => {
    expect(routes).toContain(pathnameOf(href));
  });
});
