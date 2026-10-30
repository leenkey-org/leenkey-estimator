import Link from "next/link";
import { FinancingBadge } from "@/components/shared/financing-badge";
import { counterpartName, messagePreview } from "../presentation";
import type { ConversationSummary } from "../types";
import { capitalize, formatMessageTime } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const unread = fr.messaging.list;

/** « TH » for Thomas, « ? » without a first name. */
function initials(name: string): string {
  const letters = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2);
  return letters.toLocaleUpperCase("fr-FR") || "?";
}

/**
 * The last conversations of a space (« Ma vente », docs/DESIGN.md 12.3; the
 * buyer home, 12.10): the initials in a round, the first name and the time,
 * the last message on one line, a blue dot when it is unread; each one
 * opens its conversation. For a seller, the financing status of the buyer
 * (FinancingBadge, L1-25), never an amount: the page says its mention once.
 */
export function RecentConversations({
  conversations,
  now,
}: {
  conversations: readonly ConversationSummary[];
  now: Date;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {conversations.map((conversation) => {
        const name = capitalize(counterpartName(conversation));
        return (
          <li key={conversation.id}>
            <Link
              href={`/messages/${conversation.id}`}
              className="flex items-center gap-3.5 rounded-lk-xl border border-lk-line bg-lk-surface px-4 py-3.5 transition-colors duration-140 ease-out-lk hover:border-lk-blue-border focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-lk-label font-semibold",
                  conversation.unread
                    ? "bg-lk-blue-tint text-lk-blue"
                    : "bg-lk-stone-2 text-lk-ink-2",
                )}
              >
                {initials(conversation.counterpartFirstName ?? "")}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-lk-compact font-semibold text-lk-ink">{name}</span>
                  <span className="shrink-0 text-lk-caption tabular text-lk-ink-3">
                    {formatMessageTime(conversation.lastMessageAt, now)}
                  </span>
                </span>
                <span className="truncate text-lk-label text-lk-ink-2">
                  {messagePreview(conversation)}
                </span>
                {/* On its own line: « Financement non renseigné » would squeeze the name. */}
                {conversation.role === "seller" && conversation.buyerFinancingStatus ? (
                  <FinancingBadge
                    status={conversation.buyerFinancingStatus}
                    className="mt-1 self-start"
                  />
                ) : null}
              </span>
              {conversation.unread ? (
                <span className="size-2.5 shrink-0 rounded-full bg-lk-blue">
                  <span className="sr-only">{unread.unread}</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
