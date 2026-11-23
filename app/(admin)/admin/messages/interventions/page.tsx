import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/filter-pills";
import { InlineAlert } from "@/components/shared/inline-alert";
import { LinkTabs } from "@/components/shared/link-tabs";
import { requireAdmin } from "@/core/auth/session";
import {
  InterventionList,
  type InterventionListItem,
} from "@/leenkey/admin/components/intervention-list";
import { ModerationFeedback } from "@/leenkey/admin/components/listing-moderation";
import { adminInterventions, type AdminIntervention } from "@/leenkey/admin/interventions/queries";
import { adminMetadata } from "@/leenkey/admin/metadata";
import {
  interventionActions,
  interventionFilterCounts,
  matchesInterventionFilter,
} from "@/leenkey/advisor/interventions";
import { conversationTitle, coverSrc } from "@/leenkey/messaging/presentation";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatDateShort } from "@/lib/format";
import { frAdvisorInterventions } from "@/lib/i18n/sections/advisorInterventions";
import {
  ADMIN_INTERVENTION_FILTERS,
  adminInterventionsHref,
  parseAdminInterventionsQuery,
  type AdminInterventionFilter,
} from "@/lib/validations/advisor-intervention";
import { AdminPage } from "../../_components/admin-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { advisorInterventions: frAdvisorInterventions } as const;

const t = fr.advisorInterventions.admin;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const FILTERS: readonly AdminInterventionFilter[] = [
  "open",
  ...ADMIN_INTERVENTION_FILTERS.map((entry) => entry.filter),
];

/** An entry of the list, worded for the team. */
function toItem(row: AdminIntervention, now: Date): InterventionListItem {
  const planned = row.id !== null;
  const initial = row.reason === "initial_meeting";
  const date = !planned
    ? row.requestedAt
      ? t.planSince(formatDateShort(row.requestedAt, now))
      : null
    : row.status === "done" && row.doneAt
      ? t.doneOn(formatDateShort(row.doneAt, now), row.doneByFirstName)
      : row.requestedAt
        ? t.requestedOn(formatDateShort(row.requestedAt, now))
        : null;
  return {
    key: row.id ?? `initial:${row.propertyId}`,
    id: row.id,
    propertyId: row.propertyId,
    status: row.status,
    statusLabel: planned ? t.status[row.status] : t.status.toPlan,
    seller: row.sellerName ?? t.noName,
    property: [row.reference, conversationTitle(row)].filter(Boolean).join(" · "),
    coverSrc: coverSrc(row.coverPath),
    plan: row.plan,
    counter: row.quota !== null ? fr.advisorInterventions.counter(row.used, row.quota) : null,
    reason: fr.advisorInterventions.reasons[row.reason],
    message: row.message ?? (initial ? t.initialText : ""),
    quoted: row.message !== null,
    // An initial appointment planned by the team was never « asked »: its date only once done.
    date: planned && initial && row.status !== "done" ? null : date,
    note: row.teamNote,
    conversationHref: row.conversationId ? `${ROUTES.adminMessages}/${row.conversationId}` : null,
    actions: interventionActions(row.status, planned, initial),
    initial,
  };
}

// The interventions of the adviser, for the team (DECISIONS.md 2026-11-23;
// SPEC-V2 section 17, beside the shared inbox of the conversations with the
// sellers of a paid plan): the requests of the sellers and the initial
// appointments to plan, what waits first; « Planifiée », « Faite »,
// « Annulée » with an optional internal note, each written to audit_log; the
// counter of the property on each entry. The page checks the admin role
// itself, not only the layout.
export default async function AdminInterventionsPage({ searchParams }: Props) {
  await requireAdmin();
  const filter = parseAdminInterventionsQuery(await searchParams);
  const list = await adminInterventions();
  const now = new Date();
  const all = list.ok ? list.data : [];
  const counts = interventionFilterCounts(all.map((row) => row.status));
  const pills = FILTERS.map((value) => ({
    href: adminInterventionsHref(value),
    label: t.filters[value],
    count: list.ok ? counts[value] : undefined,
    active: filter === value,
  }));

  let content: ReactNode;
  if (!list.ok) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={adminInterventionsHref(filter)}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {t.retry}
          </Link>
        }
      >
        {t.error}
      </InlineAlert>
    );
  } else {
    const rows = all.filter((row) => matchesInterventionFilter(row.status, filter));
    content =
      rows.length === 0 ? (
        <EmptyState
          className="py-10"
          title={filter === "open" ? t.empty.title : t.empty.filteredTitle}
          description={filter === "open" ? t.empty.text : t.empty.filteredText}
        />
      ) : (
        <InterventionList items={rows.map((row) => toItem(row, now))} />
      );
  }

  const toPlan = all.filter((row) => row.id === null).length;

  return (
    <AdminPage title={t.title}>
      <LinkTabs
        label={t.tabs.label}
        tabs={[
          { href: ROUTES.adminMessages, label: t.tabs.conversations },
          { href: ROUTES.adminInterventions, label: t.tabs.interventions(counts.open) },
        ]}
        current={ROUTES.adminInterventions}
        className="md:-mt-2"
      />
      {list.ok ? (
        <p className="text-lk-secondary text-lk-ink-3">{t.summary(counts.open, toPlan)}</p>
      ) : null}
      <FilterPills label={t.filters.label} items={pills} />
      <ModerationFeedback>{content}</ModerationFeedback>
    </AdminPage>
  );
}
