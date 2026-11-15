import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

/**
 * The header of the page /assistant (gabarit G6): back to « Ma vente » (to
 * their space or to the listing they came from, for a buyer), the Sparkles
 * and « Assistant Leenkey » (h1), an action on its right. Sticky, 73 px as
 * the header of a conversation (app/globals.css).
 */
export function AssistantPageHeader({
  action,
  back,
}: {
  action?: ReactNode;
  /** Where the arrow leads; « Ma vente » by default. */
  back?: { href: string; label: string };
}) {
  return (
    <header
      data-sticky-subheader="conversation"
      className="sticky top-0 z-20 box-content flex h-18 items-center gap-3 border-b border-lk-line bg-lk-surface px-4 md:top-18"
    >
      <Link
        href={back?.href ?? ROUTES.seller}
        aria-label={back?.label ?? fr.assistant.back}
        className={cn(
          iconButtonVariants({ variant: "stone" }),
          "inline-flex items-center justify-center",
        )}
      >
        <ChevronLeft aria-hidden="true" />
      </Link>
      <Sparkles aria-hidden="true" className="size-5 shrink-0 text-lk-blue" />
      <h1 className="min-w-0 flex-1 truncate text-lk-title font-semibold text-lk-ink">
        {fr.assistant.name}
      </h1>
      {action}
    </header>
  );
}
