import type { Metadata } from "next";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { NotificationPreferencesForm } from "@/leenkey/notifications/components/notification-preferences-form";
import { notificationPreferences } from "@/leenkey/notifications/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { SpacePage } from "../../_components/space-page";

const t = fr.notifications.preferences;

export const metadata: Metadata = { title: t.metaTitle };

// The email preferences (L1-22), from the gear of the bell and the footer of
// the emails; the page /compte takes them in with L1-39.
export default async function NotificationSettingsPage() {
  const profile = await requireProfile();
  const preferences = await notificationPreferences(await createClient(), profile.id);
  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.account, label: t.back }}
    >
      <p className="mt-2 max-w-lk-prose text-lk-body text-lk-ink-2">{t.lead}</p>
      {preferences ? (
        <NotificationPreferencesForm
          initial={preferences}
          seller={profile.roles.includes("seller")}
        />
      ) : (
        <InlineAlert tone="danger" className="mt-6">
          {t.loadError}
        </InlineAlert>
      )}
    </SpacePage>
  );
}
