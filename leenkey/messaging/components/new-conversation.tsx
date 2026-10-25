"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Composer } from "@/components/shared/composer";
import { ConversationHeader } from "@/components/shared/conversation-header";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import type { SendError } from "@/core/messaging/types";
import { fr } from "@/lib/i18n/fr";
import { MESSAGE_MAX } from "@/lib/validations/messaging";
import { cn } from "@/lib/utils";
import { startConversation } from "../actions";

const t = fr.messaging;

/**
 * The first message of a buyer to the seller of a listing (SPEC-V2 8.6):
 * the header of the conversation to come, what to write, the field. Once
 * sent, the conversation opens in its place.
 */
export function NewConversation({
  listingId,
  listingHref,
  header,
  sellerName,
  initialDraft = "",
}: {
  listingId: string;
  listingHref: string;
  header: { title: string; subtitle: string; thumbSrc: string | null };
  /** « Cédric », « le vendeur ». */
  sellerName: string;
  initialDraft?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<SendError | null>(null);
  const errorId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    let result: Awaited<ReturnType<typeof startConversation>> | null = null;
    try {
      result = await startConversation({ listingId, body: draft });
    } catch (caught) {
      // Network lost, or a page older than the last deployment: the text stays.
      console.error("[messaging] first message not sent", caught);
    }
    if (!result?.ok) {
      setSending(false);
      setError(result ? result.error : "unavailable");
      return;
    }
    // Still sending until the conversation is shown.
    router.replace(`/messages/${result.data.conversationId}`);
  };

  return (
    <>
      {/* A second sticky header: room for it when the focus moves (app/globals.css). */}
      <div data-sticky-subheader="conversation" className="sticky top-0 z-20 md:top-18">
        <ConversationHeader
          back={
            <Link
              href={listingHref}
              aria-label={t.start.back}
              className={cn(
                iconButtonVariants({ variant: "stone" }),
                "inline-flex items-center justify-center",
              )}
            >
              <ChevronLeft aria-hidden="true" />
            </Link>
          }
          thumbSrc={header.thumbSrc}
          title={header.title}
          subtitle={header.subtitle}
          href={listingHref}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <InfoNote className="mx-auto w-full max-w-lk-form">
          <p>{t.start.intro(sellerName)}</p>
        </InfoNote>
      </div>
      <div className="sticky bottom-0 z-20">
        {error ? (
          <div id={errorId} className="border-t border-lk-line bg-lk-surface px-3 pt-2.5">
            <InlineAlert tone="danger">{t.errors[error]}</InlineAlert>
          </div>
        ) : null}
        <Composer
          value={draft}
          onValueChange={setDraft}
          onSend={() => void send()}
          sending={sending}
          label={t.composer.label}
          sendLabel={t.composer.send}
          maxLength={MESSAGE_MAX}
          errorId={error ? errorId : undefined}
          textareaRef={fieldRef}
          className={cn(error && "border-t-0")}
        />
      </div>
    </>
  );
}
