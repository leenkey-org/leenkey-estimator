import { SiteMenu } from "@/components/shared/site-menu";
import { currentPath, getProfile } from "@/core/auth/session";
import { homePathForRoles } from "@/leenkey/auth/routes";
import { fr } from "@/lib/i18n/fr";
import { MENU_LINKS, ROUTES, sellCta, signInLink } from "../config";

const t = fr.site.menu;

/**
 * Mobile header of the public pages (G1, docs/DESIGN.md 11), built from the
 * session: « Vendre mon bien » as in the TopNav, then « Mon espace » once
 * signed in, « Mon compte » (the login page, back to this page) otherwise.
 */
export async function SiteMobileHeader() {
  const [profile, path] = await Promise.all([getProfile(), currentPath()]);
  const account = profile
    ? { href: homePathForRoles(profile.roles), label: t.mySpace }
    : { href: signInLink(path).href, label: t.signIn };
  return (
    <SiteMenu
      homeHref={ROUTES.home}
      label={fr.nav.label}
      links={MENU_LINKS}
      cta={sellCta(Boolean(profile))}
      account={account}
      texts={{ open: t.open, close: t.close }}
    />
  );
}
