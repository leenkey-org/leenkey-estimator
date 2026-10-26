import { CircleCheck } from "lucide-react";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type ContactCardProps = {
  /** First name of the seller only (public_listings). */
  firstName: string | null;
  /** The sale has a Leenkey adviser (paid plan): « Vente accompagnée par Leenkey ». */
  accompanied: boolean;
  /** card: bordered card (mobile listing); tile: stone tile (desktop price column). */
  variant?: "card" | "tile";
  className?: string;
};

/**
 * Seller on the listing (docs/DESIGN.md 10.3, SPEC-V2 8.5): initial in a navy
 * avatar, « Camille, propriétaire », and « Vente accompagnée par Leenkey »
 * for a paid plan only, with its check mark. No response time line until the
 * real median response time exists.
 */
export function ContactCard({
  firstName,
  accompanied,
  variant = "card",
  className,
}: ContactCardProps) {
  const t = fr.listing.contact;
  const name = firstName?.trim();
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        variant === "card"
          ? "rounded-lk-md border border-lk-line px-4 py-3.5"
          : // The light blue of Leenkey rather than stone (« pas de gris », L1-55).
            "rounded-lk-lg bg-lk-blue-tint p-3",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lk-navy text-lk-compact font-semibold text-white"
      >
        {(name?.charAt(0) ?? "?").toLocaleUpperCase("fr-FR")}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={cn(
            "font-semibold text-lk-ink",
            variant === "card" ? "text-lk-compact" : "text-lk-label",
          )}
        >
          {name ? t.owner(name) : t.ownerUnknown}
        </p>
        {accompanied ? (
          <p
            className={cn(
              "text-lk-ink-3",
              variant === "card" ? "text-lk-caption" : "text-lk-micro",
            )}
          >
            {t.accompanied}
          </p>
        ) : null}
      </div>
      {accompanied ? (
        <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-lk-success" />
      ) : null}
    </div>
  );
}
