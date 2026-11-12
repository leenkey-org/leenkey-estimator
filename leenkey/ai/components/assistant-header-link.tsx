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
 * /assistant about the property shown. From 768 px, AssistantFab.
 */
export function AssistantHeaderLink({
  propertyId,
  className,
}: {
  propertyId: string | null;
  className?: string;
}) {
  return (
    <Link
      href={propertyId ? `${ROUTES.assistant}?bien=${propertyId}` : ROUTES.assistant}
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
