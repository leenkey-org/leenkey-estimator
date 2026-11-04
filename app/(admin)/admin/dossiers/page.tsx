import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import {
  DataTable,
  DataTableCell,
  DataTableHeader,
  DataTableRow,
  DataTableRowHeader,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/filter-pills";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/core/auth/session";
import {
  ADMIN_CASES_LIMIT,
  adminCaseCounts,
  adminCases,
  type AdminCaseRow,
} from "@/leenkey/admin/cases/queries";
import { CaseStatusBadge, CheckBadge } from "@/leenkey/admin/components/case-badges";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { formatWaiting } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { ADMIN_CASE_FILTERS, adminCasesHref, parseAdminCasesQuery } from "@/lib/validations/admin";
import { AdminPage } from "../_components/admin-page";

const t = fr.adminCases;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const COLUMNS = [
  t.table.subject,
  t.table.source,
  t.table.plan,
  t.table.property,
  t.table.status,
  t.table.age,
  t.table.followed,
];

const sheetHref = (row: AdminCaseRow) => `/admin/dossiers/${row.id}`;

/** « LK-0001 · Juvisy-sur-Orge », the town of a property without a listing, else nothing. */
const propertyOf = (row: AdminCaseRow) =>
  [row.reference, row.city].filter(Boolean).join(" · ") || t.noProperty;

// L1-30c: the cases (SPEC-V2 section 17): source, plan, property, status,
// age, who follows it; the open ones first by age (the oldest waits the
// longest), a payment to check put forward (L1-26). A search on the subject,
// the reference, the town and the account; filters in the URL. Cards below
// 1024 px, a DataTable from 1024 px (template G7). The page checks the admin
// role itself, not only the layout.
export default async function AdminCasesPage({ searchParams }: Props) {
  await requireAdmin();
  const query = parseAdminCasesQuery(await searchParams);
  const [list, counts] = await Promise.all([adminCases(query), adminCaseCounts()]);
  const now = new Date();

  const countOf = (status: (typeof ADMIN_CASE_FILTERS)[number]["status"]) => {
    if (!counts.ok) return undefined;
    return {
      new: counts.data.new,
      in_progress: counts.data.inProgress,
      closed: counts.data.closed,
    }[status];
  };
  const pills = [
    {
      href: adminCasesHref({ query: query.query }),
      label: t.filters.open,
      count: counts.ok ? counts.data.open : undefined,
      active: query.status === undefined,
    },
    ...ADMIN_CASE_FILTERS.map(({ status }) => ({
      href: adminCasesHref({ status, query: query.query }),
      label: t.filters[status],
      count: countOf(status),
      active: query.status === status,
    })),
  ];

  let content: ReactNode;
  if (!list.ok) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={adminCasesHref(query)}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {t.retry}
          </Link>
        }
      >
        {t.error}
      </InlineAlert>
    );
  } else if (list.data.rows.length === 0) {
    content = (
      <EmptyState
        className="py-10"
        title={t.empty.title}
        description={query.query ? t.empty.search(query.query) : t.empty.text}
        action={
          query.status || query.query ? (
            <Button asChild variant="outline-ink">
              <Link href={adminCasesHref({})}>{t.empty.action}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    const { rows, limited } = list.data;
    content = (
      <>
        {limited ? <InlineAlert tone="info">{t.limited(ADMIN_CASES_LIMIT)}</InlineAlert> : null}
        <ul aria-label={t.table.label} className="flex flex-col gap-3 lg:hidden">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={sheetHref(row)}
                className="flex items-center gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-3 hover:bg-lk-stone-2"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-lk-label font-semibold text-lk-ink">{row.subject}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <CaseStatusBadge status={row.status} />
                    {row.toCheck ? <CheckBadge /> : null}
                    {row.plan ? <StatusBadge plan={row.plan} /> : null}
                  </span>
                  <span className="text-lk-caption text-lk-ink-3">
                    {[
                      t.sources[row.source],
                      propertyOf(row),
                      row.accountName,
                      t.since(formatWaiting(row.createdAt, now)),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-lk-ink-3" />
              </Link>
            </li>
          ))}
        </ul>

        <DataTable label={t.table.label} className="hidden lg:block">
          <DataTableHeader columns={COLUMNS} />
          <tbody>
            {rows.map((row) => (
              // The whole row opens the sheet (a target of 44 px at least).
              <DataTableRow key={row.id} className="relative has-[a:hover]:bg-lk-stone-2">
                <DataTableRowHeader>
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={sheetHref(row)}
                      aria-label={t.openLabel(row.subject)}
                      className="font-semibold text-lk-ink underline-offset-2 before:absolute before:inset-0 hover:underline"
                    >
                      {row.subject}
                    </Link>
                    {row.accountName ? (
                      <span className="truncate text-lk-caption text-lk-ink-3">
                        {row.accountName}
                      </span>
                    ) : null}
                    {row.toCheck ? <CheckBadge className="self-start" /> : null}
                  </div>
                </DataTableRowHeader>
                <DataTableCell className="text-lk-ink-2">{t.sources[row.source]}</DataTableCell>
                <DataTableCell>
                  {row.plan ? (
                    <StatusBadge plan={row.plan} />
                  ) : (
                    <span className="text-lk-ink-3">—</span>
                  )}
                </DataTableCell>
                <DataTableCell className="text-lk-ink-2">{propertyOf(row)}</DataTableCell>
                <DataTableCell>
                  <CaseStatusBadge status={row.status} />
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap text-lk-ink-2">
                  {formatWaiting(row.createdAt, now)}
                </DataTableCell>
                <DataTableCell className="text-lk-ink-2">
                  {row.followedBy ?? t.nobody}
                </DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      </>
    );
  }

  return (
    <AdminPage title={t.title}>
      {counts.ok ? (
        <p className="text-lk-secondary text-lk-ink-3 md:-mt-4">
          {[
            t.summary.open(counts.data.open),
            counts.data.toCheck > 0 ? t.summary.toCheck(counts.data.toCheck) : null,
            t.summary.closed(counts.data.closed),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {/* A new form for each address: the field shows the search of the page. */}
        <form
          key={adminCasesHref(query)}
          role="search"
          action="/admin/dossiers"
          className="flex items-end gap-2 md:max-w-md"
        >
          {query.status ? (
            <input
              type="hidden"
              name="statut"
              value={ADMIN_CASE_FILTERS.find(({ status }) => status === query.status)?.param}
            />
          ) : null}
          <Input
            type="search"
            name="q"
            label={t.search.label}
            hideLabel
            placeholder={t.search.placeholder}
            defaultValue={query.query}
            maxLength={100}
            compact
            containerClassName="flex-1"
          />
          <Button type="submit" variant="secondary" className="h-11">
            {t.search.submit}
          </Button>
        </form>
        <FilterPills label={t.filters.label} items={pills} />
      </div>
      {content}
    </AdminPage>
  );
}
