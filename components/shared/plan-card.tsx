import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanCardProps = {
  name: string;
  /** « 990 € » (formatPrice), « Gratuit », or « −14 010 € vs agence ». */
  price: string;
  /** « TTC » after a paid price. */
  priceSuffix?: string;
  /** Under the head line: « Forfait fixe TTC · payé à la souscription ». */
  priceNote?: string;
  /** Short text of the plan (Cédric's texts, SPEC-V2 section 11 bis). */
  tagline?: string;
  /** First line of the list, in bold: « Tout Autonomie, plus : ». */
  featuresIntro?: string;
  /** Checked list of what the plan includes. */
  features?: readonly string[];
  /** After the list: « Le propriétaire continue de gérer sa vente… ». */
  featuresOutro?: string;
  /** Last line: « Sans engagement · sans carte bancaire ». */
  note?: string;
  /** Recommended plan: 2 px blue border and this badge over the top edge. */
  badge?: string;
  /** Full width action at the end. */
  action?: ReactNode;
  /** HTML level of the plan name, set by the page outline. */
  nameAs?: "h2" | "h3" | "h4";
  /**
   * large: the price in display size at the bottom of the card, above the
   * note, as the price cards of the V1 home page (#tarifs, L1-48); else on
   * the head line. A priceNote stays under the name (not used in large).
   */
  priceSize?: "default" | "large";
  className?: string;
};

/**
 * PlanCard (docs/DESIGN.md 10.4): white card, 1.5 px border, radius 6,
 * padding 16, gap 10. Head line: name 16 px 600, price 20 px 700 wide and
 * « TTC » 11 px (large: the price 36 px at the bottom, « TTC » 12 px);
 * tagline 13 px; checked list (Check 16 px blue, 13 px). The
 * recommended plan has a 2 px blue border and a blue badge over the top edge.
 * No shadow.
 */
export function PlanCard({
  name,
  price,
  priceSuffix,
  priceNote,
  tagline,
  featuresIntro,
  features,
  featuresOutro,
  note,
  badge,
  action,
  nameAs: Name = "h3",
  priceSize = "default",
  className,
}: PlanCardProps) {
  const large = priceSize === "large";
  const suffix = priceSuffix ? (
    <span
      className={cn("ml-1 font-medium text-lk-ink-3", large ? "text-lk-caption" : "text-lk-micro")}
    >
      {priceSuffix}
    </span>
  ) : null;
  return (
    <article
      className={cn(
        "relative flex flex-col gap-2.5 rounded-lk-md bg-lk-surface p-4 lg:p-5",
        badge ? "border-2 border-lk-blue" : "border-[1.5px] border-lk-line",
        className,
      )}
    >
      {badge ? (
        <span className="absolute -top-3 left-4 rounded-full bg-lk-blue px-2.5 py-1 text-lk-micro font-semibold text-white">
          {badge}
        </span>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Name className="text-lk-h3 font-semibold text-lk-ink">{name}</Name>
        {large ? null : (
          <p className="whitespace-nowrap text-lk-ink">
            <span className="text-lk-h2 font-bold text-wide tabular-nums">{price}</span>
            {suffix}
          </p>
        )}
      </div>
      {priceNote ? <p className="-mt-1 text-lk-caption text-lk-ink-2">{priceNote}</p> : null}
      {tagline ? <p className="text-lk-secondary text-pretty text-lk-ink-3">{tagline}</p> : null}
      {featuresIntro ? (
        <p className="mt-1 text-lk-secondary font-semibold text-lk-ink">{featuresIntro}</p>
      ) : null}
      {features && features.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-lk-secondary text-lk-ink">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lk-blue" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {featuresOutro ? (
        <p className="text-lk-secondary text-pretty text-lk-ink-2">{featuresOutro}</p>
      ) : null}
      {large ? (
        // At the bottom: the prices of cards side by side stay on one line.
        <div className="mt-auto flex flex-col gap-1 pt-3">
          <p className="whitespace-nowrap text-lk-ink">
            <span className="text-lk-display font-bold text-wide tabular-nums">{price}</span>
            {suffix}
          </p>
          {note ? <p className="text-lk-caption text-lk-ink-2">{note}</p> : null}
        </div>
      ) : note ? (
        <p className="mt-auto pt-1 text-lk-caption text-lk-ink-2">{note}</p>
      ) : null}
      {action ? (
        <div className={cn("flex flex-col pt-2", !note && !large && "mt-auto")}>{action}</div>
      ) : null}
    </article>
  );
}
