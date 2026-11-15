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
import { adminMetadata } from "@/leenkey/admin/metadata";
import {
  ADMIN_OFFERS_LIMIT,
  adminOfferCounts,
  adminOffers,
  type AdminOfferRow,
} from "@/leenkey/admin/offers/queries";
import { OfferStatusBadge } from "@/leenkey/offers/components/offer-status-badge";
import { gapLabel, offerGap } from "@/leenkey/offers/figures";
import { formatNumericDateTime } from "@/leenkey/offers/document";
import { formatDate, formatPrice } from "@/lib/format";
import { frAdminOffers } from "@/lib/i18n/sections/adminOffers";
import {
  ADMIN_OFFER_FILTERS,
  adminOffersHref,
  parseAdminOffersQuery,
} from "@/lib/validations/admin";
import { AdminPage } from "../_components/admin-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminOffers: frAdminOffers } as const;

const t = fr.adminOffers;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const COLUMNS = [
  t.table.offer,
  t.table.property,
  t.table.plan,
  t.table.price,
  t.table.status,
  t.table.sent,
];

const sheetHref = (row: AdminOfferRow) => `/admin/offres/${row.id}`;

/** « LK-0001 · Juvisy-sur-Orge ». */
const propertyOf = (row: AdminOfferRow) =>
  [row.listingReference, row.city].filter(Boolean).join(" · ") || t.noProperty;

const partiesOf = (row: AdminOfferRow) =>
  t.parties(row.buyerName ?? t.noName, row.sellerName ?? t.noName);

/** « −12 000 € · −3,4 % », « Au prix affiché », or nothing without the two prices. */
function gapOf(row: AdminOfferRow): string | null {
  if (row.priceCents === null || row.askingPriceCents === null) return null;
  const gap = offerGap(row.priceCents, row.askingPriceCents);
  return gap ? (gapLabel(gap) ?? t.noGap) : null;
}

// L2-07: the offers (SPEC-V2 section 17), read only: every offer sent, the
// most recent first, with its property, the plan of its sale, its price and
// its gap to the price of the listing, its status. A search on the
// reference, the town and the two parties; filters in the URL; the offers of
// one account from its sheet (?compte=). Cards below 1024 px, a DataTable
// from 1024 px (template G7). The page checks the admin role itself, not only
// the layout.
export default async function AdminOffersPage({ searchParams }: Props) {
  await requireAdmin();
  const query = parseAdminOffersQuery(await searchParams);
  const [list, counts] = await Promise.all([adminOffers(query), adminOfferCounts()]);
  const now = new Date();
  const kept = { query: query.query, account: query.account };

  const pills = [
    {
      href: adminOffersHref(kept),
      label: t.filters.all,
      count: counts.ok && !query.account ? counts.data.total : undefined,
      active: query.status === undefined,
    },
    ...ADMIN_OFFER_FILTERS.map(({ status }) => ({
      href: adminOffersHref({ ...kept, status }),
      label: t.filters[status],
      count: counts.ok && !query.account ? counts.data[status] : undefined,
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
            href={adminOffersHref(query)}
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
    const filtered = Boolean(query.query || query.status || query.account);
    content = (
      <EmptyState
        className="py-10"
        title={t.empty.title}
        description={
          query.query ? t.empty.search(query.query) : filtered ? t.empty.filter : t.empty.text
        }
        action={
          filtered ? (
            <Button asChild variant="outline-ink">
              <Link href={adminOffersHref({})}>{t.empty.action}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    const { rows, limited } = list.data;
    content = (
      <>
        {limited ? <InlineAlert tone="info">{t.limited(ADMIN_OFFERS_LIMIT)}</InlineAlert> : null}
        <ul aria-label={t.table.label} className="flex flex-col gap-3 lg:hidden">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={sheetHref(row)}
                className="flex items-center gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-3 hover:bg-lk-stone-2"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-lk-label font-semibold text-lk-ink tabular">
                      {row.reference}
                    </span>
                    {row.priceCents !== null ? (
                      <span className="text-lk-label font-bold text-lk-ink tabular">
                        {formatPrice(row.priceCents)}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <OfferStatusBadge status={row.status} />
                    {row.plan ? <StatusBadge plan={row.plan} /> : null}
                  </span>
                  <span className="text-lk-caption text-lk-ink-3">
                    {[
                      propertyOf(row),
                      partiesOf(row),
                      gapOf(row),
                      row.submittedAt ? t.sentOn(formatDate(row.submittedAt, now)) : null,
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
                      aria-label={t.openLabel(row.reference)}
                      className="font-semibold text-lk-ink tabular underline-offset-2 before:absolute before:inset-0 hover:underline"
                    >
                      {row.reference}
                    </Link>
                    <span className="truncate text-lk-caption text-lk-ink-3">{partiesOf(row)}</span>
                  </div>
                </DataTableRowHeader>
                <DataTableCell className="text-lk-ink-2">{propertyOf(row)}</DataTableCell>
                <DataTableCell>
                  {row.plan ? (
                    <StatusBadge plan={row.plan} />
                  ) : (
                    <span className="text-lk-ink-3">—</span>
                  )}
                </DataTableCell>
                {/* The price and, under it, its gap to the price of the listing: seven
                    columns did not fit beside the menu at 1 280 px. */}
                <DataTableCell className="whitespace-nowrap tabular">
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold text-lk-ink">
                      {row.priceCents !== null ? formatPrice(row.priceCents) : "—"}
                    </span>
                    {gapOf(row) ? (
                      <span className="text-lk-caption text-lk-ink-3">{gapOf(row)}</span>
                    ) : null}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <OfferStatusBadge status={row.status} />
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap text-lk-ink-2">
                  {row.submittedAt ? formatNumericDateTime(row.submittedAt) : "—"}
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
            t.summary.waiting(counts.data.waiting),
            t.summary.accepted(counts.data.accepted),
            t.summary.total(counts.data.total),
          ].join(" · ")}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {query.account ? (
          <InlineAlert
            tone="info"
            action={
              <Link
                href={adminOffersHref({ status: query.status, query: query.query })}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {t.account.clear}
              </Link>
            }
          >
            {t.account.note}
          </InlineAlert>
        ) : null}
        {/* A new form for each address: the field shows the search of the page. */}
        <form
          key={adminOffersHref(query)}
          role="search"
          action="/admin/offres"
          className="flex items-end gap-2 md:max-w-md"
        >
          {query.status ? (
            <input
              type="hidden"
              name="statut"
              value={ADMIN_OFFER_FILTERS.find(({ status }) => status === query.status)?.param}
            />
          ) : null}
          {query.account ? <input type="hidden" name="compte" value={query.account} /> : null}
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
