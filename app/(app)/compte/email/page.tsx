import type { Metadata } from "next";
import { InlineAlert } from "@/components/shared/inline-alert";
import { getUser, requireProfile } from "@/core/auth/session";
import { EmailForm } from "@/leenkey/account/components/email-form";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../../_components/space-page";

const t = fr.account.email;

export const metadata: Metadata = { title: t.metaTitle };

// The address of the account and its change (L1-39), confirmed from both
// addresses (Supabase Auth, secure email change).
export default async function AccountEmailPage() {
  const profile = await requireProfile();
  const user = await getUser();
  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.account, label: fr.account.back }}
    >
      <dl className="mt-6 flex flex-col gap-0.5">
        <dt className="text-lk-caption text-lk-ink-3">{t.current}</dt>
        <dd className="break-all text-lk-body font-semibold text-lk-ink">{user?.email}</dd>
      </dl>
      {user?.new_email ? (
        <InlineAlert tone="warning" className="mt-4">
          {t.pending(user.new_email)}
        </InlineAlert>
      ) : null}
      <EmailForm />
    </SpacePage>
  );
}
