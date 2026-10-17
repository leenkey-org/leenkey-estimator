import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/shared/button";
import {
  DataTable,
  DataTableActions,
  DataTableCell,
  DataTableHeader,
  DataTableRow,
  DataTableRowHeader,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/filter-pills";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/core/auth/session";
import {
  ListingModeration,
  ModerationFeedback,
} from "@/leenkey/admin/components/listing-moderation";
import { ListingPlace } from "@/leenkey/admin/components/listing-place";
import { ListingThumb } from "@/leenkey/admin/components/listing-thumb";
import {
  ADMIN_LISTINGS_LIMIT,
  adminListingCounts,
  adminListings,
  type AdminListingRow,
} from "@/leenkey/admin/queries";
import { capitalize, formatPrice, formatRelative } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import {
  ADMIN_LISTING_FILTERS,
  adminListingsHref,
  parseAdminListingsQuery,
} from "@/lib/validations/admin";
import { AdminPage } from "../_components/admin-page";

const t = fr.adminListings;

export const metadata: Metadata = { title: t.metaTitle };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const COLUMNS = [
  t.table.property,
  t.table.seller,
  t.table.price,
  t.table.plan,
  t.table.received,
  t.table.status,
];

function received(row: AdminListingRow, now: Date): string {
  return row.submittedAt ? capitalize(formatRelative(row.submittedAt, now)) : t.notReceived;
}

function detailHref(row: AdminListingRow): string {
  return `/admin/annonces/${row.id}`;
}

// L1-19: the listings to review, then all the others (SPEC-V2 section 17,
// DESIGN.md 12.12 desktop table, 12.13 mobile cards). Filters and search in
// the URL. Not yet here: the AI pre-analysis and the CSV export (L1-30). The
// page checks the admin role itself, not only the layout.
export default async function AdminListingsPage({ searchParams }: Props) {
  await requireAdmin();
  const filter = parseAdminListingsQuery(await searchParams);
  const [list, counts] = await Promise.all([adminListings(filter), adminListingCounts()]);
  const now = new Date();

  const pills = [
    {
      href: adminListingsHref({ query: filter.query }),
      label: t.filters.all,
      count: counts.ok
        ? Object.values(counts.data).reduce((sum, count) => sum + count, 0)
        : undefined,
      active: filter.status === undefined,
    },
    ...ADMIN_LISTING_FILTERS.filter(
      // An empty status is left out, but the pending one and the active one.
      ({ status }) =>
        status === "pending" || status === filter.status || !counts.ok || counts.data[status] > 0,
    ).map(({ status }) => ({
      href: adminListingsHref({ status, query: filter.query }),
      label: fr.listingStatus[status],
      count: counts.ok ? counts.data[status] : undefined,
      active: filter.status === status,
    })),
  ];

  let content: ReactNode;
  if (!list.ok) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={adminListingsHref(filter)}
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
        description={filter.query ? t.empty.search(filter.query) : t.empty.text}
        action={
          filter.status || filter.query ? (
            <Button asChild variant="outline-ink">
              <Link href={adminListingsHref({})}>{t.empty.action}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    const { rows, limited } = list.data;
    content = (
      <>
        {limited ? <InlineAlert tone="info">{t.limited(ADMIN_LISTINGS_LIMIT)}</InlineAlert> : null}
        <ul aria-label={t.table.label} className="flex flex-col gap-3 lg:hidden">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lk-md border border-lk-line bg-lk-surface p-3">
              <div className="flex gap-3">
                <ListingThumb className="h-16 w-18" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lk-title font-bold text-wide tabular text-lk-ink">
                      {formatPrice(row.priceCents)}
                    </p>
                    <StatusBadge status={row.status} />
                  </div>
                  <Link
                    href={detailHref(row)}
                    className="truncate text-lk-label font-semibold text-lk-ink underline-offset-2 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <ListingPlace
                    city={row.city}
                    reference={row.reference}
                    postalCode={row.postalCode}
                    className="truncate text-lk-caption text-lk-ink-3"
                  />
                  <p className="truncate text-lk-caption text-lk-ink-3">
                    {[
                      row.sellerName ?? t.sellerUnknown,
                      fr.plan[row.plan],
                      received(row, now),
                    ].join(" · ")}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <ListingModeration
                  listingId={row.id}
                  reference={row.reference}
                  status={row.status}
                  compact
                />
                <Link
                  href={detailHref(row)}
                  aria-label={t.openLabel(row.reference)}
                  className={cn(
                    iconButtonVariants({ variant: "stone" }),
                    "inline-flex items-center justify-center",
                  )}
                >
                  <Eye aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <DataTable label={t.table.label} className="hidden lg:block">
          <DataTableHeader columns={COLUMNS} />
          {rows.map((row) => (
            <tbody key={row.id} className="border-t border-lk-line">
              <DataTableRow className="border-t-0">
                <DataTableRowHeader>
                  <div className="flex items-center gap-3">
                    <ListingThumb className="h-11 w-14" />
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={detailHref(row)}
                        className="font-semibold text-lk-ink underline-offset-2 hover:underline"
                      >
                        {row.title}
                      </Link>
                      <ListingPlace
                        city={row.city}
                        reference={row.reference}
                        postalCode={row.postalCode}
                        className="text-lk-caption text-lk-ink-3"
                      />
                    </div>
                  </div>
                </DataTableRowHeader>
                <DataTableCell>{row.sellerName ?? t.sellerUnknown}</DataTableCell>
                <DataTableCell className="whitespace-nowrap tabular">
                  {formatPrice(row.priceCents)}
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge plan={row.plan} />
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap text-lk-ink-2">
                  {received(row, now)}
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge status={row.status} />
                </DataTableCell>
              </DataTableRow>
              <DataTableActions columns={COLUMNS.length}>
                <Button asChild variant="ghost" size="sm">
                  <Link href={detailHref(row)} aria-label={t.openLabel(row.reference)}>
                    {t.open}
                  </Link>
                </Button>
                <ListingModeration
                  listingId={row.id}
                  reference={row.reference}
                  status={row.status}
                />
              </DataTableActions>
            </tbody>
          ))}
        </DataTable>
      </>
    );
  }

  return (
    <AdminPage title={t.title}>
      {counts.ok ? (
        <p className="text-lk-secondary text-lk-ink-3 md:-mt-4">
          {[
            t.summary.pending(counts.data.pending),
            t.summary.published(counts.data.published),
            counts.data.suspended > 0 ? t.summary.suspended(counts.data.suspended) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {/* A new form for each address: the field shows the search of the page. */}
        <form
          key={adminListingsHref(filter)}
          role="search"
          action="/admin/annonces"
          className="flex items-end gap-2 md:max-w-md"
        >
          {filter.status ? (
            <input
              type="hidden"
              name="statut"
              value={ADMIN_LISTING_FILTERS.find(({ status }) => status === filter.status)?.param}
            />
          ) : null}
          <Input
            type="search"
            name="q"
            label={t.search.label}
            hideLabel
            placeholder={t.search.placeholder}
            defaultValue={filter.query}
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
      {/* The outcome of a decision does not follow to another list. */}
      <ModerationFeedback key={adminListingsHref(filter)}>{content}</ModerationFeedback>
    </AdminPage>
  );
}
