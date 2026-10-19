import Link from "next/link";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { QueryResult } from "../queries";
import type { ConversationSummary } from "../types";
import { ConversationList } from "./conversation-list";

const t = fr.messaging;

/**
 * The list of the conversations with its title: the page /messages on a
 * phone (H1, the bell on its right as on the other pages of the spaces), the
 * left pane of the messaging from 1024 px.
 */
export function InboxPane({
  result,
  roles,
  currentId = null,
  titleAs: Title,
  now,
  className,
}: {
  result: QueryResult<ConversationSummary[]>;
  roles: readonly string[];
  currentId?: string | null;
  /** h1 on /messages, h2 next to an open conversation. */
  titleAs: "h1" | "h2";
  now: Date;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lk-settings px-5 py-8 md:px-10 md:py-10 lg:px-4 lg:py-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Title className="min-w-0 text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h2-lg">
          {t.title}
        </Title>
        {Title === "h1" ? <SpaceNotificationBell roles={roles} className="md:hidden" /> : null}
      </div>
      <nav aria-label={t.list.label} className="mt-6 lg:mt-5">
        {!result.ok ? (
          <InlineAlert tone="danger">{t.list.error}</InlineAlert>
        ) : result.data.length === 0 ? (
          // Next to the first message of a buyer: the list to come.
          <p className="text-lk-secondary text-lk-ink-2">{t.list.empty.title}</p>
        ) : (
          <ConversationList
            conversations={result.data}
            currentId={currentId}
            headingLevel={Title === "h1" ? "h2" : "h3"}
            now={now}
          />
        )}
      </nav>
    </div>
  );
}

/**
 * No conversation yet (docs/DESIGN.md 10.8): what will appear here, and for
 * a buyer the way to the listings.
 */
export function InboxEmpty({ roles, className }: { roles: readonly string[]; className?: string }) {
  const seller = roles.includes("seller") && !roles.includes("buyer");
  return (
    <EmptyState
      className={className}
      title={t.list.empty.title}
      description={seller ? t.list.empty.seller : t.list.empty.buyer}
      action={
        seller ? undefined : (
          <Button asChild>
            <Link href={ROUTES.search}>{t.list.empty.action}</Link>
          </Button>
        )
      }
    />
  );
}
