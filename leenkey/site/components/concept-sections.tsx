import Link from "next/link";
import { Check } from "lucide-react";
import { BrandPanel } from "@/components/shared/brand-panel";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { CtaPanel } from "./cta-panel";
import { RichText } from "./rich-text";
import { card, cardText, cardTitle, statement } from "./site-styles";

// Sections of /concept (L1-42), in the order of the V1 page, rebuilt with the
// Façade components (DECISIONS 2026-10-19). Texts: fr.site.concept.

const t = fr.site.concept;

/** « Combien vaut vraiment votre bien ? » */
export function ConceptHero() {
  return (
    <BrandPanel
      title={t.hero.title}
      titleAccent={t.hero.accent}
      description={t.hero.lead}
      titleSize="hero"
      illustration
    >
      <Button asChild variant="inverse" size="lg">
        <Link href={ROUTES.valuation}>{t.hero.action}</Link>
      </Button>
    </BrandPanel>
  );
}

/** The agency, or alone without a tool; then the one question that counts. */
export function OptionsSection() {
  const [agency, alone] = t.options.items;
  return (
    <MarketingSection id="idee" title={t.options.title} lead={t.options.lead}>
      <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
        {[agency, alone].map((option, index) => (
          <div key={option.title} className="contents">
            {index === 1 ? (
              <p className="text-center text-lk-h3 font-semibold text-lk-ink-3">{t.options.or}</p>
            ) : null}
            <div className={card}>
              <h3 className={cardTitle}>{option.title}</h3>
              <p className={cn(cardText, "mt-2")}>{option.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 flex max-w-lk-prose flex-col gap-3">
        <p className={statement}>
          <RichText parts={t.options.question} strongClassName="text-lk-blue" />
        </p>
        <p className={cardText}>{t.options.answer}</p>
      </div>
    </MarketingSection>
  );
}

/** « L'outil de valorisation. »: what was studied, taken into account, produced. */
export function ToolSection() {
  return (
    <MarketingSection id="outil" tone="stone" title={t.tool.title} lead={t.tool.lead}>
      <ul className="grid gap-4 md:grid-cols-2">
        {t.tool.items.map((item) => (
          <li key={item.title} className={cn(card, "flex flex-col gap-2")}>
            <p className="text-lk-caption font-semibold text-lk-blue">{item.label}</p>
            <h3 className={cardTitle}>{item.title}</h3>
            {"list" in item ? (
              <ul className="flex flex-col gap-2">
                {item.list.map((line) => (
                  <li key={line} className="flex gap-2 text-lk-compact text-lk-ink-2">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lk-blue" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cardText}>{item.text}</p>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-10 flex max-w-lk-prose flex-col gap-2">
        <p className={statement}>
          <RichText parts={t.tool.quote} strongClassName="text-lk-ink" />
        </p>
        <p className={cardText}>{t.tool.after}</p>
      </div>
    </MarketingSection>
  );
}

/** « La valorisation est le déclencheur. »: what the platform opens. */
export function NextSection() {
  return (
    <MarketingSection id="ensuite" title={t.next.title} lead={t.next.lead}>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {t.next.items.map((item) => (
          <li key={item.title} className={card}>
            <h3 className={cardTitle}>{item.title}</h3>
            <p className={cn(cardText, "mt-2")}>{item.text}</p>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

/** « Commencez par la bonne question. » */
export function ConceptCta() {
  return (
    <CtaPanel
      title={t.final.title}
      text={t.final.text}
      action={t.final.action}
      href={ROUTES.valuation}
      note={t.final.note}
    />
  );
}
