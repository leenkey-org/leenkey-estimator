import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/core/auth/session";
import { listThreadMessages } from "@/core/messaging/queries";
import { ConversationView } from "@/leenkey/messaging/components/conversation-view";
import { InboxPane } from "@/leenkey/messaging/components/inbox-pane";
import { InboxRefresh } from "@/leenkey/messaging/components/inbox-refresh";
import { MessagesLayout } from "@/leenkey/messaging/components/messages-layout";
import {
  conversationSubtitle,
  conversationTitle,
  counterpartName,
  coverSrc,
  propertyHref,
  propertyHrefLabel,
} from "@/leenkey/messaging/presentation";
import { getConversation, isUuid, listConversations } from "@/leenkey/messaging/queries";
import { capitalize } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.messaging;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ visite?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = isUuid(id) ? await getConversation(id) : null;
  return {
    title:
      result?.ok && result.data
        ? t.conversationMetaTitle(conversationTitle(result.data))
        : t.metaTitle,
  };
}

// L1-21: a conversation of the account (SPEC-V2 8.6, docs/DESIGN.md 12.9);
// from 1024 px, the list on its left. Not one of theirs: a 404. The text of
// a visit request already in the field with ?visite=1 (« Demander une
// visite », until the visits of L3).
export default async function ConversationPage({ params, searchParams }: Props) {
  const profile = await requireProfile();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [list, thread] = await Promise.all([listConversations(), listThreadMessages(id)]);
  // The error boundary of the group (error.tsx) shows « Ça n'a pas fonctionné. ».
  if (!list.ok || !thread.ok) throw new Error("The conversation could not be read.");
  const conversation = list.data.find((item) => item.id === id);
  if (!conversation) notFound();
  const visit = (await searchParams).visite === "1";
  const now = new Date();

  return (
    <>
      <MessagesLayout
        show="detail"
        list={
          <InboxPane
            result={list}
            roles={profile.roles}
            profileId={profile.id}
            currentId={id}
            titleAs="h2"
            now={now}
          />
        }
      >
        <ConversationView
          key={id}
          conversationId={id}
          viewerId={profile.id}
          counterpart={capitalize(counterpartName(conversation))}
          header={{
            title: conversationTitle(conversation),
            subtitle: conversationSubtitle(conversation),
            thumbSrc: coverSrc(conversation.coverPath),
            href: propertyHref(conversation),
            hrefLabel: propertyHrefLabel(conversation),
          }}
          initialMessages={thread.data}
          unread={conversation.unread}
          closed={conversation.closed}
          initialDraft={visit && !conversation.closed ? t.start.visit : ""}
          now={now.toISOString()}
        />
      </MessagesLayout>
      <InboxRefresh profileId={profile.id} media="(min-width: 1024px)" />
    </>
  );
}
