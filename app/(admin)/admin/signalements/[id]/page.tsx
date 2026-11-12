import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { SectionTitle } from "@/components/shared/section-title";
import { requireAdmin } from "@/core/auth/session";
import { AccountModeration } from "@/leenkey/admin/components/account-moderation";
import { AccountStatusBadge } from "@/leenkey/admin/components/account-badges";
import { ReportStatusBadge } from "@/leenkey/admin/components/case-badges";
import { ModerationFeedback } from "@/leenkey/admin/components/listing-moderation";
import { ReportDecisions } from "@/leenkey/admin/components/report-decisions";
import {
  adminReport,
  adminReportHistory,
  adminReportMessages,
  type AdminReportPerson,
} from "@/leenkey/admin/reports/queries";
import { formatDateTime } from "@/lib/format";
import { frAdminReports } from "@/lib/i18n/sections/adminReports";
import { frAdminUsers } from "@/lib/i18n/sections/adminUsers";
import { cn } from "@/lib/utils";
import { adminReportsHref } from "@/lib/validations/admin";
import { AdminPage } from "../../_components/admin-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminReports: frAdminReports, adminUsers: frAdminUsers } as const;

const t = fr.adminReports;
const d = t.detail;

type Props = { params: Promise<{ id: string }> };

// adminReport is read once per request (React cache): metadata and page share
// it. It holds no message: the conversation is read by the page only.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const result = await adminReport((await params).id);
  return {
    title:
      result.ok && result.data
        ? t.detailMetaTitle(d.title(result.data.listing?.reference ?? null))
        : t.metaTitle,
  };
}

const backLink = (
  <Link
    href={adminReportsHref({ closed: false })}
    className="inline-flex min-h-11 items-center gap-1 text-lk-secondary font-semibold text-lk-blue"
  >
    <ChevronLeft aria-hidden="true" className="size-4" />
    {t.back}
  </Link>
);

const box = "rounded-lk-md border border-lk-line bg-lk-surface";
const empty = "text-lk-secondary text-lk-ink-3";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <SectionTitle id={id}>{title}</SectionTitle>
      {children}
    </section>
  );
}

const nameOf = (person: AdminReportPerson | null) =>
  person?.name ?? (person?.deleted ? d.deleted : fr.adminUsers.noName);

/** The account, linked to its sheet, with its side and its suspension. */
function Person({ person }: { person: AdminReportPerson | null }) {
  if (!person || person.deleted) return <>{d.deleted}</>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/utilisateurs/${person.id}`}
        className="text-lk-blue underline-offset-2 hover:underline"
      >
        {nameOf(person)}
      </Link>
      {person.role ? <span className="font-normal text-lk-ink-3">{d[person.role]}</span> : null}
      {person.suspended ? <AccountStatusBadge suspended /> : null}
    </span>
  );
}

// L1-30c: a report as the back office sees it (SPEC-V2 section 17): its
// reason, who reported whom on which listing; the conversation read in full,
// the reading written to the history (once per half hour); while it is open,
// « Avertir » the other party (by email) and « Clore le signalement » with
// what was done; « Suspendre le compte » (L1-30a); the history. The page checks the admin role itself.
export default async function AdminReportPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const result = await adminReport(id);
  if (!result.ok) {
    return (
      <AdminPage title={t.title} titleOnMobile back={backLink}>
        <InlineAlert
          tone="danger"
          action={
            <Link
              href={`/admin/signalements/${id}`}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              {t.retry}
            </Link>
          }
        >
          {d.error}
        </InlineAlert>
      </AdminPage>
    );
  }
  if (!result.data) notFound();
  const report = result.data;
  // The messages first: the history read after them shows this reading.
  const messages = await adminReportMessages(report.id);
  const history = await adminReportHistory(report.id);
  const now = new Date();
  const warnedAt = history.ok
    ? (history.data.find((entry) => entry.action === "report.warn")?.at ?? null)
    : null;
  const closed = report.resolvedAt !== null;
  const target = report.target;
  const actionable = target !== null && !target.deleted && !target.team;
  const people = new Map(
    [report.reporter, target].flatMap((person) => (person ? [[person.id, person]] : [])),
  );
  const facts = [
    { label: d.reporter, value: <Person person={report.reporter} /> },
    { label: d.target, value: <Person person={target} /> },
    {
      label: d.listing,
      value: report.listing ? (
        <Link
          href={`/admin/annonces/${report.listing.id}`}
          className="text-lk-blue underline-offset-2 hover:underline"
        >
          {[report.listing.reference, report.listing.title].filter(Boolean).join(" · ")}
        </Link>
      ) : (
        t.noListing
      ),
    },
    {
      label: closed ? d.closed : d.received,
      value: formatDateTime(report.resolvedAt ?? report.createdAt, now),
    },
    // A second warning sends a second email: the first one is said here.
    ...(warnedAt ? [{ label: d.warned, value: formatDateTime(warnedAt, now) }] : []),
  ];

  return (
    <AdminPage title={d.title(report.listing?.reference ?? null)} titleOnMobile back={backLink}>
      <ModerationFeedback>
        <section aria-label={d.reason} className={`flex flex-col gap-4 p-5 ${box}`}>
          <ReportStatusBadge closed={closed} className="self-start" />
          <div className="flex flex-col gap-1">
            <p className="text-lk-caption text-lk-ink-3">{d.reason}</p>
            <p className="text-lk-body whitespace-pre-line text-lk-ink">{report.reason}</p>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-lk-caption text-lk-ink-3">{fact.label}</dt>
                <dd className="text-lk-label font-semibold break-words text-lk-ink">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <ReportDecisions
              reportId={report.id}
              targetName={target?.name ?? null}
              canWarn={actionable && !closed}
              closed={closed}
            />
            {actionable ? (
              <AccountModeration
                profileId={target.id}
                name={nameOf(target)}
                suspended={target.suspended}
              />
            ) : null}
          </div>
          {target?.team ? <p className={empty}>{d.team}</p> : null}
        </section>

        <Section id="conversation" title={d.conversation}>
          <p className="text-lk-caption text-lk-ink-3">{d.conversationNote}</p>
          {!messages.ok ? (
            <InlineAlert
              tone="danger"
              action={
                <Link
                  href={`/admin/signalements/${report.id}`}
                  className="font-semibold underline underline-offset-2 hover:no-underline"
                >
                  {t.retry}
                </Link>
              }
            >
              {t.error}
            </InlineAlert>
          ) : messages.data.length === 0 ? (
            <p className={empty}>{d.conversationEmpty}</p>
          ) : (
            <ol className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {messages.data.map((message) => {
                const sender = message.senderId ? people.get(message.senderId) : undefined;
                const fromTarget = sender !== undefined && sender.id === target?.id;
                return (
                  <li
                    key={message.id}
                    className={cn(
                      "flex flex-col gap-1 px-5 py-3",
                      fromTarget && "bg-lk-stone-2/60",
                    )}
                  >
                    <p className="text-lk-caption text-lk-ink-3">
                      {[
                        message.system
                          ? d.system
                          : sender
                            ? d.from(nameOf(sender), sender.role ? d[sender.role] : "")
                            : d.deleted,
                        formatDateTime(message.at, now),
                      ].join(" · ")}
                    </p>
                    <p className="text-lk-secondary whitespace-pre-line text-lk-ink">
                      {message.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </Section>

        <Section id="historique" title={d.history}>
          {!history.ok ? (
            <InlineAlert tone="danger">{d.historyError}</InlineAlert>
          ) : history.data.length === 0 ? (
            <p className={empty}>{d.historyEmpty}</p>
          ) : (
            <ol className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {history.data.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 px-5 py-3">
                  <p className="text-lk-label font-semibold text-lk-ink">
                    {t.history.actions[entry.action] ?? t.history.other}
                    {entry.actorName ? (
                      <span className="font-normal text-lk-ink-3">
                        {" "}
                        {t.history.by(entry.actorName)}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-lk-caption text-lk-ink-3">{formatDateTime(entry.at, now)}</p>
                  {entry.reason ? (
                    <p className="text-lk-secondary whitespace-pre-line text-lk-ink-2">
                      {t.history.reason(entry.reason)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </Section>
      </ModerationFeedback>
    </AdminPage>
  );
}
