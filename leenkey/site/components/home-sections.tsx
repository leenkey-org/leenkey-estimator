import Link from "next/link";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { MoreLink } from "@/components/shared/more-link";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { ContactForm } from "./contact-form";
import { CtaPanel } from "./cta-panel";
import { RichText } from "./rich-text";
import { SellerSpacePreview } from "./seller-space-preview";
import { card, cardText, cardTitle } from "./site-styles";
import { StagePicker } from "./stage-picker";
import { ValueCurve } from "./value-curve";

// Sections of the home page after the hero and the latest listings, in the
// order of the V1 page and with its anchors (#etape, #comment…), rebuilt with
// the Façade components (DECISIONS 2026-10-19). Texts: fr.site.home.

const home = fr.site.home;

/** « Où en êtes-vous dans votre vente ? » (#etape). */
export function StagesSection() {
  return (
    <MarketingSection
      id="etape"
      tone="stone"
      title={home.stages.title}
      accent={home.stages.accent}
      lead={home.stages.lead}
    >
      <StagePicker />
    </MarketingSection>
  );
}

/** « Trois étapes » (#comment): real steps of the sale, « Étape 1 sur 3 ». */
export function StepsSection() {
  const t = home.steps;
  return (
    <MarketingSection id="comment" title={t.title} accent={t.accent} revealContent={false}>
      <ol data-reveal-stagger="" className="grid gap-4 lg:grid-cols-3">
        {t.items.map((step, index) => (
          <li key={step.title} className={cn(card, "flex flex-col gap-2")}>
            <p className="text-lk-caption font-semibold text-lk-blue">
              {t.step(index + 1, t.items.length)}
            </p>
            <h3 className="text-lk-h2 font-bold text-wide text-lk-ink lg:text-lk-h2-lg">
              {step.title}
            </h3>
            <p className={cardText}>{step.text}</p>
            <p className="mt-auto pt-2">
              <span className="rounded-lk-sm bg-lk-stone-2 px-2 py-1 text-lk-micro text-lk-ink-2">
                {step.tag}
              </span>
            </p>
          </li>
        ))}
      </ol>
    </MarketingSection>
  );
}

/**
 * « Ce que vous obtenez en quelques minutes » (#fonctionnalites): the dark
 * section of the V1 page, its curve and its four items (DECISIONS 2026-10-20).
 */
export function FeaturesSection() {
  const t = home.features;
  return (
    <MarketingSection
      id="fonctionnalites"
      tone="navy"
      align="center"
      title={t.title}
      accent={t.accent}
      lead={t.lead}
      revealContent={false}
    >
      <ValueCurve items={t.items} />
      <div data-reveal="" className="mt-10 flex justify-center lg:mt-12">
        <Button asChild size="lg" className="focus-visible:outline-white">
          <Link href={ROUTES.valuation}>{t.action}</Link>
        </Button>
      </div>
    </MarketingSection>
  );
}

/**
 * « Vous savez toujours quoi faire ensuite. » (#espace-vendeur): the dark
 * section of the V1 page and its preview of the seller area, with example
 * data said as such (DECISIONS 2026-10-20).
 */
export function SellerSpaceSection() {
  const t = home.space;
  return (
    <MarketingSection
      id="espace-vendeur"
      tone="navy"
      align="center"
      title={t.title}
      accent={t.accent}
      lead={t.lead}
    >
      <SellerSpacePreview />
    </MarketingSection>
  );
}

/** « Bénéficiez d'un support total… » (#comparatif): three ways to sell. */
export function ComparisonSection() {
  const t = home.comparison;
  return (
    <MarketingSection
      id="comparatif"
      tone="stone"
      title={t.title}
      accent={t.accent}
      lead={t.lead}
      revealContent={false}
    >
      <p data-reveal="" className="text-lk-compact font-semibold text-lk-ink-2">
        {t.example}
      </p>
      <ul data-reveal-stagger="" className="mt-4 grid gap-4 lg:grid-cols-3">
        {t.columns.map((column) => {
          // Leenkey in the blue flat of the moments that count (DESIGN.md 1).
          const leenkey = column.key === "leenkey";
          return (
            <li
              key={column.key}
              className={cn(
                "rounded-lk-md border p-5 lg:p-6",
                leenkey ? "border-lk-blue bg-lk-blue text-white" : "border-lk-line bg-lk-surface",
              )}
            >
              <h3
                className={cn(
                  "text-lk-h2 font-bold text-wide lg:text-lk-h2-lg",
                  leenkey ? "text-white" : "text-lk-ink",
                )}
              >
                {column.name}
              </h3>
              <p
                className={cn(
                  "mt-1 text-lk-secondary",
                  leenkey ? "text-lk-on-blue-2" : "text-lk-ink-3",
                )}
              >
                {column.detail}
              </p>
              <dl className="mt-4">
                {t.rows.map((row, index) => (
                  <div
                    key={row}
                    className={cn(
                      "flex items-baseline justify-between gap-4 border-t py-2.5",
                      leenkey ? "border-white/24" : "border-lk-line",
                    )}
                  >
                    <dt
                      className={cn(
                        "text-lk-secondary",
                        leenkey ? "text-lk-on-blue-2" : "text-lk-ink-3",
                      )}
                    >
                      {row}
                    </dt>
                    <dd
                      className={cn(
                        "text-right text-lk-compact font-semibold tabular-nums",
                        leenkey ? "text-white" : "text-lk-ink",
                      )}
                    >
                      {column.values[index]}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </MarketingSection>
  );
}

/** « Les trois questions essentielles. » (#faq), answers shown. */
export function HomeFaqSection() {
  const t = home.faq;
  return (
    <MarketingSection
      id="faq"
      tone="stone"
      title={t.title}
      accent={t.accent}
      action={
        <MoreLink href={ROUTES.faq} tone="ink">
          {t.all}
        </MoreLink>
      }
      revealContent={false}
    >
      <ul data-reveal-stagger="" className="grid gap-4 lg:grid-cols-3">
        {t.items.map((item) => (
          <li key={item.question} className={card}>
            <h3 className={cardTitle}>{item.question}</h3>
            <p className={cn(cardText, "mt-2")}>
              <RichText parts={item.answer} />
            </p>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

/** « Parlons-en ensemble. » (#contact): the contact form of the site, also /contact. */
export function ContactSection({ titleAs = "h2" }: { titleAs?: "h1" | "h2" }) {
  const t = home.contact;
  return (
    <MarketingSection
      id="contact"
      titleAs={titleAs}
      title={t.title}
      accent={t.accent}
      lead={t.lead}
    >
      <ContactForm source="contact" className="max-w-lk-settings" />
    </MarketingSection>
  );
}

/** Last call to action of the home page. */
export function FinalCta() {
  const t = home.final;
  return (
    <CtaPanel
      title={t.title}
      text={t.text}
      action={t.action}
      href={ROUTES.valuation}
      note={t.note}
    />
  );
}
