import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireProfile } from "@/core/auth/session";
import { signOut } from "@/leenkey/auth/actions";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../_components/space-page";

const t = fr.placeholders.account;

export const metadata: Metadata = { title: t.metaTitle };

// Placeholder until the account page (L1-39), with the way to the email
// preferences (L1-22). On mobile, the « Compte » tab is the only way to sign
// out: the account menu sits in the TopNav.
export default async function AccountPage() {
  const profile = await requireProfile();
  return (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id}>
      <Link
        href={ROUTES.notificationSettings}
        className="mt-6 flex min-h-14 items-center gap-3 rounded-lk-md border border-lk-line bg-lk-surface px-4 py-3 text-lk-ink transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
      >
        <Bell aria-hidden="true" className="size-4.5 shrink-0 text-lk-ink-2" />
        <span className="min-w-0 flex-1 text-lk-compact font-semibold">
          {fr.notifications.preferences.title}
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-lk-ink-3" />
      </Link>
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
