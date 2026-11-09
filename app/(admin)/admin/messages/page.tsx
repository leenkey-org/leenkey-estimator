import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/filter-pills";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireAdmin } from "@/core/auth/session";
import { AdvisorInbox } from "@/leenkey/admin/components/advisor-inbox";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { adminAdvisorConversations, awaitingAnswer } from "@/leenkey/admin/messages/queries";
import { fr } from "@/lib/i18n/fr";
import {
  ADMIN_MESSAGE_PLANS,
  adminMessagesHref,
  parseAdminMessagesQuery,
} from "@/lib/validations/admin";
import { AdminPage } from "../_components/admin-page";

const t = fr.adminMessages;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// L1-34: the shared inbox of the conversations with the sellers of a paid
// plan (SPEC-V2 section 17): the unread ones first, a filter by plan, in
// orange a seller waiting for more than 24 h. Any admin answers, from the
// conversation (from 1024 px, this list stays on its left). The page checks
// the admin role itself, not only the layout.
export default async function AdminMessagesPage({ searchParams }: Props) {
  await requireAdmin();
  const query = parseAdminMessagesQuery(await searchParams);
  const list = await adminAdvisorConversations();
  const now = new Date();

  const all = list.ok ? list.data : [];
  const pills = [
    {
      href: adminMessagesHref({ plan: null }),
      label: t.filters.all,
      count: list.ok ? all.length : undefined,
      active: query.plan === null,
    },
    ...ADMIN_MESSAGE_PLANS.map((plan) => ({
      href: adminMessagesHref({ plan }),
      label: fr.plan[plan],
      count: list.ok ? all.filter((row) => !row.closed && row.plan === plan).length : undefined,
      active: query.plan === plan,
    })),
  ];

  let content: ReactNode;
  if (!list.ok) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={adminMessagesHref(query)}
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
    // A plan: its open conversations (a closed one has no plan with an adviser any more).
    const rows = query.plan ? all.filter((row) => !row.closed && row.plan === query.plan) : all;
    content =
      rows.length === 0 ? (
        <EmptyState
          className="py-10"
          title={query.plan ? t.empty.filteredTitle : t.empty.title}
          description={query.plan ? t.empty.filteredText : t.empty.text}
        />
      ) : (
        <AdvisorInbox conversations={rows} now={now} className="lg:max-w-3xl" />
      );
  }

  const unread = all.filter((row) => row.unread).length;
  const late = all.filter((row) => awaitingAnswer(row, now)).length;

  return (
    <AdminPage title={t.title}>
      {list.ok ? (
        <p className="text-lk-secondary text-lk-ink-3 md:-mt-4">
          {[t.summary.unread(unread), t.summary.late(late)].join(" · ")}
        </p>
      ) : null}
      <FilterPills label={t.filters.label} items={pills} />
      {content}
    </AdminPage>
  );
}
