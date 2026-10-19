import Link from "next/link";
import { Calendar, Check } from "lucide-react";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { MoreLink } from "@/components/shared/more-link";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { ContactForm } from "./contact-form";
import { CtaPanel } from "./cta-panel";
import { RichText } from "./rich-text";
import { StagePicker } from "./stage-picker";

// Sections of the home page after the hero and the latest listings, in the
// order of the V1 page and with its anchors (#etape, #comment…), rebuilt with
// the Façade components (DECISIONS 2026-10-19). Texts: fr.site.home.

const home = fr.site.home;
const card = "rounded-lk-md border border-lk-line bg-lk-surface p-5 lg:p-6";
const cardTitle = "text-lk-h3 font-semibold text-lk-ink lg:text-lk-h3-lg";
const cardText = "text-lk-body text-pretty text-lk-ink-2";

/** « Où en êtes-vous dans votre vente ? » (#etape). */
export function StagesSection() {
  return (
    <MarketingSection id="etape" tone="stone" title={home.stages.title} lead={home.stages.lead}>
      <StagePicker />
    </MarketingSection>
  );
}

/** « Trois étapes » (#comment): real steps of the sale, « Étape 1 sur 3 ». */
export function StepsSection() {
  const t = home.steps;
  return (
    <MarketingSection id="comment" title={t.title}>
      <ol className="grid gap-4 lg:grid-cols-3">
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

/** « Ce que vous obtenez en quelques minutes » (#fonctionnalites). */
export function FeaturesSection() {
  const t = home.features;
  return (
    <MarketingSection id="fonctionnalites" tone="stone" title={t.title} lead={t.lead}>
      <ul className="grid gap-4 md:grid-cols-2">
        {t.items.map((feature) => (
          <li key={feature.title} className={card}>
            <h3 className={cardTitle}>{feature.title}</h3>
            <p className={cn(cardText, "mt-2")}>{feature.text}</p>
          </li>
        ))}
      </ul>
      <Button asChild size="lg" className="mt-8">
        <Link href={ROUTES.valuation}>{t.action}</Link>
      </Button>
    </MarketingSection>
  );
}

const STEP_STATE = {
  done: "border-lk-success bg-lk-success text-white",
  current: "border-lk-blue bg-lk-surface",
  todo: "border-lk-line bg-lk-surface",
} as const;

/**
 * « Vous savez toujours quoi faire ensuite. »: a still preview of the seller
 * area, with the NextActionCard and the TaskList of DESIGN.md 10.4, without
 * example figures (DECISIONS 2026-10-19).
 */
export function SellerSpaceSection() {
  const t = home.space;
  return (
    <MarketingSection id="espace-vendeur" title={t.title} lead={t.lead}>
      <figure className="flex flex-col gap-3">
        <div className="grid gap-6 rounded-lk-md border border-lk-line bg-lk-bg p-4 md:p-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-lk-caption font-semibold text-lk-blue">{t.next.label}</p>
            <div className="flex gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue">
                <Calendar aria-hidden="true" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-lk-title font-semibold text-lk-ink">{t.next.title}</p>
                <p className="text-lk-secondary text-lk-ink-3">{t.next.text}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lk-h3 font-semibold text-lk-ink">{t.journey}</h3>
            <ol className="rounded-lk-md border border-lk-line bg-lk-surface">
              {t.steps.map((step) => (
                <li
                  key={step.title}
                  className="flex items-start gap-3 border-b border-lk-line p-3.5 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-px flex size-5.5 shrink-0 items-center justify-center rounded-full border-2",
                      STEP_STATE[step.state],
                    )}
                  >
                    {step.state === "done" ? (
                      <Check className="size-3.5" strokeWidth={2.5} />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "text-lk-compact font-medium",
                        step.state === "done" ? "text-lk-ink-3 line-through" : "text-lk-ink",
                      )}
                    >
                      {step.title}
                      <span className="sr-only">, {t[step.state]}</span>
                    </span>
                    <span className="text-lk-caption text-lk-ink-3">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <figcaption className="text-lk-caption text-lk-ink-3">{t.caption}</figcaption>
      </figure>
    </MarketingSection>
  );
}

/** « Bénéficiez d'un support total… » (#comparatif): three ways to sell. */
export function ComparisonSection() {
  const t = home.comparison;
  return (
    <MarketingSection id="comparatif" tone="stone" title={t.title} lead={t.lead}>
      <p className="text-lk-compact font-semibold text-lk-ink-2">{t.example}</p>
      <ul className="mt-4 grid gap-4 lg:grid-cols-3">
        {t.columns.map((column) => (
          <li
            key={column.key}
            className={cn(
              "rounded-lk-md bg-lk-surface p-5 lg:p-6",
              column.key === "leenkey" ? "border-2 border-lk-blue" : "border border-lk-line",
            )}
          >
            <h3 className="text-lk-h2 font-bold text-wide text-lk-ink lg:text-lk-h2-lg">
              {column.name}
            </h3>
            <p className="mt-1 text-lk-secondary text-lk-ink-3">{column.detail}</p>
            <dl className="mt-4">
              {t.rows.map((row, index) => (
                <div
                  key={row}
                  className="flex items-baseline justify-between gap-4 border-t border-lk-line py-2.5"
                >
                  <dt className="text-lk-secondary text-lk-ink-3">{row}</dt>
                  <dd className="text-right text-lk-compact font-semibold tabular-nums text-lk-ink">
                    {column.values[index]}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
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
      action={
        <MoreLink href={ROUTES.faq} tone="ink">
          {t.all}
        </MoreLink>
      }
    >
      <ul className="grid gap-4 lg:grid-cols-3">
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

/** « Parlons-en ensemble. » (#contact): the contact form of the site. */
export function ContactSection() {
  const t = home.contact;
  return (
    <MarketingSection id="contact" title={t.title} lead={t.lead}>
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
