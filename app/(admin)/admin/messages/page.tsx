import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/filter-pills";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireAdmin } from "@/core/auth/session";
import { AdvisorInbox } from "@/leenkey/admin/components/advisor-inbox";
import { InboxRefresh } from "@/leenkey/messaging/components/inbox-refresh";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { adminAdvisorConversations, awaitingAnswer } from "@/leenkey/admin/messages/queries";
import { frAdminMessages } from "@/lib/i18n/sections/adminMessages";
import { frPlan } from "@/lib/i18n/sections/plan";
import { adminMessagesHref, parseAdminMessagesQuery } from "@/lib/validations/admin";
import { planCode } from "@/lib/validations/billing";
import { AdminPage } from "../_components/admin-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminMessages: frAdminMessages, plan: frPlan } as const;

const t = fr.adminMessages;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// L1-34: the shared inbox of the conversations with the sellers of a paid
// plan (SPEC-V2 section 17): the unread ones first, a filter by plan, in
// orange a seller waiting for more than 24 h. Any admin answers, from the
// conversation (from 1024 px, this list stays on its left). The page checks
// the admin role itself, not only the layout.
export default async function AdminMessagesPage({ searchParams }: Props) {
  const profile = await requireAdmin();
  const query = parseAdminMessagesQuery(await searchParams);
  const list = await adminAdvisorConversations();
  const now = new Date();

  const all = list.ok ? list.data : [];
  // The plans of the open conversations (those with the adviser), in their order.
  const open = all.filter((row) => !row.closed);
  const plans = planCode.options.filter(
    (plan) => plan === query.plan || open.some((row) => row.plan === plan),
  );
  const pills = [
    {
      href: adminMessagesHref({ plan: null }),
      label: t.filters.all,
      count: list.ok ? all.length : undefined,
      active: query.plan === null,
    },
    ...plans.map((plan) => ({
      href: adminMessagesHref({ plan }),
      label: fr.plan[plan],
      count: list.ok ? open.filter((row) => row.plan === plan).length : undefined,
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
      {/* A seller writes, the team reads: the list follows (Realtime). */}
      <InboxRefresh profileId={profile.id} kind="advisor" />
    </AdminPage>
  );
}
