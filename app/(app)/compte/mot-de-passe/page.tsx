import type { Metadata } from "next";
import { requireProfile } from "@/core/auth/session";
import { PasswordForm } from "@/leenkey/account/components/password-form";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAccount } from "@/lib/i18n/sections/account";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { account: frAccount } as const;

const t = fr.account.password;

export const metadata: Metadata = { title: t.metaTitle };

// The password of the account (L1-39): the current one checked first.
export default async function AccountPasswordPage() {
  const profile = await requireProfile();
  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.account, label: fr.account.back }}
    >
      <PasswordForm />
    </SpacePage>
  );
}
