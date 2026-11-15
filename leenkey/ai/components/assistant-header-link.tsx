import Link from "next/link";
import { Sparkles } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

/**
 * The assistant in the header of « Ma vente » on a phone (DESIGN.md 10.4,
 * Q26: beside the bell): an IconButton on-dark, Sparkles, to the page
 * /assistant about the property shown. From 768 px, AssistantFab. The same
 * on the home of a buyer (L2-06), to their own assistant (`href`).
 */
export function AssistantHeaderLink({
  propertyId = null,
  href,
  className,
}: {
  propertyId?: string | null;
  /** The page of the assistant, when it is not the one of the seller. */
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href ?? (propertyId ? `${ROUTES.assistant}?bien=${propertyId}` : ROUTES.assistant)}
      aria-label={fr.assistant.open}
      className={cn(
        iconButtonVariants({ variant: "on-dark" }),
        "inline-flex items-center justify-center focus-visible:outline-white",
        className,
      )}
    >
      <Sparkles aria-hidden="true" />
    </Link>
  );
}
