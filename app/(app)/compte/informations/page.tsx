import type { Metadata } from "next";
import { InlineAlert } from "@/components/shared/inline-alert";
import { getUser, requireProfile } from "@/core/auth/session";
import { IdentityForm } from "@/leenkey/account/components/identity-form";
import { accountOverview } from "@/leenkey/account/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAccount } from "@/lib/i18n/sections/account";
import { frAuth } from "@/lib/i18n/sections/auth";
import { createClient } from "@/lib/supabase/server";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { account: frAccount, auth: frAuth } as const;

const t = fr.account.identity;

export const metadata: Metadata = { title: t.metaTitle };

// First name, last name and phone of the account (L1-39).
export default async function AccountIdentityPage() {
  const profile = await requireProfile();
  const user = await getUser();
  const account = user ? await accountOverview(await createClient(), user) : null;
  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.account, label: fr.account.back }}
    >
      {account ? (
        <IdentityForm
          initial={{
            firstName: account.firstName ?? "",
            lastName: account.lastName ?? "",
            phone: account.phone ?? "",
          }}
        />
      ) : (
        <InlineAlert tone="danger" className="mt-6">
          {fr.auth.errors.generic}
        </InlineAlert>
      )}
    </SpacePage>
  );
}
