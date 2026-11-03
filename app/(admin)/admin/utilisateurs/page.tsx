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
import { AccountStatusBadge, RoleBadges } from "@/leenkey/admin/components/account-badges";
import { adminMetadata } from "@/leenkey/admin/metadata";
import {
  ADMIN_USERS_LIMIT,
  adminUserCounts,
  adminUsers,
  type AdminUserRow,
} from "@/leenkey/admin/users/queries";
import { formatDateShort } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { ADMIN_USER_FILTERS, adminUsersHref, parseAdminUsersQuery } from "@/lib/validations/admin";
import { AdminPage } from "../_components/admin-page";

const t = fr.adminUsers;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const COLUMNS = [
  t.table.user,
  t.table.roles,
  t.table.signedUp,
  t.table.properties,
  t.table.plan,
  t.table.financing,
  t.table.status,
];

const sheetHref = (row: AdminUserRow) => `/admin/utilisateurs/${row.id}`;
/** The name of the account, else its email (a sign-up without a name). */
const nameOf = (row: AdminUserRow) => row.name ?? row.email;

/** The plan of a seller (« Autonomie » without a paid one), nothing for an account that sells nothing. */
function PlanCell({ row }: { row: AdminUserRow }) {
  if (row.paidPlan) return <StatusBadge plan={row.paidPlan} />;
  if (row.properties > 0) return <StatusBadge plan="autonomie" />;
  return <span className="text-lk-ink-3">{t.noPlan}</span>;
}

const financingOf = (row: AdminUserRow) =>
  row.financingStatus ? fr.financingStatus[row.financingStatus] : t.noFinancing;

// L1-30a: the accounts (SPEC-V2 section 17): roles, sign-up, properties,
// plan, financing status (its exact label, never « validé »), suspension.
// The most recent first; a search on the name and the email, filters in the
// URL. Cards below 1024 px, a DataTable from 1024 px (template G7). The page
// checks the admin role itself, not only the layout.
export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();
  const query = parseAdminUsersQuery(await searchParams);
  const [list, counts] = await Promise.all([adminUsers(query), adminUserCounts()]);
  const now = new Date();

  const countOf = (filter: (typeof ADMIN_USER_FILTERS)[number]["filter"]) => {
    if (!counts.ok) return undefined;
    const { sellers, buyers, admins, suspended } = counts.data;
    return { seller: sellers, buyer: buyers, admin: admins, suspended }[filter];
  };
  const pills = [
    {
      href: adminUsersHref({ query: query.query }),
      label: t.filters.all,
      count: counts.ok ? counts.data.total : undefined,
      active: query.filter === undefined,
    },
    ...ADMIN_USER_FILTERS.filter(
      // An empty filter is left out, but the active one.
      ({ filter }) => filter === query.filter || !counts.ok || (countOf(filter) ?? 0) > 0,
    ).map(({ filter }) => ({
      href: adminUsersHref({ filter, query: query.query }),
      label: t.filters[filter],
      count: countOf(filter),
      active: query.filter === filter,
    })),
  ];

  let content: ReactNode;
  if (!list.ok) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={adminUsersHref(query)}
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
          query.filter || query.query ? (
            <Button asChild variant="outline-ink">
              <Link href={adminUsersHref({})}>{t.empty.action}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    const { rows, limited } = list.data;
    content = (
      <>
        {limited ? <InlineAlert tone="info">{t.limited(ADMIN_USERS_LIMIT)}</InlineAlert> : null}
        <ul aria-label={t.table.label} className="flex flex-col gap-3 lg:hidden">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={sheetHref(row)}
                className="flex items-center gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-3 hover:bg-lk-stone-2"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate text-lk-label font-semibold text-lk-ink">
                      {nameOf(row)}
                    </span>
                    {row.suspendedAt ? <AccountStatusBadge suspended /> : null}
                  </span>
                  {row.name ? (
                    <span className="truncate text-lk-caption text-lk-ink-3">{row.email}</span>
                  ) : null}
                  <RoleBadges roles={row.roles} />
                  <span className="text-lk-caption text-lk-ink-3">
                    {[
                      t.signedUp(formatDateShort(row.createdAt, now)),
                      row.properties > 0 ? t.propertiesCount(row.properties) : null,
                      row.financingStatus ? fr.financingStatus[row.financingStatus] : null,
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
                  <div className="flex min-w-0 flex-col">
                    <Link
                      href={sheetHref(row)}
                      aria-label={t.openLabel(nameOf(row))}
                      className="font-semibold text-lk-ink underline-offset-2 before:absolute before:inset-0 hover:underline"
                    >
                      {nameOf(row)}
                    </Link>
                    {row.name ? (
                      <span className="truncate text-lk-caption text-lk-ink-3">{row.email}</span>
                    ) : null}
                  </div>
                </DataTableRowHeader>
                <DataTableCell>
                  <RoleBadges roles={row.roles} />
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap text-lk-ink-2">
                  {formatDateShort(row.createdAt, now)}
                </DataTableCell>
                <DataTableCell className="tabular">{row.properties}</DataTableCell>
                <DataTableCell>
                  <PlanCell row={row} />
                </DataTableCell>
                <DataTableCell className="text-lk-ink-2">{financingOf(row)}</DataTableCell>
                <DataTableCell>
                  <AccountStatusBadge suspended={row.suspendedAt !== null} />
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
            t.summary.total(counts.data.total),
            t.summary.sellers(counts.data.sellers),
            t.summary.buyers(counts.data.buyers),
            counts.data.suspended > 0 ? t.summary.suspended(counts.data.suspended) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {/* A new form for each address: the field shows the search of the page. */}
        <form
          key={adminUsersHref(query)}
          role="search"
          action="/admin/utilisateurs"
          className="flex items-end gap-2 md:max-w-md"
        >
          {query.filter ? (
            <input
              type="hidden"
              name="filtre"
              value={ADMIN_USER_FILTERS.find(({ filter }) => filter === query.filter)?.param}
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
