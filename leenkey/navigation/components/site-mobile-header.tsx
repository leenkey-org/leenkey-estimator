import { SiteMenu } from "@/components/shared/site-menu";
import { currentPath, getProfile } from "@/core/auth/session";
import { fr } from "@/lib/i18n/fr";
import { accountMenu, MENU_LINKS, ROUTES, sellCta, signInLink } from "../config";

const t = fr.site.menu;

/**
 * Mobile header of the public pages (G1, docs/DESIGN.md 11), built from the
 * session: « Vendre mon bien » as in the TopNav, then the space of the
 * account once signed in (« Mon espace », the « Cockpit » of an admin, as in
 * the account menu), « Mon compte » (the login page, back to this page)
 * otherwise.
 */
export async function SiteMobileHeader({
  tone = "light",
  panelClassName,
}: { tone?: "light" | "night"; panelClassName?: string } = {}) {
  const [profile, path] = await Promise.all([getProfile(), currentPath()]);
  const menu = profile ? accountMenu(profile) : null;
  const account = menu
    ? { href: menu.homeHref, label: menu.homeLabel }
    : { href: signInLink(path).href, label: t.signIn };
  return (
    <SiteMenu
      homeHref={ROUTES.home}
      label={fr.nav.label}
      links={MENU_LINKS}
      cta={sellCta()}
      account={account}
      texts={{ open: t.open, close: t.close }}
      tone={tone}
      panelClassName={panelClassName}
    />
  );
}
