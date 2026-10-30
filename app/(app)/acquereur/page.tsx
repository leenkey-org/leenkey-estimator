import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandPanel } from "@/components/shared/brand-panel";
import { Button } from "@/components/shared/button";
import { FinancingBadge, type FinancingStatus } from "@/components/shared/financing-badge";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PropertyCard } from "@/components/shared/property-card";
import { TaskList } from "@/components/shared/task-list";
import { requireProfile } from "@/core/auth/session";
import { LastSearchCard } from "@/leenkey/buyers/components/last-search-card";
import { buyerFile, type BuyerFile } from "@/leenkey/buyers/file";
import { buyerProfile } from "@/leenkey/buyers/queries";
import { FavoriteButton } from "@/leenkey/favorites/components/favorite-button";
import { listFavorites } from "@/leenkey/favorites/queries";
import { buyerSignUpHref, listingSummary } from "@/leenkey/listings/presentation";
import { RecentConversations } from "@/leenkey/messaging/components/recent-conversations";
import { listConversations } from "@/leenkey/messaging/queries";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { toPropertyCard } from "@/leenkey/search/cards";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.spaces.buyer.metaTitle };

const t = fr.buyerSpace.home;

/** A section of the home, its title and an optional link on its right. */
function Section({
  id,
  title,
  link,
  children,
}: {
  id: string;
  title: string;
  link?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-lk-h3 font-bold text-wide text-lk-ink">
          {title}
        </h2>
        {link ? (
          <Link
            href={link.href}
            // 44 px of target (DESIGN.md 15), the text on the line of the title.
            className="-my-3 inline-flex min-h-11 shrink-0 items-center rounded-lk-sm text-lk-label font-semibold text-lk-blue underline underline-offset-2 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A section without content yet: one line, what fills it. */
function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lk-xl border border-lk-line bg-lk-surface px-4 py-3.5 text-lk-compact text-lk-ink-3">
      {children}
    </p>
  );
}

/**
 * « Pour vous » (DESIGN.md 12.10): the file of the buyer, its steps done out
 * of all of them, its status as a seller sees it, the way to complete it.
 * The proof of financing (L2-02) and the alerts (L3) come with their tasks.
 */
function FileBlock({ file, status }: { file: BuyerFile; status: FinancingStatus }) {
  const current = file.steps.find((step) => !step.done)?.key;
  return (
    // 820 px at most: its lines and its text stay readable on a wide screen.
    <section aria-labelledby="dossier" className="flex max-w-205 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-lk-caption font-semibold text-lk-ink-3">{t.file.label}</p>
        <h2 id="dossier" className="text-lk-h3 font-bold text-wide text-lk-ink">
          {t.file.title}
        </h2>
      </div>
      <div className="flex flex-col gap-4 rounded-lk-xl bg-lk-stone-2 p-4.5 md:p-6">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-13 shrink-0 items-center justify-center rounded-lk-sm bg-lk-surface text-lk-title font-bold tabular text-lk-ink"
          >
            {t.file.count(file.done, file.total)}
          </span>
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <h3 className="text-lk-body font-semibold text-lk-ink">
              {t.file.heading}
              <span className="sr-only"> : {t.file.countLabel(file.done, file.total)}</span>
            </h3>
            <FinancingBadge status={status} />
          </div>
        </div>
        <TaskList
          stateLabels={t.file.states}
          items={file.steps.map((step) => ({
            id: step.key,
            title: t.file.items[step.key],
            state: step.done ? "done" : step.key === current ? "current" : "todo",
            href: step.done ? null : ROUTES.buyerProfile,
          }))}
        />
        <p className="text-lk-compact text-lk-ink-2">{t.file.text}</p>
        <Button
          asChild
          variant={file.complete ? "outline-ink" : "primary"}
          className="md:self-start"
        >
          <Link href={ROUTES.buyerProfile}>{file.complete ? t.file.edit : t.file.complete}</Link>
        </Button>
      </div>
    </section>
  );
}

// The buyer home (L1-25, SPEC-V2 8.9, docs/DESIGN.md 12.10): the greeting on
// the brand panel, the last search of this browser over its bottom edge,
// the file of the buyer first while it is not complete, their favourites,
// their conversations, the services; a complete file goes to the end. The
// visits and offers (L2, L3), the alerts (L3) and the assistant (L2-08)
// come with their tasks.
export default async function BuyerHomePage() {
  const profile = await requireProfile();
  // Before the reads: a heart changed since then wins (favorite-store.ts).
  const checkedAt = Date.now();
  const [project, favourites, conversations] = await Promise.all([
    buyerProfile(profile.id),
    listFavorites(profile.id),
    listConversations(),
  ]);
  const now = new Date(checkedAt);
  const file = project.ok ? buyerFile(project.data) : null;
  const status = project.ok ? (project.data?.financingStatus ?? "not_provided") : "not_provided";
  const saved = favourites.ok ? favourites.data.items : [];
  const recent = conversations.ok
    ? conversations.data.filter((conversation) => conversation.role === "buyer").slice(0, 3)
    : [];
  const failed = !project.ok || !favourites.ok || !conversations.ok;
  const fileBlock = file ? <FileBlock file={file} status={status} /> : null;

  return (
    <div className="pb-10 md:pb-14">
      <BrandPanel
        variant="blue"
        titleSize="page"
        title={fr.spaces.greeting(profile.firstName)}
        description={t.description}
        illustration
        corner={<SpaceNotificationBell roles={profile.roles} profileId={profile.id} tone="dark" />}
        className="pb-8"
      />
      <div className="lk-frame flex flex-col gap-9">
        {/* Over the bottom edge of the panel (DESIGN.md 12.10). */}
        <LastSearchCard className="relative -mt-14 w-full max-w-150" />

        {failed ? (
          <InlineAlert
            tone="danger"
            action={
              <Link
                href={ROUTES.buyer}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {fr.properties.sheet.retry}
              </Link>
            }
          >
            {t.error}
          </InlineAlert>
        ) : null}

        {file && !file.complete ? fileBlock : null}

        {favourites.ok ? (
          <Section
            id="favoris"
            title={t.favorites.title}
            link={
              saved.length > 0
                ? { href: ROUTES.favourites, label: t.favorites.all(saved.length) }
                : undefined
            }
          >
            {saved.length > 0 ? (
              <ul
                aria-label={fr.favorites.page.list}
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              >
                {saved.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <PropertyCard
                      variant="compact"
                      {...toPropertyCard(item, now)}
                      action={
                        <FavoriteButton
                          listingId={item.id}
                          favorite
                          checkedAt={checkedAt}
                          signUpHref={buyerSignUpHref(item.slug)}
                          property={`${listingSummary(item)}, ${item.city}`}
                        />
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{t.favorites.empty}</Empty>
            )}
          </Section>
        ) : null}

        <div className="grid grid-cols-1 gap-9 lg:grid-cols-2 lg:items-start lg:gap-6">
          {conversations.ok ? (
            <Section
              id="conversations"
              title={t.conversations.title}
              link={
                recent.length > 0
                  ? { href: ROUTES.messages, label: t.conversations.all }
                  : undefined
              }
            >
              {recent.length > 0 ? (
                <RecentConversations conversations={recent} now={now} />
              ) : (
                <Empty>{t.conversations.empty}</Empty>
              )}
            </Section>
          ) : null}
          <Section id="services" title={t.services.title}>
            <div className="flex flex-wrap gap-2.5">
              <Button asChild variant="outline-ink" size="sm">
                <Link href={ROUTES.valuation}>{t.services.valuation}</Link>
              </Button>
            </div>
          </Section>
        </div>

        {file?.complete ? fileBlock : null}
      </div>
    </div>
  );
}
