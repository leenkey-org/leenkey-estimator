import Link from "next/link";
import { ClipboardList, Flag, Folder, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { SectionTitle } from "@/components/shared/section-title";
import { StatTile } from "@/components/shared/stat-tile";
import { requireAdmin } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/config";
import { adminMetadata } from "@/leenkey/admin/metadata";
import {
  adminActivity,
  adminCounts,
  adminTodo,
  type AdminTodoItem,
} from "@/leenkey/admin/dashboard/queries";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { formatInteger, formatPrice, formatWaiting } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { AdminPage } from "./_components/admin-page";

export const generateMetadata = adminMetadata({ title: fr.spaces.admin.metaTitle });

const t = fr.adminDashboard;

/** The 24 h target of the review of a listing (SPEC 17, DECISIONS 2026-10-15). */
const REVIEW_TARGET_MS = 24 * 60 * 60 * 1000;

const KIND: Record<AdminTodoItem["kind"], { icon: LucideIcon; label: string }> = {
  listing: { icon: ClipboardList, label: t.todo.kinds.listing },
  case: { icon: Folder, label: t.todo.kinds.case },
  report: { icon: Flag, label: t.todo.kinds.report },
};

/** Where an item is dealt with: its own page (cases and reports since L1-30c). */
function todoHref(item: AdminTodoItem): string {
  if (item.kind === "listing") return `/admin/annonces/${item.id}`;
  return item.kind === "case"
    ? `${ROUTES.adminCases}/${item.id}`
    : `${ROUTES.adminReports}/${item.id}`;
}

/** A counter of the dashboard, a link to where it is dealt with when it has one. */
function Tile({
  value,
  label,
  detail,
  late = false,
  href,
}: {
  value: string;
  label: string;
  detail?: string;
  late?: boolean;
  href?: string;
}) {
  const tile = (
    <StatTile
      value={value}
      label={label}
      detail={detail}
      detailTone={late ? "warning" : "muted"}
      className="h-full"
    />
  );
  return (
    <li className="min-w-0">
      {href ? (
        <Link
          href={href}
          className="block h-full rounded-lk-xl transition-colors duration-140 ease-out-lk hover:[&>div]:border-lk-line-strong"
        >
          {tile}
        </Link>
      ) : (
        tile
      )}
    </li>
  );
}

// L1-30a: the dashboard of the back office (SPEC-V2 section 17, template G7):
// what waits for the team (listings to review with the oldest one and the
// 24 h target, open cases, open reports, the messages of the customers not
// read, L1-34), the plans sold and the sign-ups of the last 30 days, then
// « À traiter », the oldest first. Not yet here, with their screens: the offers (L2) and
// the upgrade prompts (L2-09); the daily brief of the assistant (L1-30b). The
// page checks the admin role itself, not only the layout.
export default async function AdminHomePage() {
  const profile = await requireAdmin();
  const [counts, activity, todo] = await Promise.all([adminCounts(), adminActivity(), adminTodo()]);
  const now = new Date();
  const failed = !counts.ok || !activity.ok || !todo.ok;

  const oldest = counts.ok ? counts.data.listingsOldestSubmittedAt : null;
  const late = oldest !== null && now.getTime() - new Date(oldest).getTime() > REVIEW_TARGET_MS;

  return (
    <AdminPage title={fr.nav.admin.dashboard}>
      <p className="text-lk-title font-semibold text-lk-ink md:-mt-3">
        {t.greeting(profile.firstName)}
      </p>
      {failed ? (
        <InlineAlert
          tone="danger"
          action={
            <Link
              href={ROUTES.admin}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              {t.retry}
            </Link>
          }
        >
          {t.error}
        </InlineAlert>
      ) : null}

      {counts.ok || activity.ok ? (
        <ul
          aria-label={t.tiles.label}
          className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6"
        >
          {counts.ok ? (
            <>
              <Tile
                value={formatInteger(counts.data.listingsPending)}
                label={t.tiles.listings}
                detail={oldest ? t.tiles.oldest(formatWaiting(oldest, now), late) : t.tiles.none}
                late={late}
                href={ROUTES.adminListingsToReview}
              />
              <Tile
                value={formatInteger(counts.data.casesOpen)}
                label={t.tiles.cases}
                href={ROUTES.adminCases}
              />
              <Tile
                value={formatInteger(counts.data.reportsOpen)}
                label={t.tiles.reports}
                href={ROUTES.adminReports}
              />
              <Tile
                value={formatInteger(counts.data.advisorUnread)}
                label={t.tiles.messages}
                href={ROUTES.adminMessages}
              />
            </>
          ) : null}
          {activity.ok ? (
            <>
              <Tile
                value={formatInteger(activity.data.plansSold)}
                label={t.tiles.plans(activity.data.days)}
                detail={t.tiles.plansAmount(formatPrice(activity.data.plansAmountCents))}
              />
              <Tile
                value={formatInteger(activity.data.signups)}
                label={t.tiles.signups(activity.data.days)}
                detail={t.tiles.signupsSplit(
                  activity.data.signupsSellers,
                  activity.data.signupsBuyers,
                )}
                href={ROUTES.adminUsers}
              />
            </>
          ) : null}
        </ul>
      ) : null}

      {todo.ok ? (
        <section aria-labelledby="a-traiter" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <SectionTitle id="a-traiter">{t.todo.title}</SectionTitle>
            <p className="text-lk-secondary text-lk-ink-3">{t.todo.lead}</p>
          </div>
          {todo.data.length === 0 ? (
            <EmptyState className="py-8" title={t.todo.emptyTitle} description={t.todo.emptyText} />
          ) : (
            <ul className="flex flex-col overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface">
              {todo.data.map((item) => {
                const kind = KIND[item.kind];
                const Icon = kind.icon;
                const itemLate =
                  item.kind === "listing" &&
                  now.getTime() - new Date(item.since).getTime() > REVIEW_TARGET_MS;
                return (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="border-t border-lk-line first:border-t-0"
                  >
                    {/* A report: no prefetch, its sheet reads the conversation (traced). */}
                    <Link
                      href={todoHref(item)}
                      prefetch={item.kind === "report" ? false : undefined}
                      className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-lk-stone-2 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
                    >
                      {item.kind === "listing" ? (
                        // A property shows its photo (DESIGN.md 13.2, rule 3).
                        <PropertyThumb
                          src={item.coverPath ? photoUrl(item.coverPath) : null}
                          className="size-11"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex size-11 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue"
                        >
                          <Icon className="size-4.5" />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-lk-label font-semibold text-lk-ink">
                          {item.label}
                        </span>
                        <span className="text-lk-caption text-lk-ink-3">
                          {kind.label} ·{" "}
                          <span className={cn(itemLate && "font-semibold text-lk-warning")}>
                            {t.todo.since(formatWaiting(item.since, now))}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <p className="text-lk-caption text-lk-ink-3">{t.later}</p>
    </AdminPage>
  );
}
