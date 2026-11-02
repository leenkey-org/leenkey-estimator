import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * The header of the page /assistant (gabarit G6): back to « Ma vente », the
 * Sparkles and « Assistant Leenkey » (h1), an action on its right. Sticky,
 * 73 px as the header of a conversation (app/globals.css).
 */
export function AssistantPageHeader({ action }: { action?: ReactNode }) {
  return (
    <header
      data-sticky-subheader="conversation"
      className="sticky top-0 z-20 box-content flex h-18 items-center gap-3 border-b border-lk-line bg-lk-surface px-4 md:top-18"
    >
      <Link
        href={ROUTES.seller}
        aria-label={fr.assistant.back}
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
