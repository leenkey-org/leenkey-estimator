import type { Metadata } from "next";
import { Button } from "@/components/shared/button";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireProfile } from "@/core/auth/session";
import { signOut } from "@/leenkey/auth/actions";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../_components/space-page";

const t = fr.placeholders.account;

export const metadata: Metadata = { title: t.metaTitle };

// Placeholder until the account page (L1-39). On mobile, the « Compte » tab
// is the only way to sign out: the account menu sits in the TopNav.
export default async function AccountPage() {
  await requireProfile();
  return (
    <SpacePage title={t.title}>
      <ComingSoon
        className="mt-6"
        title={t.comingTitle}
        text={t.comingText}
        action={
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              {fr.spaces.signOut}
            </Button>
          </form>
        }
      />
    </SpacePage>
  );
}
