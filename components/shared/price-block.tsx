import { formatPrice, formatPricePerSquareMetre } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type PriceBlockProps = {
  /** Price in cents (CLAUDE.md section 9). */
  priceCents: number;
  /** Surface used for the price per m²; the line is left out without it. */
  surfaceM2?: number | null;
  /** md: 26 px (mobile listing); lg: 26 then 30 px (price column). */
  size?: "md" | "lg";
  className?: string;
};

/**
 * Price (docs/DESIGN.md 10.2): wide Archivo, tabular figures; under it, on one
 * line, « 5 147 € / m², sans commission ». Never « Prix ferme ».
 */
export function PriceBlock({ priceCents, surfaceM2, size = "md", className }: PriceBlockProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p
        className={cn(
          "text-lk-price font-bold text-wide tabular text-lk-ink",
          size === "lg" && "lg:text-lk-price-lg",
        )}
      >
        {formatPrice(priceCents)}
      </p>
      {surfaceM2 ? (
        <p className="text-lk-caption tabular text-lk-ink-3">
          {fr.listing.priceBlock.perSquareMetre(formatPricePerSquareMetre(priceCents, surfaceM2))}
        </p>
      ) : null}
    </div>
  );
}
