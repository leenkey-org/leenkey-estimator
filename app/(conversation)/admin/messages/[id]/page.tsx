import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/core/auth/session";
import { listThreadMessages } from "@/core/messaging/queries";
import { AdvisorInbox, advisorPropertyLine } from "@/leenkey/admin/components/advisor-inbox";
import { adminAdvisorConversations } from "@/leenkey/admin/messages/queries";
import { ConversationView } from "@/leenkey/messaging/components/conversation-view";
import { InboxRefresh } from "@/leenkey/messaging/components/inbox-refresh";
import { MessagesLayout } from "@/leenkey/messaging/components/messages-layout";
import { coverSrc } from "@/leenkey/messaging/presentation";
import { isUuid, threadSenders } from "@/leenkey/messaging/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAdminMessages } from "@/lib/i18n/sections/adminMessages";
import { frMessaging } from "@/lib/i18n/sections/messaging";
import { frPlan } from "@/lib/i18n/sections/plan";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminMessages: frAdminMessages, messaging: frMessaging, plan: frPlan } as const;

const t = fr.adminMessages;
const advisor = fr.messaging.advisor;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const { id } = await params;
  const list = isUuid(id) ? await adminAdvisorConversations() : null;
  const conversation = list?.ok ? list.data.find((item) => item.id === id) : undefined;
  return {
    title: conversation ? t.detailMetaTitle(conversation.sellerName ?? t.noName) : t.metaTitle,
  };
}

// L1-34: a conversation with a seller of a paid plan, for the team (SPEC-V2
// 8.6 and 17): any admin answers, signed with their first name; read by one,
// read for the team. The frame of the messaging (no tabs over the field on a
// phone), the shared inbox on its left from 1024 px. Not an advisor
// conversation: a 404, as for an account without the admin role.
export default async function AdminConversationPage({ params }: Props) {
  const profile = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [list, thread, names] = await Promise.all([
    adminAdvisorConversations(),
    listThreadMessages(id),
    threadSenders(id),
  ]);
  // The error boundary of the group (error.tsx) shows « Ça n'a pas fonctionné. ».
  if (!list.ok || !thread.ok) throw new Error("The advisor conversation could not be read.");
  const conversation = list.data.find((item) => item.id === id);
  if (!conversation) notFound();
  const now = new Date();
  const seller = conversation.sellerName ?? t.noName;

  return (
    <>
      <MessagesLayout
        show="detail"
        list={
          <div className="flex flex-col gap-3 p-4">
            <h2 className="text-lk-title font-semibold text-lk-ink">{t.title}</h2>
            <AdvisorInbox conversations={list.data} currentId={id} now={now} />
          </div>
        }
      >
        <ConversationView
          key={id}
          conversationId={id}
          viewerId={profile.id}
          counterpart={conversation.sellerFirstName ?? t.noName}
          header={{
            title: seller,
            subtitle: [
              advisorPropertyLine(conversation),
              conversation.closed ? null : fr.plan[conversation.plan],
            ]
              .filter(Boolean)
              .join(" · "),
            thumbSrc: coverSrc(conversation.coverPath),
            href: conversation.caseId ? `${ROUTES.adminCases}/${conversation.caseId}` : null,
            hrefLabel: advisor.case,
          }}
          backHref={ROUTES.adminMessages}
          advisor={{ sellerId: conversation.sellerId, names }}
          closedText={advisor.closedTeam}
          report={false}
          initialMessages={thread.data}
          unread={conversation.unread}
          closed={conversation.closed}
          now={now.toISOString()}
        />
      </MessagesLayout>
      <InboxRefresh profileId={profile.id} kind="advisor" media="(min-width: 1024px)" />
    </>
  );
}
