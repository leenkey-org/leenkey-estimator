import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
import { requireAdmin } from "@/core/auth/session";
import { AccountStatusBadge } from "@/leenkey/admin/components/account-badges";
import { adminMetadata } from "@/leenkey/admin/metadata";
import {
  ADMIN_REPORTS_LIMIT,
  adminReportCounts,
  adminReports,
  type AdminReportRow,
} from "@/leenkey/admin/reports/queries";
import { formatDateShort, formatWaiting } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { adminReportsHref, parseAdminReportsQuery } from "@/lib/validations/admin";
import { AdminPage } from "../_components/admin-page";

const t = fr.adminReports;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const COLUMNS = [t.table.reason, t.table.by, t.table.target, t.table.listing, t.table.received];

const sheetHref = (row: AdminReportRow) => `/admin/signalements/${row.id}`;
/** In a sentence (« Par … », « concerne … »): a deleted account, else its name. */
const nameOf = (name: string | null, deleted: boolean) =>
  deleted ? t.someone : (name ?? fr.adminUsers.noName);
/** In a cell of the table. */
const cellNameOf = (name: string | null, deleted: boolean) =>
  deleted ? t.deleted : (name ?? fr.adminUsers.noName);
/** The name of a link stays short: a motive runs up to 2000 characters. */
const clip = (text: string, max = 100) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
const listingOf = (row: AdminReportRow) =>
  [row.reference, row.listingTitle].filter(Boolean).join(" · ") || t.noListing;

// L1-30c: the reports (SPEC-V2 section 17): the reason, who reported whom, on
// which listing, when; the open ones from the oldest, the closed ones from
// the latest. Cards below 1024 px, a DataTable from 1024 px (template G7).
// The conversation is read on the sheet only, each reading traced. The page
// checks the admin role itself, not only the layout.
export default async function AdminReportsPage({ searchParams }: Props) {
  await requireAdmin();
  const query = parseAdminReportsQuery(await searchParams);
  const [list, counts] = await Promise.all([adminReports(query), adminReportCounts()]);
  const now = new Date();

  const pills = [
    {
      href: adminReportsHref({ closed: false }),
      label: t.filters.open,
      count: counts.ok ? counts.data.open : undefined,
      active: !query.closed,
    },
    {
      href: adminReportsHref({ closed: true }),
      label: t.filters.closed,
      count: counts.ok ? counts.data.closed : undefined,
      active: query.closed,
    },
  ];

  let content: ReactNode;
  if (!list.ok) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={adminReportsHref(query)}
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
        title={query.closed ? t.empty.closedTitle : t.empty.openTitle}
        description={query.closed ? t.empty.closedText : t.empty.openText}
      />
    );
  } else {
    const { rows, limited } = list.data;
    content = (
      <>
        {limited ? <InlineAlert tone="info">{t.limited(ADMIN_REPORTS_LIMIT)}</InlineAlert> : null}
        <ul aria-label={t.table.label} className="flex flex-col gap-3 lg:hidden">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={sheetHref(row)}
                prefetch={false}
                className="flex items-center gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-3 hover:bg-lk-stone-2"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="line-clamp-2 text-lk-label font-semibold text-lk-ink">
                    {clip(row.reason)}
                  </span>
                  <span className="text-lk-caption text-lk-ink-2">
                    {t.by(nameOf(row.reporterName, row.reporterDeleted))} ·{" "}
                    {t.about(nameOf(row.targetName, row.targetDeleted))}
                  </span>
                  <span className="text-lk-caption text-lk-ink-3">
                    {[
                      listingOf(row),
                      query.closed
                        ? formatDateShort(row.resolvedAt ?? row.createdAt, now)
                        : formatWaiting(row.createdAt, now),
                    ].join(" · ")}
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
                  {/* No prefetch: opening the sheet reads the conversation, traced. */}
                  <Link
                    href={sheetHref(row)}
                    prefetch={false}
                    aria-label={t.openLabel(clip(row.reason))}
                    className="line-clamp-2 max-w-80 font-semibold text-lk-ink underline-offset-2 before:absolute before:inset-0 hover:underline"
                  >
                    {clip(row.reason)}
                  </Link>
                </DataTableRowHeader>
                <DataTableCell className="text-lk-ink-2">
                  {cellNameOf(row.reporterName, row.reporterDeleted)}
                </DataTableCell>
                <DataTableCell>
                  <span className="flex flex-col items-start gap-1 text-lk-ink-2">
                    {cellNameOf(row.targetName, row.targetDeleted)}
                    {row.targetSuspended ? <AccountStatusBadge suspended /> : null}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-lk-ink-2">{listingOf(row)}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-lk-ink-2">
                  {query.closed
                    ? formatDateShort(row.resolvedAt ?? row.createdAt, now)
                    : formatWaiting(row.createdAt, now)}
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
          {[t.summary.open(counts.data.open), t.summary.closed(counts.data.closed)].join(" · ")}
        </p>
      ) : null}
      <FilterPills label={t.filters.label} items={pills} />
      {content}
    </AdminPage>
  );
}
