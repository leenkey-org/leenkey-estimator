import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { SectionTitle } from "@/components/shared/section-title";
import { pillClassName, StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/core/auth/session";
import { adminCase, isCheckNote, type AdminCaseDetail } from "@/leenkey/admin/cases/queries";
import { CaseStatusBadge, CheckBadge } from "@/leenkey/admin/components/case-badges";
import { CaseDecisions, CaseNoteForm, CaseTasks } from "@/leenkey/admin/components/case-decisions";
import { ModerationFeedback } from "@/leenkey/admin/components/listing-moderation";
import { adminAdvisorConversations } from "@/leenkey/admin/messages/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatDateTime } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { adminCasesHref } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { AdminPage } from "../../_components/admin-page";

const t = fr.adminCases;
const d = t.detail;

type Props = { params: Promise<{ id: string }> };

type CaseStatus = Database["public"]["Enums"]["case_status"];

// adminCase is read once per request (React cache): metadata and page share it.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const result = await adminCase((await params).id);
  return {
    title: result.ok && result.data ? t.detailMetaTitle(result.data.subject) : t.metaTitle,
  };
}

const backLink = (
  <Link
    href={adminCasesHref({})}
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

const statusLabel = (value: unknown) =>
  typeof value === "string" && value in t.status ? t.status[value as CaseStatus] : "—";

/** A line of the history of the case, from what audit_log keeps of it. */
function historyLine(entry: AdminCaseDetail["history"][number], names: Record<string, string>) {
  const { meta } = entry;
  switch (entry.action) {
    case "case.status":
      return t.history.status(statusLabel(meta.from), statusLabel(meta.to));
    case "case.assign":
      if (typeof meta.to !== "string") return t.history.unfollowed;
      // « Suit le dossier par Cédric », not « Suivi par Cédric par Cédric ».
      return meta.to === entry.actorId
        ? t.history.followedSelf
        : t.history.followed(names[meta.to] ?? fr.adminUsers.noName);
    case "case.note":
      return t.history.note;
    case "case.task": {
      const title = typeof meta.title === "string" ? meta.title : "";
      return meta.done === true ? t.history.taskDone(title) : t.history.taskUndone(title);
    }
    default:
      return t.history.other;
  }
}

const STEP_TONE = {
  done: "bg-lk-success-bg text-lk-success-fg",
  current: "bg-lk-blue-tint text-lk-blue-dark",
  next: "bg-lk-stone-2 text-lk-ink-3",
} as const;

// L1-30c: a case as the back office sees it (SPEC-V2 section 17): the
// account, the property and its listing, the plan, the status and who
// follows it; the summary of the assistant when there is one; the internal
// notes (those Leenkey writes itself, a payment to check, L1-26, among
// them); the tasks of Leenkey of the current step to tick; the steps of the
// sale; the history. « Synthèse avant appel » comes with the assistant of
// the back office (L1-30d). The page checks the admin role itself.
export default async function AdminCasePage({ params }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [result, advisors] = await Promise.all([adminCase(id), adminAdvisorConversations()]);
  if (!result.ok) {
    return (
      <AdminPage title={t.title} titleOnMobile back={backLink}>
        <InlineAlert
          tone="danger"
          action={
            <Link
              href={`/admin/dossiers/${id}`}
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
  const item = result.data;
  const now = new Date();
  const listing = item.property?.listing ?? null;
  const facts: { label: string; value: ReactNode }[] = [
    {
      label: d.account,
      value: item.account.deleted ? (
        d.deletedAccount
      ) : (
        <Link
          href={`/admin/utilisateurs/${item.account.id}`}
          className="text-lk-blue underline-offset-2 hover:underline"
        >
          {item.account.name ?? fr.adminUsers.noName}
        </Link>
      ),
    },
    {
      label: d.property,
      value: listing ? (
        <Link
          href={`/admin/annonces/${listing.id}`}
          className="text-lk-blue underline-offset-2 hover:underline"
        >
          {[listing.reference, listing.title ?? item.property?.city].filter(Boolean).join(" · ")}
        </Link>
      ) : (
        (item.property?.city ?? t.noProperty)
      ),
    },
    { label: d.opened, value: formatDateTime(item.createdAt, now) },
    { label: d.followed, value: item.followedBy?.name ?? t.nobody },
  ];
  // L1-34: the conversation with the adviser of the property, to answer from the case.
  const conversation = advisors.ok
    ? advisors.data.find((row) => row.propertyId === item.property?.id)
    : undefined;
  if (conversation) {
    facts.push({
      label: d.conversation,
      value: (
        <Link
          href={`${ROUTES.adminMessages}/${conversation.id}`}
          className="text-lk-blue underline-offset-2 hover:underline"
        >
          {d.conversationLink}
        </Link>
      ),
    });
  }

  return (
    <AdminPage title={item.subject} titleOnMobile back={backLink}>
      <ModerationFeedback>
        <section aria-label={d.info} className={`flex flex-col gap-4 p-5 ${box}`}>
          <div className="flex flex-wrap items-center gap-2">
            <CaseStatusBadge status={item.status} />
            {item.toCheck ? <CheckBadge /> : null}
            {item.plan ? <StatusBadge plan={item.plan} /> : null}
            <span className="text-lk-caption text-lk-ink-3">{t.sources[item.source]}</span>
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
          <CaseDecisions
            caseId={item.id}
            status={item.status}
            followed={item.followedBy?.id === admin.id}
          />
        </section>

        {item.toCheck ? (
          <InlineAlert tone="warning">
            <strong className="block font-semibold">{d.toCheckTitle}</strong>
            {d.toCheckText}
          </InlineAlert>
        ) : null}

        {item.aiSummary ? (
          <Section id="resume" title={d.aiSummary}>
            <p className={`p-5 text-lk-secondary whitespace-pre-line text-lk-ink-2 ${box}`}>
              {item.aiSummary}
            </p>
          </Section>
        ) : null}

        <Section id="notes" title={d.notes}>
          <p className="text-lk-caption text-lk-ink-3">{d.notesNote}</p>
          {item.notes.length === 0 ? (
            <p className={empty}>{d.notesEmpty}</p>
          ) : (
            <ol className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {item.notes.map((note) => (
                <li
                  key={note.id}
                  className={cn(
                    "flex flex-col gap-1 px-5 py-3",
                    isCheckNote(note) && "bg-lk-danger-bg/40",
                  )}
                >
                  <p className="text-lk-caption text-lk-ink-3">
                    {[
                      note.automatic ? d.automatic : (note.authorName ?? fr.adminUsers.noName),
                      formatDateTime(note.at, now),
                    ].join(" · ")}
                  </p>
                  <p className="text-lk-secondary whitespace-pre-line text-lk-ink">{note.body}</p>
                </li>
              ))}
            </ol>
          )}
          <CaseNoteForm caseId={item.id} />
        </Section>

        <Section id="taches" title={d.tasks}>
          {item.sale ? (
            <>
              {item.sale.currentStep ? (
                <p className="text-lk-caption text-lk-ink-3">
                  {d.tasksLead(item.sale.currentStep)}
                </p>
              ) : null}
              {item.sale.tasks.length === 0 ? (
                <p className={empty}>{d.tasksEmpty}</p>
              ) : (
                <div className={`p-5 ${box}`}>
                  <CaseTasks caseId={item.id} tasks={item.sale.tasks} />
                </div>
              )}
            </>
          ) : (
            <p className={empty}>{d.noSale}</p>
          )}
        </Section>

        {item.sale ? (
          <Section id="etapes" title={d.steps}>
            <ol className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {item.sale.steps.map((step, index) => (
                <li key={step.code} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="text-lk-label font-semibold text-lk-ink">
                    {index + 1}. {step.title}
                  </span>
                  <span
                    className={cn(
                      pillClassName,
                      "shrink-0 px-2.5 py-1.25 text-lk-micro font-semibold",
                      STEP_TONE[step.state],
                    )}
                  >
                    {d.stepState[step.state]}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        <Section id="historique" title={d.history}>
          {item.history.length === 0 ? (
            <p className={empty}>{d.historyEmpty}</p>
          ) : (
            <ol className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {item.history.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 px-5 py-3">
                  <p className="text-lk-label font-semibold text-lk-ink">
                    {historyLine(entry, item.names)}
                    {entry.actorName ? (
                      <span className="font-normal text-lk-ink-3">
                        {" "}
                        {t.history.by(entry.actorName)}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-lk-caption text-lk-ink-3">{formatDateTime(entry.at, now)}</p>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </ModerationFeedback>
    </AdminPage>
  );
}
