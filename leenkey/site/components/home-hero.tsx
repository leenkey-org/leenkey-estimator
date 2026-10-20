import Link from "next/link";
import { Check } from "lucide-react";
import { BrandPanel } from "@/components/shared/brand-panel";
import { Button } from "@/components/shared/button";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.home.hero;

/**
 * Hero of the home page (SPEC-V2 8.1, docs/DESIGN.md 13.1): BrandPanel blue
 * with facade.svg on the right, display title, and two equal entries in
 * white, « Je vends » (inverse) and « J'achète » (white outline), then the
 * three promises of the V1 hero. Anchor #valoriser kept from the V1.
 */
export function HomeHero() {
  return (
    <BrandPanel
      id="valoriser"
      title={t.title}
      titleAccent={t.accent}
      description={t.lead}
      titleSize="hero"
      illustration
    >
      <div
        role="group"
        aria-label={t.entries}
        className="grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(2,11rem)]"
      >
        <Button asChild variant="inverse" size="lg">
          <Link href={ROUTES.valuation}>{t.sell}</Link>
        </Button>
        <Button asChild variant="outline-inverse" size="lg">
          <Link href={ROUTES.search}>{t.buy}</Link>
        </Button>
      </div>
      <ul className="mt-7 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-x-6">
        {t.points.map((point) => (
          <li key={point} className="flex items-center gap-2 text-lk-compact text-lk-on-blue-2">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            {point}
          </li>
        ))}
      </ul>
    </BrandPanel>
  );
}
