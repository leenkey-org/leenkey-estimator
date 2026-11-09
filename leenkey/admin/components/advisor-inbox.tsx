import Link from "next/link";
import { Clock } from "lucide-react";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { conversationTitle, coverSrc } from "@/leenkey/messaging/presentation";
import { formatMessageTime, formatWaiting } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { awaitingAnswer, type AdminAdvisorConversation } from "../messages/queries";

const t = fr.adminMessages;

/** « LK-0001 · Appartement 3 p · Savigny-sur-Orge ». */
export function advisorPropertyLine(conversation: AdminAdvisorConversation): string {
  return [conversation.reference, conversationTitle(conversation)].filter(Boolean).join(" · ");
}

/**
 * The shared inbox of the advisor conversations (L1-34, SPEC-V2 17): one
 * line each, the unread first (blue dot, the name in 600), the seller and
 * the property, the plan, the last message; in orange, a seller waiting for
 * an answer for more than 24 h. The list of /admin/messages and, from
 * 1024 px, on the left of an open conversation.
 */
export function AdvisorInbox({
  conversations,
  currentId = null,
  now,
  className,
}: {
  conversations: readonly AdminAdvisorConversation[];
  currentId?: string | null;
  now: Date;
  className?: string;
}) {
  return (
    <ul
      aria-label={t.list}
      className={cn(
        "flex flex-col divide-y divide-lk-line overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface",
        className,
      )}
    >
      {conversations.map((conversation) => {
        const current = conversation.id === currentId;
        const unread = conversation.unread && !current;
        const late = awaitingAnswer(conversation, now);
        const body = conversation.lastMessageBody.replace(/\s+/g, " ").trim();
        return (
          <li key={conversation.id}>
            <Link
              href={`/admin/messages/${conversation.id}`}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors duration-140 ease-out-lk",
                "focus-visible:outline-solid focus-visible:outline-3 focus-visible:-outline-offset-2 focus-visible:outline-lk-brand-blue",
                current ? "bg-lk-blue-tint" : "hover:bg-lk-stone-2",
              )}
            >
              <PropertyThumb src={coverSrc(conversation.coverPath)} className="size-11" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={cn(
                      "truncate text-lk-compact text-lk-ink",
                      unread ? "font-bold" : "font-semibold",
                    )}
                  >
                    {conversation.sellerName ?? t.noName}
                  </p>
                  <time
                    dateTime={conversation.lastMessageAt}
                    className="shrink-0 text-lk-micro text-lk-ink-3 tabular"
                  >
                    {formatMessageTime(conversation.lastMessageAt, now)}
                  </time>
                </div>
                <p className="truncate text-lk-caption text-lk-ink-3">
                  {advisorPropertyLine(conversation)}
                </p>
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate text-lk-secondary",
                      unread ? "font-semibold text-lk-ink" : "text-lk-ink-2",
                    )}
                  >
                    {conversation.lastFromSeller ? body : t.mine(body)}
                  </p>
                  {unread ? (
                    <span className="size-2.5 shrink-0 rounded-full bg-lk-blue">
                      <span className="sr-only">{t.unread}</span>
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {conversation.closed ? (
                    <span className="text-lk-caption text-lk-ink-3">{t.closed}</span>
                  ) : (
                    <StatusBadge plan={conversation.plan} />
                  )}
                  {late ? (
                    <span className="inline-flex items-center gap-1 text-lk-caption font-semibold text-lk-warning">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {t.late(formatWaiting(conversation.lastMessageAt, now))}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
