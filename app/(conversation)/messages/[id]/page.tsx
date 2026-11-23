import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/core/auth/session";
import { listThreadMessages } from "@/core/messaging/queries";
import { canRequestIntervention, interventionsHref } from "@/leenkey/advisor/interventions";
import { propertyInterventions } from "@/leenkey/advisor/queries";
import { ConversationView } from "@/leenkey/messaging/components/conversation-view";
import { InboxPane } from "@/leenkey/messaging/components/inbox-pane";
import { InboxRefresh } from "@/leenkey/messaging/components/inbox-refresh";
import { MessagesLayout } from "@/leenkey/messaging/components/messages-layout";
import {
  conversationHeading,
  conversationTitle,
  counterpartName,
  coverSrc,
  propertyHref,
  propertyHrefLabel,
} from "@/leenkey/messaging/presentation";
import {
  getConversation,
  isUuid,
  listConversations,
  threadSenders,
} from "@/leenkey/messaging/queries";
import { sheetHref } from "@/leenkey/properties/sheet";
import { invitationLink } from "@/leenkey/visits/queries";
import { capitalize } from "@/lib/format";
import { frAdvisorInterventions } from "@/lib/i18n/sections/advisorInterventions";
import { frMessaging } from "@/lib/i18n/sections/messaging";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { advisorInterventions: frAdvisorInterventions, messaging: frMessaging } as const;

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
        ? t.conversationMetaTitle(
            result.data.kind === "advisor" ? t.advisor.name : conversationTitle(result.data),
          )
        : t.metaTitle,
  };
}

// L1-21: a conversation of the account (SPEC-V2 8.6, docs/DESIGN.md 12.9);
// from 1024 px, the list on its left. Not one of theirs: a 404. The text of
// a visit request already in the field with ?visite=1 (« Demander une
// visite », until the visits of L3). The adviser (L1-34): « LK », the
// plan, the admins by their first name, no report, closed without the right.
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
  // L1-34: with the adviser, the first names of the admins who answered.
  const advisor = conversation.kind === "advisor";
  const names = advisor ? await threadSenders(id) : {};
  const heading = conversationHeading(conversation, now);
  // The interventions the plan sells (DECISIONS.md 2026-11-23): their counter
  // and the way to ask for one, above the field; unread: the conversation without them.
  const interventions =
    advisor && !conversation.closed ? await propertyInterventions(conversation.propertyId) : null;
  const counter = interventions?.ok ? interventions.data : null;
  // Visits (L3-02): the seller invites from the field; the buyer books from the notice.
  const seller = conversation.role === "seller";
  const visits =
    advisor || !conversation.propertyId
      ? undefined
      : {
          invite: seller && !conversation.closed,
          bookHref: seller ? null : await invitationLink(conversation.propertyId, profile.id),
          manageHref: seller ? sheetHref(conversation.propertyId, "visites") : null,
        };

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
            ...heading,
            thumbSrc: coverSrc(conversation.coverPath),
            href: propertyHref(conversation),
            hrefLabel: propertyHrefLabel(conversation),
            advisor,
          }}
          advisor={advisor ? { sellerId: profile.id, names } : null}
          closedText={advisor ? t.advisor.closed : undefined}
          report={!advisor}
          initialMessages={thread.data}
          financing={conversation.role === "seller" ? conversation.buyerFinancingStatus : null}
          unread={conversation.unread}
          closed={conversation.closed}
          initialDraft={visit && !conversation.closed && !advisor ? t.start.visit : ""}
          suggestions={conversation.role === "seller" && !advisor}
          visits={visits}
          note={
            counter ? (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-lk-caption text-lk-ink-3">
                <span className="tabular">
                  {fr.advisorInterventions.counter(counter.used, counter.quota)}
                </span>
                <Link
                  href={interventionsHref(conversation.propertyId)}
                  className="font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
                >
                  {canRequestIntervention(counter)
                    ? fr.advisorInterventions.entry.request
                    : fr.advisorInterventions.entry.view}
                </Link>
              </p>
            ) : undefined
          }
          now={now.toISOString()}
        />
      </MessagesLayout>
      <InboxRefresh profileId={profile.id} media="(min-width: 1024px)" />
    </>
  );
}
