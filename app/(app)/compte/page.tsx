import type { Metadata } from "next";
import { Button } from "@/components/shared/button";
import { CookieSettingsButton } from "@/components/shared/cookie-settings-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { SavedNotice } from "@/components/shared/saved-notice";
import { SectionTitle } from "@/components/shared/section-title";
import { getUser, requireProfile } from "@/core/auth/session";
import {
  AccountRow,
  AccountSection,
  accountRowClass,
} from "@/leenkey/account/components/account-list";
import { RoleRows } from "@/leenkey/account/components/role-rows";
import { accountOverview } from "@/leenkey/account/queries";
import { signOut } from "@/leenkey/auth/actions";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { SpacePage } from "../_components/space-page";

const t = fr.account;

export const metadata: Metadata = { title: t.metaTitle };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SAVED: Record<string, string> = {
  informations: t.saved.identity,
  email: t.saved.email,
  "mot-de-passe": t.saved.password,
};

// « Mon compte » (L1-39, SPEC-V2 8.14, DESIGN.md 13.1 G9): what the account
// holds, in rows of 56 px, each to the page that changes it; the spaces of
// the account (« Je vends », « J'achète »), cookies, sign-out, and how to
// close the account until its deletion from here (L2-10).
export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const [profile, params] = await Promise.all([requireProfile(), searchParams]);
  const user = await getUser();
  const account = user ? await accountOverview(await createClient(), user) : null;
  const saved = typeof params.modifie === "string" ? SAVED[params.modifie] : undefined;
  const fullName = [account?.firstName, account?.lastName].filter(Boolean).join(" ");

  return (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id}>
      {saved ? (
        <div className="mt-6">
          <SavedNotice text={saved} />
        </div>
      ) : null}
      {!account ? (
        <InlineAlert tone="danger" className="mt-6">
          {fr.auth.errors.generic}
        </InlineAlert>
      ) : (
        <>
          <AccountSection id="compte-informations" title={t.sections.identity}>
            <AccountRow
              href="/compte/informations"
              label={t.rows.name}
              value={fullName || t.notSet}
            />
            <AccountRow
              href="/compte/informations"
              label={t.rows.phone}
              value={account.phone || t.notSet}
            />
          </AccountSection>

          <AccountSection id="compte-connexion" title={t.sections.signIn}>
            <AccountRow
              href="/compte/email"
              label={t.rows.email}
              value={account.email ?? t.notSet}
              detail={account.newEmail ? t.emailPending(account.newEmail) : null}
            />
            <AccountRow
              href="/compte/mot-de-passe"
              label={t.rows.password}
              value={t.rows.passwordValue}
            />
          </AccountSection>

          <AccountSection id="compte-notifications" title={t.sections.notifications}>
            <AccountRow
              href={ROUTES.notificationSettings}
              label={t.rows.notifications}
              value={t.rows.notificationsValue}
            />
          </AccountSection>

          <AccountSection id="compte-espaces" title={t.sections.spaces}>
            <RoleRows roles={account.roles.filter((role) => role !== "admin")} />
          </AccountSection>

          <AccountSection id="compte-cookies" title={t.sections.privacy}>
            <li>
              <CookieSettingsButton
                className={`${accountRowClass} text-lk-label font-semibold text-lk-ink`}
              />
            </li>
          </AccountSection>

          <form action={signOut} className="mt-8">
            <Button type="submit" variant="secondary" className="w-full md:w-auto">
              {fr.spaces.signOut}
            </Button>
          </form>

          <section
            aria-labelledby="compte-fermer"
            className="mt-10 flex flex-col gap-2 border-t border-lk-line pt-6"
          >
            <SectionTitle id="compte-fermer">{t.sections.close}</SectionTitle>
            <p className="text-lk-secondary text-lk-ink-2">
              {t.closeText.before}
              <a
                href={`mailto:${fr.legal.contactEmail}`}
                className="rounded-lk-sm font-semibold text-lk-blue underline underline-offset-2 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue"
              >
                {fr.legal.contactEmail}
              </a>
              {t.closeText.after}
            </p>
          </section>
        </>
      )}
    </SpacePage>
  );
}
