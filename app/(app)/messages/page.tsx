import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import { requireProfile } from "@/core/auth/session";
import { InboxEmpty, InboxPane } from "@/leenkey/messaging/components/inbox-pane";
import { InboxRefresh } from "@/leenkey/messaging/components/inbox-refresh";
import { MessagesLayout } from "@/leenkey/messaging/components/messages-layout";
import { listConversations } from "@/leenkey/messaging/queries";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../_components/space-page";

const t = fr.messaging;

export const metadata: Metadata = { title: t.metaTitle };

// L1-21: the conversations of the account (SPEC-V2 8.6), reached from the
// bottom tabs; from 1024 px, next to the place of the open conversation
// (G6). Kept up to date while it is shown (Realtime).
export default async function MessagesPage() {
  const profile = await requireProfile();
  const result = await listConversations();
  const now = new Date();

  if (result.ok && result.data.length === 0) {
    return (
      <SpacePage title={t.title} roles={profile.roles}>
        <InboxEmpty className="mt-12" roles={profile.roles} />
        <InboxRefresh profileId={profile.id} />
      </SpacePage>
    );
  }
  return (
    <>
      <MessagesLayout
        show="list"
        list={<InboxPane result={result} roles={profile.roles} titleAs="h1" now={now} />}
      >
        <EmptyState
          className="m-auto px-5 py-10"
          title={t.list.choose.title}
          description={t.list.choose.text}
        />
      </MessagesLayout>
      <InboxRefresh profileId={profile.id} />
    </>
  );
}
