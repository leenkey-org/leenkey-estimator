import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { buyerDocumentsAssistantHref } from "@/leenkey/ai/components/assistant-ask-link";
import { sharedDocumentAnchor } from "@/leenkey/ai/components/assistant-sources";
import { conversationTitle } from "@/leenkey/messaging/presentation";
import { listConversations } from "@/leenkey/messaging/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { BuyerDocumentSummary } from "@/leenkey/sale-file/components/document-analysis";
import { RequestAccessButton } from "@/leenkey/sale-file/components/request-access-button";
import { buyerAccessByProperty, buyerSharedDocuments } from "@/leenkey/sale-file/queries";
import { formatDateShort } from "@/lib/format";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.buyer;

export const metadata: Metadata = { title: t.metaTitle };

const card = "rounded-lk-xl border border-lk-line bg-lk-surface p-4";

// L3-04: the documents sellers shared with the buyer (SPEC-V2 15), grouped
// by property, each opened through a signed URL of 10 minutes; and, for the
// properties the buyer is in contact with and that shared nothing yet, the
// request of access to their documents. L3-05: under a document analysed,
// the summary meant for a buyer, with its permanent mention. L3-07: under
// the documents of a property that has such a summary, « Poser une question
// sur les documents »: the assistant, about the listing when it is online.
export default async function BuyerDocumentsPage() {
  const profile = await requireProfile();
  const [shared, conversations] = await Promise.all([buyerSharedDocuments(), listConversations()]);
  const now = new Date();
  const sharedProperties = new Set(shared.ok ? shared.data.map((group) => group.propertyId) : []);
  // One line per property in contact, the open conversations only.
  const contacts = conversations.ok
    ? conversations.data.filter(
        (conversation, index, all) =>
          conversation.role === "buyer" &&
          conversation.kind === "listing" &&
          !conversation.closed &&
          Boolean(conversation.propertyId) &&
          !sharedProperties.has(conversation.propertyId) &&
          all.findIndex((other) => other.propertyId === conversation.propertyId) === index,
      )
    : [];
  const access = await buyerAccessByProperty(
    contacts.map((conversation) => conversation.propertyId),
    profile.id,
  );

  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.buyer, label: fr.saleFile.buyer.back }}
    >
      <p className="mt-3 text-lk-secondary text-pretty text-lk-ink-2">{t.intro}</p>
      {!shared.ok ? (
        <InlineAlert tone="danger" className="mt-6">
          {t.loadError}
        </InlineAlert>
      ) : shared.data.length === 0 && contacts.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={t.empty.title}
          description={t.empty.text}
          action={
            <Button asChild variant="secondary">
              <Link href={ROUTES.messages}>{t.empty.action}</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {shared.data.map((group) => {
            const heading = [group.listingTitle ?? t.offline, group.city]
              .filter(Boolean)
              .join(" · ");
            return (
              <section key={group.propertyId} aria-label={heading} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="min-w-0 text-lk-body font-semibold text-lk-ink">{heading}</h2>
                  {group.listingSlug ? (
                    <Link
                      href={`${ROUTES.listing}/${group.listingSlug}`}
                      className="text-lk-secondary font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
                    >
                      {t.listing}
                    </Link>
                  ) : null}
                </div>
                <ul className={`${card} flex flex-col divide-y divide-lk-line py-1`}>
                  {group.documents.map((document) => (
                    <li
                      key={document.id}
                      id={sharedDocumentAnchor(document.id)}
                      className="flex scroll-mt-24 flex-col gap-2 py-2"
                    >
                      <div className="flex min-h-13 items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-lk-secondary font-medium text-lk-ink">
                            {document.title}
                          </span>
                          <span className="text-lk-caption text-lk-ink-3 tabular">
                            {fr.saleFile.types[document.type]}
                            {" · "}
                            {fr.saleFile.size(document.sizeBytes)}
                            {" · "}
                            {t.sharedOn(formatDateShort(document.sharedAt, now))}
                          </span>
                        </div>
                        <Button asChild variant="secondary" size="sm" className="shrink-0">
                          <a
                            href={`/documents/vente/${document.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t.openAbout(document.title)}
                          >
                            {t.open}
                          </a>
                        </Button>
                      </div>
                      {document.summary ? (
                        <BuyerDocumentSummary summary={document.summary} />
                      ) : null}
                    </li>
                  ))}
                </ul>
                {group.documents.some((document) => document.summary) ? (
                  <Button asChild variant="secondary" className="self-start">
                    <Link
                      href={buyerDocumentsAssistantHref(group.listingSlug ? group.listingId : null)}
                      aria-label={t.questionAbout(heading)}
                    >
                      <Sparkles aria-hidden="true" className="size-4 shrink-0" />
                      {t.question}
                    </Link>
                  </Button>
                ) : null}
              </section>
            );
          })}

          {contacts.length > 0 ? (
            <section aria-labelledby="documents-ask" className="flex flex-col gap-3">
              <h2 id="documents-ask" className="text-lk-body font-semibold text-lk-ink">
                {t.ask.title}
              </h2>
              <p className="text-lk-secondary text-pretty text-lk-ink-2">{t.ask.intro}</p>
              <ul className="flex flex-col gap-3">
                {contacts.map((conversation) => {
                  const title = conversationTitle(conversation);
                  return (
                    <li key={conversation.propertyId} className={`${card} flex flex-col gap-2.5`}>
                      <p className="text-lk-body font-semibold text-lk-ink">{title}</p>
                      {access.get(conversation.propertyId) === "pending" ? (
                        <p className="text-lk-secondary text-lk-ink-2">{t.ask.pending}</p>
                      ) : access.get(conversation.propertyId) === "declined" ? (
                        <p className="text-lk-secondary text-lk-ink-2">{t.ask.declined}</p>
                      ) : (
                        <RequestAccessButton propertyId={conversation.propertyId} title={title} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </SpacePage>
  );
}
