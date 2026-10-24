import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/core/auth/session";
import { InboxPane } from "@/leenkey/messaging/components/inbox-pane";
import { MessagesLayout } from "@/leenkey/messaging/components/messages-layout";
import { NewConversation } from "@/leenkey/messaging/components/new-conversation";
import { conversationTitle, coverSrc } from "@/leenkey/messaging/presentation";
import {
  contactListing,
  isUuid,
  listConversations,
  ownedPropertyId,
} from "@/leenkey/messaging/queries";
import { sheetHref } from "@/leenkey/properties/sheet";
import { fr } from "@/lib/i18n/fr";

const t = fr.messaging;

export const metadata: Metadata = { title: t.newMetaTitle };

type Props = { searchParams: Promise<{ annonce?: string | string[]; visite?: string | string[] }> };

// L1-21: « Contacter le vendeur » and « Demander une visite » from a listing
// (SPEC-V2 8.5, 8.6). The first message opens the conversation; a buyer who
// already wrote about this listing finds their conversation again, a seller
// their own property. A listing no longer online: a 404.
export default async function NewConversationPage({ searchParams }: Props) {
  const profile = await requireProfile();
  const params = await searchParams;
  const listingId = typeof params.annonce === "string" ? params.annonce : null;
  if (!isUuid(listingId)) notFound();
  const visit = params.visite === "1";

  const [list, listing, ownProperty] = await Promise.all([
    listConversations(),
    contactListing(listingId),
    ownedPropertyId(profile.id, listingId),
  ]);
  if (ownProperty) redirect(sheetHref(ownProperty));
  // The error boundary of the group (error.tsx) shows « Ça n'a pas fonctionné. ».
  if (!list.ok || !listing.ok) throw new Error("The listing could not be read.");
  const existing = list.data.find(
    (conversation) => conversation.role === "buyer" && conversation.listingId === listingId,
  );
  if (existing) redirect(`/messages/${existing.id}${visit ? "?visite=1" : ""}`);
  if (!listing.data) notFound();

  const { slug, type, rooms, city, sellerFirstName, coverPath } = listing.data;
  const sellerName = sellerFirstName ?? t.someone.seller;
  return (
    <MessagesLayout
      show="detail"
      list={
        <InboxPane
          result={list}
          roles={profile.roles}
          profileId={profile.id}
          titleAs="h2"
          now={new Date()}
        />
      }
    >
      <NewConversation
        listingId={listingId}
        listingHref={`/annonce/${slug}`}
        header={{
          title: conversationTitle({ propertyType: type, rooms, city }),
          subtitle: t.thread.with(sellerName),
          thumbSrc: coverSrc(coverPath),
        }}
        sellerName={sellerName}
        initialDraft={visit ? t.start.visit : ""}
      />
    </MessagesLayout>
  );
}
