import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { SectionTitle } from "@/components/shared/section-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/core/auth/session";
import { AccountModeration } from "@/leenkey/admin/components/account-moderation";
import { AccountStatusBadge, RoleBadges } from "@/leenkey/admin/components/account-badges";
import { ModerationFeedback } from "@/leenkey/admin/components/listing-moderation";
import { adminUser, fullName, type AdminUserDetail } from "@/leenkey/admin/users/queries";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { formatDateShort, formatDateTime, formatRelative } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { adminUsersHref } from "@/lib/validations/admin";
import { AdminPage } from "../../_components/admin-page";

const t = fr.adminUsers;
const d = t.detail;

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  return adminUser(id);
}

const nameOf = (user: AdminUserDetail) => fullName(user.firstName, user.lastName) ?? t.noName;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const result = await load((await params).id);
  return {
    title: result?.ok && result.data ? t.detailMetaTitle(nameOf(result.data)) : t.metaTitle,
  };
}

/** « Appartement 3 pièces » before step 3, when the listing has no title yet. */
function propertyLabel(property: AdminUserDetail["properties"][number]): string {
  if (property.title) return property.title;
  const type = property.type ? fr.propertyType[property.type] : fr.propertyType.autre;
  const withRooms =
    (property.type === "appartement" || property.type === "maison") &&
    property.rooms !== null &&
    property.rooms > 0;
  return withRooms ? `${type} ${fr.listing.summary.rooms(property.rooms ?? 0)}` : type;
}

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

/** The status of its listing and its plan: under the place on a phone, on the right from 640 px. */
function PropertyBadges({
  property,
  className,
}: {
  property: AdminUserDetail["properties"][number];
  className: string;
}) {
  return (
    <div className={`flex-wrap items-center gap-1.5 ${className}`}>
      {property.listing ? <StatusBadge status={property.listing.status} /> : null}
      <StatusBadge plan={property.plan} />
    </div>
  );
}

const box = "rounded-lk-md border border-lk-line bg-lk-surface";
const empty = "text-lk-secondary text-lk-ink-3";

// L1-30a: an account as the back office sees it (SPEC-V2 section 17): its
// information, its properties, its buying project, its conversations (their
// metadata only, never their messages), its cases and its history
// (audit_log); « Suspendre le compte » with a motive sent by email, or
// « Réactiver le compte ». Not yet here, with lot 2: its offers and its proof
// of financing (L2-02). The page checks the admin role itself.
export default async function AdminUserPage({ params }: Props) {
  const admin = await requireAdmin();
  const result = await load((await params).id);
  if (!result) notFound();
  if (!result.ok) {
    return (
      <AdminPage title={t.title}>
        <InlineAlert tone="danger">{t.error}</InlineAlert>
      </AdminPage>
    );
  }
  if (!result.data) notFound();
  const user = result.data;
  const name = nameOf(user);
  const now = new Date();
  const suspended = user.suspendedAt !== null;
  const facts = [
    {
      label: d.email,
      value: user.email ?? "—",
      note: user.emailConfirmedAt ? d.emailConfirmed : d.emailNotConfirmed,
    },
    { label: d.phone, value: user.phone ?? d.noPhone },
    { label: d.signedUp, value: formatDateShort(user.createdAt, now) },
    {
      label: d.lastSignIn,
      value: user.lastSignInAt ? formatRelative(user.lastSignInAt, now) : d.never,
    },
  ];

  return (
    <AdminPage
      title={name}
      titleOnMobile
      back={
        <Link
          href={adminUsersHref({})}
          className="inline-flex min-h-11 items-center gap-1 text-lk-secondary font-semibold text-lk-blue"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
      }
    >
      <ModerationFeedback>
        <section aria-label={d.info} className={`flex flex-col gap-4 p-5 ${box}`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <AccountStatusBadge suspended={suspended} />
            <RoleBadges roles={user.roles} />
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-lk-caption text-lk-ink-3">{fact.label}</dt>
                <dd className="text-lk-label font-semibold break-words text-lk-ink">
                  {fact.value}
                  {"note" in fact && fact.note ? (
                    <span className="block text-lk-caption font-normal text-lk-ink-3">
                      {fact.note}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
          {suspended && user.suspensionReason ? (
            <div className="rounded-lk-md bg-lk-danger-bg px-4 py-3 text-lk-danger-fg">
              <p className="text-lk-caption font-semibold">
                {d.suspensionReason}
                {user.suspendedAt ? ` · ${formatDateShort(user.suspendedAt, now)}` : ""}
              </p>
              <p className="text-lk-secondary whitespace-pre-line">{user.suspensionReason}</p>
            </div>
          ) : null}
          {user.id === admin.id ? (
            <p className={empty}>{d.self}</p>
          ) : (
            <AccountModeration profileId={user.id} name={name} suspended={suspended} />
          )}
        </section>

        <Section id="biens" title={d.properties}>
          {user.properties.length === 0 ? (
            <p className={empty}>{d.propertiesEmpty}</p>
          ) : (
            <ul className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {user.properties.map((property) => (
                <li key={property.id} className="flex items-center gap-3 px-4 py-3">
                  <PropertyThumb
                    src={property.coverPath ? photoUrl(property.coverPath) : null}
                    className="h-11 w-14 self-start sm:self-center"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {property.listing ? (
                      <Link
                        href={`/admin/annonces/${property.listing.id}`}
                        className="truncate text-lk-label font-semibold text-lk-ink underline-offset-2 hover:underline"
                      >
                        {propertyLabel(property)}
                      </Link>
                    ) : (
                      <span className="truncate text-lk-label font-semibold text-lk-ink">
                        {propertyLabel(property)}
                      </span>
                    )}
                    <span className="truncate text-lk-caption text-lk-ink-3">
                      {[property.city, property.listing?.reference ?? d.noListing].join(" · ")}
                    </span>
                    <PropertyBadges property={property} className="flex sm:hidden" />
                  </div>
                  <PropertyBadges property={property} className="hidden shrink-0 sm:flex" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {user.buyer ? (
          <Section id="projet" title={d.buyer}>
            <dl className={`grid grid-cols-1 gap-x-6 gap-y-3 p-5 sm:grid-cols-3 ${box}`}>
              <div className="flex flex-col gap-0.5">
                <dt className="text-lk-caption text-lk-ink-3">{d.project}</dt>
                <dd className="text-lk-label font-semibold text-lk-ink">
                  {user.buyer.project
                    ? fr.buyerSpace.profile.projects[user.buyer.project]
                    : d.noProject}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-lk-caption text-lk-ink-3">{d.cities}</dt>
                <dd className="text-lk-label font-semibold text-lk-ink">
                  {user.buyer.targetCities.length > 0
                    ? user.buyer.targetCities.join(", ")
                    : d.noProject}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-lk-caption text-lk-ink-3">{d.financing}</dt>
                <dd className="text-lk-label font-semibold text-lk-ink">
                  {fr.financingStatus[user.buyer.financingStatus]}
                </dd>
              </div>
            </dl>
          </Section>
        ) : null}

        <Section id="conversations" title={d.conversations}>
          <p className="text-lk-caption text-lk-ink-3">{d.conversationsNote}</p>
          {user.conversations.length === 0 ? (
            <p className={empty}>{d.conversationsEmpty}</p>
          ) : (
            <ul className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {user.conversations.map((conversation) => {
                const other = conversation.counterpartName ?? d.someone;
                return (
                  <li key={conversation.id} className="flex flex-col gap-0.5 px-4 py-3">
                    <p className="text-lk-label font-semibold text-lk-ink">
                      {conversation.role === "seller" ? d.asSeller(other) : d.asBuyer(other)}
                      {conversation.closed ? (
                        <span className="font-normal text-lk-ink-3"> · {d.closed}</span>
                      ) : null}
                    </p>
                    <p className="text-lk-caption text-lk-ink-3">
                      {[
                        conversation.listingTitle,
                        conversation.lastMessageAt
                          ? d.lastMessage(formatRelative(conversation.lastMessageAt, now))
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section id="dossiers" title={d.cases}>
          {user.cases.length === 0 ? (
            <p className={empty}>{d.casesEmpty}</p>
          ) : (
            <ul className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {user.cases.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-lk-label font-semibold text-lk-ink">
                      {item.subject}
                    </span>
                    <span className="text-lk-caption text-lk-ink-3">
                      {formatDateShort(item.createdAt, now)}
                    </span>
                  </span>
                  <span className="shrink-0 text-lk-caption font-semibold text-lk-ink-2">
                    {d.caseStatus[item.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="historique" title={d.history}>
          {user.history.length === 0 ? (
            <p className={empty}>{d.historyEmpty}</p>
          ) : (
            <ol className={`flex flex-col divide-y divide-lk-line ${box}`}>
              {user.history.map((entry) => (
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

        <p className="text-lk-caption text-lk-ink-3">{d.later}</p>
      </ModerationFeedback>
    </AdminPage>
  );
}
