import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  Eye,
  Lightbulb,
  ListChecks,
  MessageCircle,
  MessageSquare,
  Tag,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FinancingMention } from "@/components/shared/financing-badge";
import { InlineAlert } from "@/components/shared/inline-alert";
import { NextActionCard } from "@/components/shared/next-action-card";
import { StatTile } from "@/components/shared/stat-tile";
import { TaskList } from "@/components/shared/task-list";
import { requireProfile } from "@/core/auth/session";
import { currentStep } from "@/core/steps/progress";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { interventionsHref } from "@/leenkey/advisor/interventions";
import { propertyInterventions } from "@/leenkey/advisor/queries";
import { hasEntitlement } from "@/leenkey/billing/entitlements";
import { UpgradePromptSlot } from "@/leenkey/billing/components/upgrade-prompt-slot";
import { propertyUpgradePrompt } from "@/leenkey/billing/upgrade-queries";
import { AdvisorCard } from "@/leenkey/messaging/components/advisor-card";
import { RecentConversations } from "@/leenkey/messaging/components/recent-conversations";
import { OfferReceivedCard } from "@/leenkey/offers/components/offer-received-card";
import { OfferSellerActions } from "@/leenkey/offers/components/offer-seller-actions";
import { awaitingAnswer, buyerConversationHref, propertyOffers } from "@/leenkey/offers/seller";
import { PropertyCards } from "@/leenkey/properties/components/property-cards";
import { SellerHeader } from "@/leenkey/properties/components/seller-header";
import { AssistantHeaderLink } from "@/leenkey/ai/components/assistant-header-link";
import { TaskDoneButton } from "@/leenkey/properties/components/task-done-button";
import {
  chooseProperty,
  dashboardMode,
  daysOnSale,
  nextActionView,
  saleEditable,
  saleFigures,
  stepHeading,
  taskLines,
} from "@/leenkey/properties/dashboard";
import { saleDashboard } from "@/leenkey/properties/dashboard-data";
import { getNextAction } from "@/leenkey/properties/next-action";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { sellerProperties } from "@/leenkey/properties/queries";
import { listingHref } from "@/leenkey/search/cards";
import { creationHref, propertyName, sheetHref } from "@/leenkey/properties/sheet";
import { formatDateShort, formatInteger, formatPrice } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";
import { frPlan } from "@/lib/i18n/sections/plan";
import { frProperties } from "@/lib/i18n/sections/properties";
import { frSaleDashboard } from "@/lib/i18n/sections/saleDashboard";
import { frSellStart } from "@/lib/i18n/sections/sellStart";
import { frSpaces } from "@/lib/i18n/sections/spaces";
import { SpacePage } from "../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = {
  plan: frPlan,
  properties: frProperties,
  saleDashboard: frSaleDashboard,
  sellStart: frSellStart,
  spaces: frSpaces,
} as const;

export const metadata: Metadata = { title: fr.spaces.seller.metaTitle };

const t = fr.saleDashboard;
const list = fr.properties.list;

const PLANS: Record<string, string> = fr.plan;

const ICONS = {
  rejected: TriangleAlert,
  message: MessageCircle,
  task: ListChecks,
  advice: Lightbulb,
} as const;

type Props = { searchParams: Promise<{ bien?: string | string[] }> };

/**
 * A section of the dashboard, its title (a note in a pill beside it, as « 1
 * tâche sur 4 faite ») and an optional link on its right.
 */
function Section({
  id,
  title,
  note,
  link,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  link?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 id={id} className="text-lk-h3 font-bold text-wide text-lk-ink lg:text-lk-h3-lg">
            {title}
          </h2>
          {note ? (
            <span className="rounded-full bg-lk-blue-tint px-2.5 py-0.5 text-lk-micro font-semibold tabular text-lk-blue-dark">
              {note}
            </span>
          ) : null}
        </div>
        {link ? (
          <Link
            href={link.href}
            // 44 px of target (DESIGN.md 15), the text on the line of the title.
            className="-my-3 inline-flex min-h-11 items-center rounded-lk-sm text-lk-label font-semibold text-lk-blue underline underline-offset-2 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A block of the cockpit: the column it takes from 1 024 px (the sale by default). */
type Slot = { key: string; side?: boolean; after?: boolean; node: ReactNode };

/**
 * The cockpit (2026-11-25, Younes: « refais le cockpit »; Cédric: no narrow
 * column): one column below 1 280 px (beside the column of the space from
 * 1 024 px, DECISIONS.md 2026-11-26, two columns would be too narrow); from
 * 1 280 px, 1 216 px at most in two columns, the sale on the left (header,
 * next action, offers, tasks), its adviser, figures and conversations on the
 * right (320 px, 360 px from 1 536 px), then across the page the proposal of a plan (always after the
 * useful content, DESIGN 10.4) and the properties. The page order is the
 * order on the screen at every width (no CSS order: the keyboard and a
 * screen reader follow what is shown); each column is a box from 1 280 px
 * only (display: contents below).
 */
function Cockpit({ header, slots }: { header: ReactNode; slots: readonly Slot[] }) {
  const main = slots.filter((slot) => !slot.side && !slot.after);
  const side = slots.filter((slot) => slot.side);
  const after = slots.filter((slot) => slot.after);
  const block = (slot: Slot) => (
    <div
      key={slot.key}
      // empty: a block that renders nothing (a proposal put away) leaves no gap.
      className="px-(--lk-gutter) empty:hidden md:px-0"
    >
      {slot.node}
    </div>
  );
  return (
    <div className="mx-auto flex w-full max-w-205 flex-col gap-7 pb-10 md:px-(--lk-gutter) md:py-10 lg:mx-0 lg:max-w-lk-space lg:gap-8">
      <div className="flex flex-col gap-7 lg:gap-8 xl:flex-row xl:items-start">
        <div className="contents xl:flex xl:min-w-0 xl:flex-1 xl:flex-col xl:gap-8">
          <div>{header}</div>
          {main.map(block)}
        </div>
        {side.length ? (
          <div className="contents xl:flex xl:w-80 xl:shrink-0 xl:flex-col xl:gap-7 2xl:w-90">
            {side.map(block)}
          </div>
        ) : null}
      </div>
      {after.map(block)}
    </div>
  );
}

// « Ma vente » (L1-24, SPEC-V2 8.7, docs/DESIGN.md 12.3): for the property of
// the sale (?bien=, the link of the notifications of a step), the header on
// the night, the next action (getNextAction, L1-23), the figures of the
// listing, the tasks of the current step, the last conversations; then the
// properties of the seller. A draft: the way back to its creation; sold: the
// recap of the sale. No property: the two ways to start. The offers (L2), the
// visits (L3), the advisor (L1-34), the assistant (L1-28) and the
// suggestions of a plan (L2-09) come with their tasks.
export default async function SellerHomePage({ searchParams }: Props) {
  const [profile, query] = await Promise.all([requireProfile(), searchParams]);
  const result = await sellerProperties(profile.id);
  const retry = (
    <Button asChild variant="ghost" size="sm">
      <Link href="/vendeur">{fr.properties.sheet.retry}</Link>
    </Button>
  );

  if (!result.ok || result.data.length === 0) {
    return (
      <SpacePage
        title={fr.spaces.greeting(profile.firstName)}
        roles={profile.roles}
        profileId={profile.id}
        wide
      >
        {!result.ok ? (
          <InlineAlert tone="danger" className="mt-6" action={retry}>
            {list.error}
          </InlineAlert>
        ) : (
          <EmptyState
            className="mt-12"
            title={fr.spaces.seller.title}
            description={fr.spaces.seller.text}
            action={
              // The two ways to start a sale (DECISIONS 2026-10-26).
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link href={ROUTES.newProperty}>{list.create}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={ROUTES.valuation}>{fr.sellStart.valuation.action}</Link>
                </Button>
              </div>
            }
          />
        )}
      </SpacePage>
    );
  }

  const properties = result.data;
  const requested = typeof query.bien === "string" ? query.bien : null;
  const property = chooseProperty(properties, requested) ?? properties[0];
  const mode = dashboardMode(property);
  const now = new Date();
  // The upgrade prompt of the sale (L2-09), read beside the dashboard.
  const [data, prompt] = await Promise.all([
    saleDashboard(property, now),
    mode === "draft" || mode === "sold"
      ? Promise.resolve(null)
      : propertyUpgradePrompt(property.id, { kind: "dashboard" }, now),
  ]);
  const situation = data.ok ? data.data.situation : null;
  const progress = situation?.progress ?? null;
  const step = progress ? currentStep(progress) : null;
  const heading = progress ? stepHeading(progress) : null;
  const listing = property.listing;
  const editable = saleEditable(property.listingStatus);
  const dashboardHref = (id: string) => `/vendeur?bien=${id}`;
  const links = {
    sheet: sheetHref(property.id),
    steps: sheetHref(property.id, "etapes"),
    messages: "/messages",
    listing: listing && property.listingStatus === "published" ? listingHref(listing.slug) : null,
  };

  const header = (
    <SellerHeader
      greeting={fr.spaces.greeting(profile.firstName)}
      bell={
        // The assistant beside the bell on a phone (Q26); from 768 px, AssistantFab.
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <AssistantHeaderLink propertyId={property.id} />
          <SpaceNotificationBell roles={profile.roles} profileId={profile.id} tone="dark" />
        </div>
      }
      choices={properties.map((item) => ({
        id: item.id,
        label: propertyName(item),
        href: dashboardHref(item.id),
        status: item.listingStatus ?? "draft",
        current: item.id === property.id,
      }))}
      property={{
        id: property.id,
        name: propertyName(property),
        photoSrc: property.coverPath ? photoUrl(property.coverPath) : null,
        figures: listing
          ? t.figures(
              formatPrice(listing.priceCents),
              listing.publishedAt ? formatDateShort(listing.publishedAt, now) : null,
            )
          : null,
        status: property.listingStatus ?? "draft",
      }}
      progress={
        heading && progress
          ? { ...heading, title: step?.title ?? "", plan: PLANS[progress.template] ?? "" }
          : null
      }
      planHref={mode === "sold" ? undefined : `/vendeur/formule?bien=${property.id}`}
    />
  );

  // The blocks of the cockpit, by their rank on a phone (Cockpit).
  const slots: Slot[] = [];
  if (!data.ok) {
    slots.push({
      key: "error",
      node: (
        <InlineAlert tone="danger" live={false} action={retry}>
          {list.error}
        </InlineAlert>
      ),
    });
  } else if (mode === "draft") {
    slots.push({
      key: "next",
      node: (
        <NextActionCard
          label={t.next.label}
          icon={ListChecks}
          title={t.draft.title}
          detail={t.draft.text}
          actions={
            <Button asChild>
              <Link href={creationHref(property)}>{t.draft.action}</Link>
            </Button>
          }
        />
      ),
    });
  } else if (mode === "sold") {
    const days = daysOnSale(listing?.publishedAt ?? null, listing?.soldAt ?? null);
    const contacts = data.data.conversations.length;
    slots.push({
      key: "sold",
      node: (
        <section aria-labelledby="bilan" className="flex flex-col gap-3">
          <div className="flex items-start gap-3.5 rounded-lk-2xl border border-lk-line bg-lk-surface p-4 shadow-lk-d-field md:p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint">
              <CalendarCheck
                aria-hidden="true"
                strokeWidth={1.8}
                className="lk-icon-gradient size-5"
              />
            </span>
            <div className="flex flex-col gap-1">
              <h2 id="bilan" className="text-lk-title font-semibold text-lk-ink">
                {t.sold.title}
              </h2>
              <p className="text-lk-compact text-lk-ink-3">{t.sold.text}</p>
            </div>
          </div>
          {/* The price across the tile row: « 1 250 000 € » would not fit a third of 390 px. */}
          <div className="grid grid-cols-2 gap-2.5">
            {listing ? (
              <StatTile
                className="col-span-2"
                icon={Tag}
                value={formatPrice(listing.soldPriceCents ?? listing.priceCents)}
                // The final price when the seller gave it, otherwise the last one shown.
                label={listing.soldPriceCents !== null ? t.sold.price : t.sold.askedPrice}
              />
            ) : null}
            {days !== null ? (
              <StatTile icon={CalendarDays} value={formatInteger(days)} label={t.sold.days(days)} />
            ) : null}
            <StatTile
              icon={MessageSquare}
              value={formatInteger(contacts)}
              label={t.sold.contacts(contacts)}
            />
          </div>
        </section>
      ),
    });
  } else {
    const action = situation ? getNextAction(situation, now) : null;
    const view = action ? nextActionView(action, links, now, property.listingStatus) : null;
    const figures = saleFigures(data.data.conversations, data.data.views);
    const lines = step && situation ? taskLines(step, situation.property, editable) : [];
    const recent = data.data.conversations.slice(0, 3);
    // The adviser (L1-34): the open conversation; without the right, the invitation.
    const advisor = data.data.advisor && !data.data.advisor.closed ? data.data.advisor : null;
    const advisorRight = advisor !== null || (await hasEntitlement(property.id, "advisor"));
    // The interventions the plan sells (DECISIONS.md 2026-11-23); unread: the card without them.
    const interventions = advisor ? await propertyInterventions(property.id) : null;
    // The offers that wait for an answer (L2-04a), each with its conversation.
    const offers = await propertyOffers(property.id);
    const awaiting = offers.ok ? awaitingAnswer(offers.data) : [];
    const discussHrefs = await Promise.all(
      awaiting.map((item) => buyerConversationHref(item.offer.listingId, item.buyerId)),
    );
    const doneLines = lines.filter((line) => line.state === "done").length;
    slots.push({
      key: "next",
      node: view ? (
        <NextActionCard
          label={t.next.label}
          icon={ICONS[view.icon]}
          title={view.title}
          detail={view.detail}
          actions={
            <>
              {view.primary && "href" in view.primary ? (
                <Button asChild>
                  <Link href={view.primary.href}>{view.primary.label}</Link>
                </Button>
              ) : view.primary && editable ? (
                <TaskDoneButton
                  propertyId={property.id}
                  taskId={view.primary.taskId}
                  title={view.primary.taskTitle}
                  done={false}
                  label={view.primary.label}
                  variant="primary"
                  size="md"
                  stretch
                />
              ) : null}
              {view.secondary ? (
                <Button asChild variant="secondary">
                  <Link href={view.secondary.href}>{view.secondary.label}</Link>
                </Button>
              ) : null}
            </>
          }
        />
      ) : null,
    });
    slots.push({
      key: "offers",
      node: (
        <>
          {/* An offer may wait for an answer: its absence is never said by silence. */}
          {offers.ok ? null : (
            <InlineAlert tone="danger" live={false}>
              {frOffer.seller.dashboard.loadError}
            </InlineAlert>
          )}
          {awaiting.length > 0 ? (
            <section aria-labelledby="offres-recues" className="flex flex-col gap-3">
              <h2 id="offres-recues" className="sr-only">
                {frOffer.seller.dashboard.title}
              </h2>
              {awaiting.map((item, index) => (
                <OfferReceivedCard
                  key={item.offer.id}
                  item={item}
                  now={now}
                  title={frOffer.seller.received}
                  actions={
                    <OfferSellerActions
                      offerId={item.offer.id}
                      reference={item.offer.reference}
                      discussHref={discussHrefs[index]}
                      full
                    />
                  }
                />
              ))}
            </section>
          ) : null}
        </>
      ),
    });
    slots.push({
      key: "advisor",
      side: true,
      node:
        advisor || !advisorRight ? (
          <AdvisorCard
            conversation={advisor}
            plansHref={`${ROUTES.plan}?bien=${property.id}`}
            interventions={
              interventions?.ok && interventions.data
                ? { summary: interventions.data, href: interventionsHref(property.id) }
                : null
            }
            now={now}
          />
        ) : null,
    });
    slots.push({
      key: "stats",
      side: true,
      node: (
        <Section id="chiffres" title={t.stats.label}>
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile
              icon={Eye}
              value={formatInteger(figures.views)}
              label={t.stats.views(figures.views)}
            />
            <StatTile
              icon={MessageSquare}
              value={formatInteger(figures.contacts)}
              label={t.stats.contacts(figures.contacts)}
            />
            <StatTile
              icon={UserCheck}
              value={formatInteger(figures.qualified)}
              label={t.stats.qualified(figures.qualified)}
            />
          </div>
        </Section>
      ),
    });
    slots.push({
      key: "todo",
      node: step ? (
        <Section
          id="a-faire"
          title={t.todo.title}
          note={lines.length ? t.todo.progress(doneLines, lines.length) : undefined}
          link={{ href: links.steps, label: t.todo.all }}
        >
          <TaskList
            className="rounded-lk-2xl shadow-lk-d-field"
            stateLabels={t.todo.states}
            items={lines.map((line) => ({
              ...line,
              detail: line.detail ?? undefined,
              control: line.manual ? (
                <TaskDoneButton
                  propertyId={property.id}
                  taskId={line.id}
                  title={line.title}
                  done={line.state === "done"}
                />
              ) : undefined,
            }))}
          />
        </Section>
      ) : null,
    });
    slots.push({
      key: "conversations",
      side: true,
      node: (
        <Section
          id="conversations"
          title={t.conversations.title}
          link={recent.length ? { href: links.messages, label: t.conversations.all } : undefined}
        >
          {recent.length ? (
            <>
              <RecentConversations conversations={recent} now={now} />
              <FinancingMention />
            </>
          ) : (
            // Nothing yet: a clear empty state, where the messages will come from.
            <div className="flex items-start gap-3.5 rounded-lk-2xl border border-dashed border-lk-line-strong bg-lk-surface px-4 py-4">
              <span
                aria-hidden="true"
                className="lk-gradient-soft flex size-10 shrink-0 items-center justify-center rounded-full"
              >
                <MessageCircle strokeWidth={1.75} className="lk-icon-gradient size-5" />
              </span>
              <p className="pt-1 text-lk-compact text-lk-ink-2">{t.conversations.empty}</p>
            </div>
          )}
        </Section>
      ),
    });
    // A plan proposed in context (L2-09, SPEC 11 bis): at most one, after the useful content.
    slots.push({ key: "upgrade", after: true, node: <UpgradePromptSlot prompt={prompt} /> });
  }
  slots.push({
    key: "properties",
    after: true,
    node: (
      <section aria-labelledby="vos-biens" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="vos-biens"
            className="text-lk-h3 font-bold text-wide text-lk-ink lg:text-lk-h3-lg"
          >
            {list.title}
          </h2>
          <Button asChild variant="secondary" size="sm">
            <Link href={ROUTES.newProperty}>{list.create}</Link>
          </Button>
        </div>
        <PropertyCards properties={properties} currentId={property.id} />
      </section>
    ),
  });

  return <Cockpit header={header} slots={slots.filter((slot) => slot.node !== null)} />;
}
