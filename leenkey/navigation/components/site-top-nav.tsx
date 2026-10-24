import { TopNav, type TopNavAccount } from "@/components/shared/top-nav";
import { currentPath, getProfile } from "@/core/auth/session";
import { signOut } from "@/leenkey/auth/actions";
import { fr } from "@/lib/i18n/fr";
import {
  accountMenu,
  FAVOURITES_LINK,
  ROUTES,
  sellCta,
  signInLink,
  TOP_NAV_LINKS,
} from "../config";
import { SpaceNotificationBell } from "./space";

/**
 * TopNav of the public pages and the signed-in areas (docs/DESIGN.md 10.6),
 * built from the session: avatar, bell and favourites when signed in,
 * « Mon compte » back to this page otherwise. Shown from 768 px.
 */
export async function SiteTopNav() {
  const [profile, path] = await Promise.all([getProfile(), currentPath()]);
  const account: TopNavAccount = profile
    ? {
        signedIn: true,
        notifications: (
          <SpaceNotificationBell roles={profile.roles} profileId={profile.id} size="nav" />
        ),
        favourites: FAVOURITES_LINK,
        menu: { ...accountMenu(profile), signOut },
      }
    : { signedIn: false, ...signInLink(path) };
  return (
    <TopNav
      homeHref={ROUTES.home}
      label={fr.nav.label}
      links={TOP_NAV_LINKS}
      cta={sellCta(Boolean(profile))}
      account={account}
    />
  );
}
