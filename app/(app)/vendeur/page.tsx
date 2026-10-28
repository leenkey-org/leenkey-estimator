import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Lightbulb, ListChecks, MessageCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { NextActionCard } from "@/components/shared/next-action-card";
import { StatTile } from "@/components/shared/stat-tile";
import { TaskList } from "@/components/shared/task-list";
import { requireProfile } from "@/core/auth/session";
import { currentStep } from "@/core/steps/progress";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { DashboardConversations } from "@/leenkey/properties/components/dashboard-conversations";
import { PropertyList } from "@/leenkey/properties/components/property-list";
import { SellerHeader } from "@/leenkey/properties/components/seller-header";
import { TaskDoneButton } from "@/leenkey/properties/components/task-done-button";
import {
  chooseProperty,
  dashboardMode,
  daysOnSale,
  nextActionView,
  saleFigures,
  stepHeading,
  taskLines,
} from "@/leenkey/properties/dashboard";
import { saleDashboard } from "@/leenkey/properties/dashboard-data";
import { getNextAction } from "@/leenkey/properties/next-action";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { sellerProperties } from "@/leenkey/properties/queries";
import { creationHref, propertyName, sheetHref } from "@/leenkey/properties/sheet";
import { formatDateShort, formatInteger, formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../_components/space-page";

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

/** A section of the dashboard, its title and an optional link on its right. */
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
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-lk-h3 font-bold text-wide text-lk-ink">
          {title}
        </h2>
        {link ? (
          <Link
            href={link.href}
            className="rounded-lk-sm text-lk-label font-semibold text-lk-blue underline underline-offset-2 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
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

  if (!result.ok || result.data.length === 0) {
    return (
      <SpacePage
        title={fr.spaces.greeting(profile.firstName)}
        roles={profile.roles}
        profileId={profile.id}
        wide
      >
        {!result.ok ? (
          <InlineAlert tone="danger" className="mt-6">
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
  const data = await saleDashboard(property, now);
  const situation = data.ok ? data.data.situation : null;
  const progress = situation?.progress ?? null;
  const step = progress ? currentStep(progress) : null;
  const heading = progress ? stepHeading(progress) : null;
  const listing = property.listing;
  const editable = property.listingStatus !== "suspended" && mode !== "sold";
  const dashboardHref = (id: string) => `/vendeur?bien=${id}`;
  const links = {
    sheet: sheetHref(property.id),
    steps: sheetHref(property.id, "etapes"),
    messages: "/messages",
  };

  const header = (
    <SellerHeader
      greeting={fr.spaces.greeting(profile.firstName)}
      bell={
        <SpaceNotificationBell
          roles={profile.roles}
          profileId={profile.id}
          tone="dark"
          className="md:hidden"
        />
      }
      choices={properties.map((item) => ({
        id: item.id,
        label: propertyName(item),
        href: dashboardHref(item.id),
        current: item.id === property.id,
      }))}
      property={{
        id: property.id,
        name: propertyName(property),
        thumbSrc: property.coverPath ? photoUrl(property.coverPath, 400) : null,
        figures: listing
          ? t.figures(
              formatPrice(listing.priceCents),
              listing.publishedAt ? formatDateShort(listing.publishedAt, now) : null,
            )
          : null,
        status: property.listingStatus ?? "draft",
      }}
      progress={heading && progress ? { ...heading, plan: PLANS[progress.template] ?? "" } : null}
    />
  );

  let content: ReactNode;
  if (!data.ok) {
    content = (
      <InlineAlert tone="danger" live={false}>
        {list.error}
      </InlineAlert>
    );
  } else if (mode === "draft") {
    content = (
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
    );
  } else if (mode === "sold") {
    const days = daysOnSale(listing?.publishedAt ?? null, listing?.soldAt ?? null);
    const contacts = data.data.conversations.length;
    content = (
      <section aria-labelledby="bilan" className="flex flex-col gap-3">
        <div className="flex items-start gap-3.5 rounded-lk-2xl border border-lk-line bg-lk-surface p-4 md:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lk-md bg-lk-blue-tint">
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
        <div className="grid grid-cols-3 gap-2.5">
          {listing ? (
            <StatTile
              value={formatPrice(listing.soldPriceCents ?? listing.priceCents)}
              label={t.sold.price}
            />
          ) : null}
          {days !== null ? (
            <StatTile value={formatInteger(days)} label={t.sold.days(days)} />
          ) : null}
          <StatTile value={formatInteger(contacts)} label={t.sold.contacts(contacts)} />
        </div>
      </section>
    );
  } else {
    const action = situation ? getNextAction(situation, now) : null;
    const view = action ? nextActionView(action, links, now) : null;
    const figures = saleFigures(data.data.conversations, data.data.views);
    const lines = step && situation ? taskLines(step, situation.property, editable) : [];
    const recent = data.data.conversations.slice(0, 3);
    content = (
      <>
        {view ? (
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
                ) : view.primary ? (
                  <TaskDoneButton
                    propertyId={property.id}
                    taskId={view.primary.taskId}
                    title={view.title}
                    done={false}
                    label={view.primary.label}
                    variant="primary"
                    size="md"
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
        ) : null}

        <section aria-label={t.stats.label} className="grid grid-cols-3 gap-2.5">
          <StatTile value={formatInteger(figures.views)} label={t.stats.views} />
          <StatTile
            value={formatInteger(figures.contacts)}
            label={t.stats.contacts(figures.contacts)}
          />
          <StatTile
            value={formatInteger(figures.qualified)}
            label={t.stats.qualified(figures.qualified)}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {step ? (
            <Section
              id="a-faire"
              title={t.todo.title}
              link={{ href: links.steps, label: t.todo.all }}
            >
              <TaskList
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
          ) : null}
          <Section
            id="conversations"
            title={t.conversations.title}
            link={recent.length ? { href: links.messages, label: t.conversations.all } : undefined}
          >
            {recent.length ? (
              <DashboardConversations conversations={recent} now={now} />
            ) : (
              <p className="rounded-lk-xl border border-lk-line bg-lk-surface px-4 py-3.5 text-lk-compact text-lk-ink-3">
                {t.conversations.empty}
              </p>
            )}
          </Section>
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-205 pb-10 md:px-(--lk-gutter) md:py-10 lg:px-0">
      {header}
      <div className="flex flex-col gap-7 px-(--lk-gutter) pt-6 md:px-0 md:pt-7">
        {content}
        <section aria-labelledby="vos-biens" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="vos-biens" className="text-lk-h3 font-bold text-wide text-lk-ink">
              {list.title}
            </h2>
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.newProperty}>{list.create}</Link>
            </Button>
          </div>
          <PropertyList properties={properties} />
        </section>
      </div>
    </div>
  );
}
