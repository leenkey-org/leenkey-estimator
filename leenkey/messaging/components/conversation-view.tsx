"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Composer } from "@/components/shared/composer";
import { ConversationHeader } from "@/components/shared/conversation-header";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { MessageBubble, MessageDate, SystemMessage } from "@/components/shared/message-bubble";
import { markConversationRead, sendMessage } from "@/core/messaging/actions";
import { useThreadMessages } from "@/core/messaging/realtime";
import { threadItems } from "@/core/messaging/thread";
import { mergeMessages, type SendError, type ThreadMessage } from "@/core/messaging/types";
import { NBSP, formatClock } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { MESSAGE_MAX } from "@/lib/validations/messaging";
import { cn } from "@/lib/utils";
import { ConversationMenu } from "./conversation-menu";

const t = fr.messaging;

/** Distance to the end under which the reader is still « at the end » of the thread. */
const END_MARGIN = 160;

export type ConversationViewProps = {
  conversationId: string;
  viewerId: string;
  /** « Thomas », « L'acquéreur »: the author of the messages received. */
  counterpart: string;
  header: { title: string; subtitle: string; thumbSrc: string | null; href: string | null };
  initialMessages: ThreadMessage[];
  /** Unread when the page was read: marked read on opening. */
  unread: boolean;
  closed: boolean;
  /** The text already in the field (`visite=1`). */
  initialDraft?: string;
  /** Time of the server render, for the days of the thread. */
  now: string;
};

/**
 * An open conversation (docs/DESIGN.md 12.9, G6): ConversationHeader, the
 * thread on --lk-bg (padding 16, gap 12), the Composer. Live (Realtime),
 * read up to the last message on opening and as messages come in while the
 * page is shown. The page scrolls: the header and the field stay in view.
 */
export function ConversationView({
  conversationId,
  viewerId,
  counterpart,
  header,
  initialMessages,
  unread,
  closed,
  initialDraft = "",
  now,
}: ConversationViewProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<SendError | null>(null);
  const [isClosed, setIsClosed] = useState(closed);
  const [reported, setReported] = useState(false);
  const errorId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const atEnd = useRef(true);
  const readPending = useRef(false);
  const readTimer = useRef<number | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Messages are never edited: the same count means the same thread.
  const addMessages = useCallback((incoming: readonly ThreadMessage[]) => {
    setMessages((current) => {
      const next = mergeMessages(current, incoming);
      return next.length === current.length ? current : next;
    });
  }, []);

  // A new read of the page (router.refresh) brings the messages again.
  useEffect(() => addMessages(initialMessages), [initialMessages, addMessages]);

  useEffect(() => setIsClosed(closed), [closed]);

  const markRead = useCallback(() => {
    if (readTimer.current !== null) return;
    readTimer.current = window.setTimeout(() => {
      readTimer.current = null;
      readPending.current = false;
      void markConversationRead(conversationId);
    }, 500);
  }, [conversationId]);

  useEffect(() => {
    if (unread) markRead();
  }, [unread, markRead]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && readPending.current) markRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      // Left before the read mark went: it goes now.
      if (readTimer.current !== null) {
        window.clearTimeout(readTimer.current);
        readTimer.current = null;
        void markConversationRead(conversationId);
      }
    };
  }, [markRead, conversationId]);

  useThreadMessages(
    conversationId,
    () => messagesRef.current.at(-1)?.createdAt ?? null,
    (incoming) => {
      const known = new Set(messagesRef.current.map((message) => message.id));
      const received = incoming.some(
        (message) => !known.has(message.id) && message.senderId !== viewerId,
      );
      addMessages(incoming);
      if (!received) return;
      readPending.current = true;
      if (document.visibilityState === "visible") markRead();
    },
  );

  // At the end of the thread on opening; then a new message keeps the reader
  // at the end, unless they scrolled up to read.
  const scrollToEnd = useCallback(() => endRef.current?.scrollIntoView({ block: "end" }), []);
  useLayoutEffect(() => {
    if (atEnd.current) scrollToEnd();
  }, [messages, scrollToEnd]);
  useEffect(() => {
    const measure = () => {
      const end = endRef.current;
      if (end) atEnd.current = end.getBoundingClientRect().top - window.innerHeight < END_MARGIN;
    };
    // The keyboard of a phone shrinks the page (interactive-widget): stay at the end.
    const onResize = () => {
      if (atEnd.current) scrollToEnd();
    };
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", onResize);
    };
  }, [scrollToEnd]);

  const send = async () => {
    setSending(true);
    setError(null);
    const result = await sendMessage({ conversationId, body: draft });
    setSending(false);
    if (!result.ok) {
      if (result.error === "closed") setIsClosed(true);
      else setError(result.error);
      return;
    }
    atEnd.current = true;
    setDraft("");
    addMessages([result.data]);
    fieldRef.current?.focus();
  };

  const backClass = cn(
    iconButtonVariants({ variant: "stone" }),
    "inline-flex items-center justify-center lg:hidden",
  );

  return (
    <>
      <div className="sticky top-0 z-20 md:top-18">
        <ConversationHeader
          back={
            <Link href="/messages" aria-label={t.thread.back} className={backClass}>
              <ChevronLeft aria-hidden="true" />
            </Link>
          }
          thumbSrc={header.thumbSrc}
          title={header.title}
          subtitle={header.subtitle}
          href={header.href}
          menu={
            <ConversationMenu
              conversationId={conversationId}
              onReported={() => setReported(true)}
            />
          }
        />
        {reported ? (
          <div className="border-b border-lk-line bg-lk-surface px-4 py-2.5">
            <InlineAlert tone="success">{t.thread.reported}</InlineAlert>
          </div>
        ) : null}
      </div>

      <div role="log" aria-label={t.thread.label} className="flex flex-1 flex-col gap-3 p-4">
        {threadItems(messages, now).map((item) => {
          if (item.kind === "date") return <MessageDate key={item.key}>{item.label}</MessageDate>;
          const { message } = item;
          if (message.kind !== "text") {
            return <SystemMessage key={item.key}>{message.body}</SystemMessage>;
          }
          const mine = message.senderId === viewerId;
          return (
            <MessageBubble
              key={item.key}
              mine={mine}
              meta={`${mine ? t.thread.you : counterpart}${NBSP}· ${formatClock(message.createdAt)}`}
            >
              {message.body}
            </MessageBubble>
          );
        })}
      </div>

      <div className="sticky bottom-0 z-20">
        {isClosed ? (
          <div className="border-t border-lk-line bg-lk-surface px-3 pt-2.5 pb-[max(1.375rem,env(safe-area-inset-bottom))]">
            <InlineAlert tone="info">{t.thread.closed}</InlineAlert>
          </div>
        ) : (
          <>
            {error ? (
              <div id={errorId} className="border-t border-lk-line bg-lk-surface px-3 pt-2.5">
                <InlineAlert tone="danger">{t.errors[error]}</InlineAlert>
              </div>
            ) : null}
            <Composer
              value={draft}
              onValueChange={(value) => {
                setDraft(value);
                if (error === "empty" || error === "tooLong") setError(null);
              }}
              onSend={() => void send()}
              sending={sending}
              label={t.composer.label}
              sendLabel={t.composer.send}
              maxLength={MESSAGE_MAX}
              errorId={error ? errorId : undefined}
              textareaRef={fieldRef}
              className={cn(error && "border-t-0")}
            />
          </>
        )}
      </div>
      <div ref={endRef} aria-hidden="true" />
    </>
  );
}
