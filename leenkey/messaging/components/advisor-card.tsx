import Link from "next/link";
import { Lock } from "lucide-react";
import { AdvisorAvatar } from "@/components/shared/advisor-avatar";
import { Button } from "@/components/shared/button";
import { formatMessageTime } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { messagePreview } from "../presentation";
import type { ConversationSummary } from "../types";

const t = fr.messaging.advisor;

const cardClass = "flex flex-col gap-3 rounded-lk-xl border border-lk-line bg-lk-surface p-4";

/**
 * The adviser on the dashboard of a sale (SPEC-V2 8.7, L1-34): « LK », the
 * last message of the conversation and « Écrire à mon conseiller ». Without
 * the right (Autonomie, SPEC 8.6), the same card greyed (decision of
 * 2026-11-11): the adviser is there, « Accessible avec la formule
 * Accompagné », with the way to the plans; never a step of the sale held
 * back, never a disabled button (the text stays readable).
 */
export function AdvisorCard({
  conversation,
  plansHref,
  now,
}: {
  /** The open conversation with the adviser; null: the plan has no adviser. */
  conversation: ConversationSummary | null;
  plansHref: string;
  now: Date;
}) {
  if (!conversation) {
    return (
      <section aria-labelledby="conseiller" className={cn(cardClass, "bg-lk-stone-2")}>
        <div className="flex items-start gap-3">
          <AdvisorAvatar label={t.avatar} className="bg-lk-line text-lk-ink-3" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="conseiller" className="text-lk-compact font-semibold text-lk-ink-3">
              {t.name}
            </h2>
            <p className="flex items-center gap-1.5 text-lk-caption font-semibold text-lk-ink-3">
              <Lock aria-hidden="true" className="size-3.5 shrink-0" />
              {t.invite.locked}
            </p>
            <p className="text-lk-label text-lk-ink-3">{t.invite.text}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button asChild variant="secondary">
            <Link href={plansHref}>{t.invite.action}</Link>
          </Button>
          <span className="flex items-center gap-1.5 text-lk-label text-lk-ink-3">
            <Lock aria-hidden="true" className="size-3.5 shrink-0" />
            {t.write}
          </span>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="conseiller" className={cardClass}>
      <div className="flex items-start gap-3">
        <AdvisorAvatar label={t.avatar} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="conseiller" className="truncate text-lk-compact font-semibold text-lk-ink">
              {t.name}
            </h2>
            <time
              dateTime={conversation.lastMessageAt}
              className="shrink-0 text-lk-caption tabular text-lk-ink-3"
            >
              {formatMessageTime(conversation.lastMessageAt, now)}
            </time>
          </div>
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-lk-label",
                conversation.unread ? "font-semibold text-lk-ink" : "text-lk-ink-2",
              )}
            >
              {messagePreview(conversation)}
            </p>
            {conversation.unread ? (
              <span className="size-2.5 shrink-0 rounded-full bg-lk-blue">
                <span className="sr-only">{fr.messaging.list.unread}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <Button asChild variant="secondary" className="md:self-start">
        <Link href={`/messages/${conversation.id}`}>{t.write}</Link>
      </Button>
    </section>
  );
}
