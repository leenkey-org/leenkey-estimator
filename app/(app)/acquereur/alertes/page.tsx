import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { AlertsList } from "@/leenkey/alerts/components/alerts-list";
import { listAlerts } from "@/leenkey/alerts/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { notificationPreferences } from "@/leenkey/notifications/queries";
import { frAlerts } from "@/lib/i18n/sections/alerts";
import { createClient } from "@/lib/supabase/server";
import { ALERTS_MAX } from "@/lib/validations/alert";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { alerts: frAlerts } as const;

const t = fr.alerts.page;

export const metadata: Metadata = { title: t.metaTitle };

// L3-06: the alerts of the buyer (SPEC-V2 16): each a search kept under a
// name, 5 at most, with its criteria, the way to its listings, a switch
// that pauses it, its new name and its deletion. An alert is created from
// the search page (« Créer une alerte ») or with the assistant.
export default async function BuyerAlertsPage() {
  const profile = await requireProfile();
  const [alerts, preferences] = await Promise.all([
    listAlerts(profile.id),
    notificationPreferences(await createClient(), profile.id),
  ]);
  const count = alerts.ok ? alerts.data.length : 0;

  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.buyer, label: t.back }}
    >
      <p className="mt-3 text-lk-secondary text-pretty text-lk-ink-2">{t.intro}</p>
      {!alerts.ok ? (
        <InlineAlert tone="danger" className="mt-6">
          {t.loadError}
        </InlineAlert>
      ) : count === 0 ? (
        <EmptyState
          className="mt-12"
          title={t.empty.title}
          description={t.empty.text}
          action={
            <Button asChild>
              <Link href={ROUTES.search}>{t.empty.action}</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {preferences && !preferences.email_alerts ? (
            <InlineAlert
              tone="warning"
              action={
                <Link
                  href={ROUTES.notificationSettings}
                  className="font-semibold underline underline-offset-2 hover:no-underline"
                >
                  {t.emailsOffAction}
                </Link>
              }
            >
              {t.emailsOff}
            </InlineAlert>
          ) : null}
          <p className="text-lk-secondary font-semibold tabular text-lk-ink">
            <span aria-hidden="true">{fr.alerts.count(count, ALERTS_MAX)}</span>
            <span className="sr-only">{fr.alerts.countLabel(count, ALERTS_MAX)}</span>
          </p>
          <AlertsList alerts={alerts.data} />
          {count >= ALERTS_MAX ? (
            <p className="text-lk-caption text-lk-ink-3">{t.full(ALERTS_MAX)}</p>
          ) : (
            <Button asChild variant="secondary" className="self-start">
              <Link href={ROUTES.search}>{t.empty.action}</Link>
            </Button>
          )}
        </div>
      )}
    </SpacePage>
  );
}
