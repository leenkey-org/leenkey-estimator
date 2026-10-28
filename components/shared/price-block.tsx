import { formatPrice, formatPricePerSquareMetre } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type PriceBlockProps = {
  /** Price in cents (CLAUDE.md section 9). */
  priceCents: number;
  /** Surface used for the price per m²; the line is left out without it. */
  surfaceM2?: number | null;
  /** sm: 18 px (the mobile action bar, L1-60); md: 26 px; lg: 26 then 30 px (price column). */
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Price (docs/DESIGN.md 10.2): Sora, tabular figures; under it, on one
 * line, « 5 147 € / m², sans commission ». Never « Prix ferme ».
 */
export function PriceBlock({ priceCents, surfaceM2, size = "md", className }: PriceBlockProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p
        className={cn(
          "font-bold text-wide tabular text-lk-ink",
          size === "sm" ? "text-lk-card-price" : "text-lk-price",
          size === "lg" && "lg:text-lk-price-lg",
        )}
      >
        {formatPrice(priceCents)}
      </p>
      {surfaceM2 ? (
        <p className="text-lk-caption tabular text-lk-ink-3">
          {size === "sm"
            ? // The mobile bar: one line (« sans commission » is a strong point above).
              formatPricePerSquareMetre(priceCents, surfaceM2)
            : fr.listing.priceBlock.perSquareMetre(
                formatPricePerSquareMetre(priceCents, surfaceM2),
              )}
        </p>
      ) : null}
    </div>
  );
}
