import Link from "next/link";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { SectionTitle } from "@/components/shared/section-title";
import { capitalize, formatMessageTime } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import {
  conversationTitle,
  counterpartName,
  coverSrc,
  groupConversations,
  messagePreview,
} from "../presentation";
import type { ConversationSummary } from "../types";

const t = fr.messaging.list;

/**
 * The conversations of the account (SPEC-V2 8.6): one line each, with the
 * thumbnail of the property, the other party, the time and the last message,
 * a blue dot when it is unread; grouped by property for a seller of several
 * properties (presentation.ts).
 */
export function ConversationList({
  conversations,
  currentId = null,
  headingLevel,
  now,
}: {
  conversations: readonly ConversationSummary[];
  /** The open conversation: marked, never shown unread (it is being read). */
  currentId?: string | null;
  headingLevel: "h2" | "h3";
  now: Date;
}) {
  return (
    <div className="flex flex-col gap-6">
      {groupConversations(conversations).map((group) => {
        const headingId = `conversations-${group.key}`;
        const lines = (
          <ul className="flex flex-col divide-y divide-lk-line overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface">
            {group.conversations.map((conversation) => (
              <ConversationLine
                key={conversation.id}
                conversation={conversation}
                current={conversation.id === currentId}
                showProperty={group.showProperty}
                now={now}
              />
            ))}
          </ul>
        );
        return group.title ? (
          <section key={group.key} aria-labelledby={headingId} className="flex flex-col gap-3">
            <SectionTitle as={headingLevel} id={headingId}>
              {group.title}
            </SectionTitle>
            {lines}
          </section>
        ) : (
          <div key={group.key}>{lines}</div>
        );
      })}
    </div>
  );
}

function ConversationLine({
  conversation,
  current,
  showProperty,
  now,
}: {
  conversation: ConversationSummary;
  current: boolean;
  showProperty: boolean;
  now: Date;
}) {
  const unread = conversation.unread && !current;
  return (
    <li>
      <Link
        href={`/messages/${conversation.id}`}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex items-start gap-3 px-4 py-3 transition-colors duration-140 ease-out-lk",
          // Inside the line: the card clips what goes beyond it.
          "focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lk-blue",
          current ? "bg-lk-blue-tint" : "hover:bg-lk-stone-2",
        )}
      >
        <PropertyThumb src={coverSrc(conversation.coverPath)} className="size-11" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-lk-compact font-semibold text-lk-ink">
              {capitalize(counterpartName(conversation))}
            </p>
            <time
              dateTime={conversation.lastMessageAt}
              className="shrink-0 text-lk-micro text-lk-ink-3 tabular"
            >
              {formatMessageTime(conversation.lastMessageAt, now)}
            </time>
          </div>
          {showProperty ? (
            <p className="truncate text-lk-caption text-lk-ink-3">
              {conversationTitle(conversation)}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-lk-secondary",
                unread ? "font-semibold text-lk-ink" : "text-lk-ink-2",
              )}
            >
              {messagePreview(conversation)}
            </p>
            {unread ? (
              <span className="size-2.5 shrink-0 rounded-full bg-lk-blue">
                <span className="sr-only">{t.unread}</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}
