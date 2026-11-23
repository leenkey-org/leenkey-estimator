import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { SectionTitle } from "@/components/shared/section-title";
import { InterventionCounter } from "@/leenkey/advisor/components/intervention-counter";
import { InterventionRequestForm } from "@/leenkey/advisor/components/intervention-request-form";
import { InterventionStatusPill } from "@/leenkey/advisor/components/intervention-status";
import {
  adviserStart,
  interventionAvailability,
  interventionsHref,
} from "@/leenkey/advisor/interventions";
import {
  propertyInterventions,
  sellerInterventions,
  type SellerIntervention,
} from "@/leenkey/advisor/queries";
import { conversationTitle } from "@/leenkey/messaging/presentation";
import { isUuid, listConversations } from "@/leenkey/messaging/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { sellerProperty } from "@/leenkey/properties/queries";
import { formatDateShort } from "@/lib/format";
import { frAdvisorInterventions } from "@/lib/i18n/sections/advisorInterventions";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { advisorInterventions: frAdvisorInterventions } as const;

const t = fr.advisorInterventions.seller;

export const metadata: Metadata = { title: t.metaTitle };

type Props = { params: Promise<{ id: string }> };

const link = "font-semibold underline underline-offset-2 hover:no-underline";
const card = "rounded-lk-xl border border-lk-line bg-lk-surface p-4 md:p-5";

function Body({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-lk-form flex-1 flex-col gap-6 px-5 pt-6 pb-12 md:pt-10">
      {children}
    </div>
  );
}

/**
 * « Vos demandes »: the requests of the seller on the property, the latest
 * first, each with its reason, its words, where it stands and its date. The
 * initial appointment is said apart, with the counter: never a request.
 */
function Requests({
  items,
  now,
  action,
}: {
  items: readonly SellerIntervention[];
  now: Date;
  /** A link on the right of the title (« Écrire à mon conseiller »). */
  action?: ReactNode;
}) {
  return (
    <section aria-labelledby="demandes" className="flex flex-col gap-3">
      <SectionTitle id="demandes" action={action}>
        {t.history.title}
      </SectionTitle>
      {items.length === 0 ? (
        <p className="rounded-lk-xl border border-lk-line bg-lk-surface px-4 py-3.5 text-lk-compact text-lk-ink-3">
          {t.history.empty}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-lk-line overflow-hidden rounded-lk-xl border border-lk-line bg-lk-surface">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5 px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lk-compact font-semibold text-lk-ink">
                  {fr.advisorInterventions.reasons[item.reason]}
                </p>
                <InterventionStatusPill
                  status={item.status}
                  label={t.status[item.status]}
                  className="shrink-0"
                />
              </div>
              {item.message ? (
                <p className="line-clamp-3 text-lk-secondary whitespace-pre-line text-lk-ink-2 wrap-anywhere">
                  {item.message}
                </p>
              ) : null}
              <p className="text-lk-caption text-lk-ink-3">
                {item.status === "done" && item.doneAt
                  ? t.history.doneOn(formatDateShort(item.doneAt, now))
                  : t.history.requestedOn(formatDateShort(item.requestedAt, now))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// « Demander une intervention » (DECISIONS.md 2026-11-23, G5 of docs/DESIGN.md
// 11): the counter of the interventions the plan of the property sells
// (read in the database, never from a plan name), the initial appointment
// apart, the request (a reason, a message) and the requests already made.
// Once the interventions are used, or held by the requests that wait, the
// form gives way to a sentence that says so and the way to the conversation
// with the adviser (writing to them is never an intervention); when a dearer
// plan sells more, the way to the plans. Before the end of the withdrawal
// period without an immediate start (SPEC 11), the page says when the adviser
// starts, never a delay of answer. A plan that sells none (ended, Autonomie):
// the way to the plans, and the requests made before. A property of someone
// else, or unknown: a 404.
export default async function InterventionPage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const property = await sellerProperty(id);
  if (property.ok && !property.data) notFound();
  const [summary, requests, conversations] = await Promise.all([
    propertyInterventions(id),
    sellerInterventions(id),
    listConversations(),
  ]);
  const backHref = `${ROUTES.seller}?bien=${id}`;
  const plansHref = `${ROUTES.plan}?bien=${id}`;
  const header = (
    <AppHeader
      title={t.header}
      titleAs="p"
      back={
        <Link
          href={backHref}
          aria-label={t.back}
          className={cn(
            iconButtonVariants({ variant: "stone" }),
            "inline-flex items-center justify-center",
          )}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
      }
    />
  );
  const title = (
    <h1 className="text-lk-h2 font-bold text-wide text-lk-ink md:text-lk-h2-lg">{t.title}</h1>
  );

  if (!property.ok || !summary.ok || !requests.ok) {
    return (
      <>
        {header}
        <Body>
          {title}
          <InlineAlert
            tone="danger"
            action={
              <Link href={interventionsHref(id)} className={link}>
                {t.retry}
              </Link>
            }
          >
            {t.error}
          </InlineAlert>
        </Body>
      </>
    );
  }

  const now = new Date();
  // The initial appointment is said apart, with the counter: never a request of the seller.
  const asked = requests.data.filter((item) => item.reason !== "initial_meeting");

  if (!summary.data) {
    return (
      <>
        {header}
        <Body>
          <h1 className="sr-only">{t.title}</h1>
          <EmptyState
            className="py-10"
            title={t.none.title}
            description={t.none.text}
            action={
              <Button asChild>
                <Link href={plansHref}>{t.none.action}</Link>
              </Button>
            }
          />
          {/* What was asked under a plan that ended stays readable. */}
          {asked.length > 0 ? <Requests items={asked} now={now} /> : null}
        </Body>
      </>
    );
  }

  const counter = summary.data;
  const listing = property.data?.listing ?? null;
  const name =
    listing?.title ??
    (property.data
      ? conversationTitle({
          propertyType: property.data.characteristics.type,
          rooms: property.data.characteristics.rooms ?? null,
          city: property.data.address.city,
        })
      : null);
  // The conversation with the adviser of this property, where the team answers.
  const conversation = conversations.ok
    ? conversations.data.find(
        (item) => item.kind === "advisor" && item.propertyId === id && !item.closed,
      )
    : undefined;
  const conversationHref = conversation ? `/messages/${conversation.id}` : null;
  const availability = interventionAvailability(counter);
  // No immediate start: the adviser starts after the withdrawal period (SPEC 11), as the
  // header of the conversation says; no delay of answer is promised before.
  const starts = adviserStart(conversation?.advisorOrderedAt ?? null, now);

  return (
    <>
      {header}
      <Body>
        <div className="flex flex-col gap-2">
          {title}
          {name ? <p className="text-lk-label font-semibold text-lk-ink">{t.for(name)}</p> : null}
        </div>

        <section aria-label={t.counterLabel} className={cn(card, "flex flex-col gap-4")}>
          <InterventionCounter summary={counter} />
          <div className="flex flex-col gap-1 border-t border-lk-line pt-3 text-lk-caption text-lk-ink-3">
            {counter.planName ? <p>{t.included(counter.planName, counter.quota)}</p> : null}
            <p>{t.counted}</p>
          </div>
        </section>

        {availability === "open" ? (
          <section aria-labelledby="demande" className={cn(card, "flex flex-col gap-4")}>
            <SectionTitle id="demande">{t.form.title}</SectionTitle>
            <InterventionRequestForm
              propertyId={id}
              conversationHref={conversationHref}
              startsOn={starts ? formatDateShort(starts, now) : null}
            />
          </section>
        ) : (
          <section aria-labelledby="demande" className="flex flex-col gap-3">
            <h2 id="demande" className="sr-only">
              {t.form.title}
            </h2>
            <InlineAlert
              tone="info"
              live={false}
              action={
                availability === "used" && counter.upgrade ? (
                  <Link href={plansHref} className={link}>
                    {t.used.plans}
                  </Link>
                ) : undefined
              }
            >
              {(availability === "held"
                ? [t.held.text, t.held.write]
                : [
                    t.used.text(counter.quota),
                    t.used.write,
                    counter.upgrade
                      ? t.used.upgrade(counter.upgrade.name, counter.upgrade.quota)
                      : null,
                  ]
              )
                .filter(Boolean)
                .join(" ")}
            </InlineAlert>
            {conversationHref ? (
              <Button asChild className="md:self-start">
                <Link href={conversationHref}>{t.write}</Link>
              </Button>
            ) : null}
          </section>
        )}

        <Requests
          items={asked}
          now={now}
          action={
            availability === "open" && conversationHref ? (
              <Link
                href={conversationHref}
                className="inline-flex min-h-11 items-center text-lk-secondary font-semibold text-lk-blue underline-offset-2 hover:underline"
              >
                {t.write}
              </Link>
            ) : undefined
          }
        />
      </Body>
    </>
  );
}
