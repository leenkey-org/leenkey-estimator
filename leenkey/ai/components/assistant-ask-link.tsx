import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

/** The page of the assistant of the buyer, about a listing or about none. */
export function buyerAssistantHref(listingId?: string | null): string {
  return listingId
    ? `${ROUTES.assistant}?annonce=${listingId}`
    : `${ROUTES.assistant}?contexte=acquereur`;
}

/**
 * The same page, to ask about the documents shared with the buyer (L3-07):
 * those of a listing online, or all of them.
 */
export function buyerDocumentsAssistantHref(listingId?: string | null): string {
  return `${buyerAssistantHref(listingId)}&sujet=documents`;
}

/**
 * On the page of a listing, for a buyer signed in (L2-06, SPEC-V2 section
 * 12: « page annonce »): « Une question sur ce bien ? Demander à
 * l'assistant », to the page of the assistant about this listing.
 */
export function AssistantAskLink({
  listingId,
  className,
}: {
  listingId: string;
  className?: string;
}) {
  const t = fr.assistant.buyer;
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-lk-caption text-lk-ink-2",
        className,
      )}
    >
      <Sparkles aria-hidden="true" className="size-4 shrink-0 text-lk-blue" />
      <span>{t.ask}</span>
      <Link
        href={buyerAssistantHref(listingId)}
        className="inline-flex min-h-11 items-center font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
      >
        {t.askAction}
      </Link>
    </p>
  );
}
