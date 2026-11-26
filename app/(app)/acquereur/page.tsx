import { buyerAssistantHref } from "@/leenkey/ai/components/assistant-ask-link";
import { AssistantHeaderLink } from "@/leenkey/ai/components/assistant-header-link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { BuyerOffersList } from "@/leenkey/offers/components/buyer-offers-list";
import { buyerOffers } from "@/leenkey/offers/queries";
import { listConversations } from "@/leenkey/messaging/queries";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { toPropertyCard } from "@/leenkey/search/cards";
import { BuyerVisitsList } from "@/leenkey/visits/components/buyer-visits-list";
import { buyerUpcomingVisits } from "@/leenkey/visits/queries";
import { frAlerts } from "@/lib/i18n/sections/alerts";
import { frBuyerSpace } from "@/lib/i18n/sections/buyerSpace";
import { frFavorites } from "@/lib/i18n/sections/favorites";
import { frOffer } from "@/lib/i18n/sections/offer";
import { frProperties } from "@/lib/i18n/sections/properties";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { frVisits } from "@/lib/i18n/sections/visits";
import { frSpaces } from "@/lib/i18n/sections/spaces";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = {
  alerts: frAlerts,
  buyerSpace: frBuyerSpace,
  favorites: frFavorites,
  offer: frOffer,
  properties: frProperties,
  spaces: frSpaces,
  saleFile: frSaleFile,
  visits: frVisits,
} as const;

export const metadata: Metadata = { title: fr.spaces.buyer.metaTitle };

const t = fr.buyerSpace.home;

const cardClass = "rounded-lk-2xl border border-lk-line bg-lk-surface p-5 md:p-6";

const linkClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lk-sm text-lk-label font-semibold text-lk-blue hover:underline hover:underline-offset-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid";

/** A text link of a card, its arrow after it. */
function ArrowLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(linkClass, className)}>
      {label}
      <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
    </Link>
  );
}

/**
 * A card of the home (2026-11-26): its title, the number of its lines after
 * it (« Vos favoris · 3 »), an optional link on its right, then its content.
 * The section is named by its title alone.
 */
function Section({
  id,
  title,
  count,
  link,
  className,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  link?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(cardClass, "flex min-w-0 flex-col gap-3", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-lk-h3 font-bold text-wide text-lk-ink lg:text-lk-h3-lg">
          <span id={id}>{title}</span>
          {count === undefined ? null : (
            <span className="font-medium tabular text-lk-ink-3"> · {count}</span>
          )}
        </h2>
        {link ? (
          // 44 px of target (DESIGN.md 15), the text on the line of the title.
          <ArrowLink {...link} className="-my-3 shrink-0" />
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A card without content yet: one line, what fills it. */
function Empty({ children }: { children: ReactNode }) {
  return <p className="text-lk-compact text-pretty text-lk-ink-2">{children}</p>;
}

/**
 * « Pour vous » (DESIGN.md 12.10): the file of the buyer, its steps done out
 * of all of them, its status as a seller sees it, the way to complete it.
 * The proof of financing (L2-02) and the alerts (L3) come with their tasks.
 */
function FileBlock({ file, status }: { file: BuyerFile; status: FinancingStatus }) {
  const current = file.steps.find((step) => !step.done)?.key;
  return (
    <section aria-labelledby="dossier" className={cn(cardClass, "flex min-w-0 flex-col gap-4")}>
      <div className="flex flex-col gap-1">
        <p className="text-lk-caption font-semibold text-lk-ink-3">{t.file.label}</p>
        <h2 id="dossier" className="text-lk-h3 font-bold text-wide text-lk-ink">
          {t.file.title}
        </h2>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-13 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-title font-bold tabular text-lk-blue-dark"
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
        <p className="max-w-lk-prose text-lk-compact text-pretty text-lk-ink-2">{t.file.text}</p>
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

// The buyer home (L1-25, SPEC-V2 8.9, docs/DESIGN.md 12.10), laid out on
// 2026-11-26 after the model Younes gave (DECISIONS.md): the greeting and its
// sentence, the last search of this browser on the one tinted panel of the
// page, then bordered cards: the file of the buyer first while it is not
// complete, their visits and their offers once they have some, their
// favourites, then two by two their conversations, their alerts, the
// documents shared with them and the services; a complete file goes to the
// end. From 1 024 px the column of the space is on the left (SpaceSidebar).
export default async function BuyerHomePage() {
  const profile = await requireProfile();
  // Before the reads: a heart changed since then wins (favorite-store.ts).
  const checkedAt = Date.now();
  const [project, favourites, conversations, offers, visits] = await Promise.all([
    buyerProfile(profile.id),
    listFavorites(profile.id),
    listConversations(),
    buyerOffers(profile.id),
    buyerUpcomingVisits(profile.id),
  ]);
  const now = new Date(checkedAt);
  const file = project.ok ? buyerFile(project.data) : null;
  const status = project.ok ? (project.data?.financingStatus ?? "not_provided") : "not_provided";
  const saved = favourites.ok ? favourites.data.items : [];
  const recent = conversations.ok
    ? conversations.data.filter((conversation) => conversation.role === "buyer").slice(0, 3)
    : [];
  const failed = !project.ok || !favourites.ok || !conversations.ok || !offers.ok;
  const fileBlock = file ? <FileBlock file={file} status={status} /> : null;

  const buyerConversations = conversations.ok
    ? conversations.data.filter((conversation) => conversation.role === "buyer").length
    : 0;

  return (
    <div className="lk-frame flex flex-col gap-6 py-8 md:py-10 lg:group-has-[>aside]/space:mx-0 lg:max-w-lk-space lg:gap-7">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">
            {fr.spaces.greeting(profile.firstName)}
          </h1>
          <p className="text-lk-body text-pretty text-lk-ink-2">{t.description}</p>
        </div>
        {/* The assistant beside the bell on a phone (L2-06); from 768 px, AssistantFab and the TopNav. */}
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <AssistantHeaderLink href={buyerAssistantHref()} tone="light" />
          <SpaceNotificationBell roles={profile.roles} profileId={profile.id} />
        </div>
      </div>

      {/* The one tinted panel of the page: the search to resume, or the way to the listings. */}
      <LastSearchCard />

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

      {/* Only once a visit is booked: nothing to say to a buyer who has none. */}
      {visits.ok && visits.data.length > 0 ? (
        <Section id="visites" title={fr.visits.home.title} count={visits.data.length}>
          <BuyerVisitsList visits={visits.data} />
        </Section>
      ) : null}

      {/* Only once an offer exists. */}
      {offers.ok && offers.data.length > 0 ? (
        <Section id="offres" title={fr.offer.followUp.list.title} count={offers.data.length}>
          <BuyerOffersList offers={offers.data} />
        </Section>
      ) : null}

      {favourites.ok ? (
        <Section
          id="favoris"
          title={t.favorites.title}
          count={saved.length}
          link={
            saved.length > 0
              ? { href: ROUTES.favourites, label: t.favorites.all(saved.length) }
              : undefined
          }
        >
          {saved.length > 0 ? (
            <ul
              aria-label={fr.favorites.page.list}
              className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3"
            >
              {saved.slice(0, 3).map((item) => (
                <li key={item.id} className="min-w-0">
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start lg:gap-7">
        {conversations.ok ? (
          <Section
            id="conversations"
            title={t.conversations.title}
            count={buyerConversations}
            link={
              recent.length > 0 ? { href: ROUTES.messages, label: t.conversations.all } : undefined
            }
          >
            {recent.length > 0 ? (
              <RecentConversations conversations={recent} now={now} />
            ) : (
              <Empty>{t.conversations.empty}</Empty>
            )}
          </Section>
        ) : null}
        {/* The searches kept, their new listings sent by email (L3-06). */}
        <Section id="alertes" title={fr.alerts.page.list}>
          <Empty>{fr.alerts.page.intro}</Empty>
          <ArrowLink
            href={ROUTES.buyerAlerts}
            label={fr.alerts.page.homeLink}
            className="-mb-3 self-start"
          />
        </Section>
        {/* The documents sellers shared, and the requests of access (L3-04). */}
        <Section id="documents" title={fr.saleFile.buyer.title}>
          <Empty>{fr.saleFile.buyer.empty.text}</Empty>
          <ArrowLink
            href={ROUTES.buyerDocuments}
            label={fr.saleFile.buyer.homeLink}
            className="-mb-3 self-start"
          />
        </Section>
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
  );
}
