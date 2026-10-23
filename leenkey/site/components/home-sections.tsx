import Link from "next/link";
import { ArrowRight, ChartLine, CircleCheck, CircleX, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { ContactForm } from "./contact-form";
import { RichText } from "./rich-text";
import { SellerSpacePreview } from "./seller-space-preview";
import { StagePicker } from "./stage-picker";
import { ValueCurve } from "./value-curve";

// Sections of the home page after the hero, in the order of the V1 page and
// with its anchors (#etape, #comment…), in its direction (DECISIONS
// 2026-10-23): the V1 section heads, its label above the title, its cards
// in a blue shadow, its numbering and its calls to action. Texts:
// fr.site.home.

const home = fr.site.home;

/** The white card of the V1 sections: 12 px, a cool line, a blue shadow. */
const v1Card = "rounded-lk-lg border border-lk-mist-line bg-lk-surface shadow-lk-card";

/** « Où en êtes-vous dans votre vente ? » (#etape), right after the hero as in the V1. */
export function StagesSection() {
  const t = home.stages;
  return (
    <MarketingSection
      id="etape"
      look="showcase"
      tone="mist"
      eyebrow={t.eyebrow}
      title={t.title}
      accent={t.accent}
      lead={t.lead}
    >
      <StagePicker />
    </MarketingSection>
  );
}

/** The icons of the three steps, as in the V1: the value, the file, the signature. */
const STEP_ICONS = [ChartLine, FileText, ShieldCheck] as const;

/**
 * « Trois étapes » (#comment): the V1 cards, the number of the step in a
 * square in the blue gradient (the real steps of the sale), its icon, its
 * text and its tag in blue; a dashed line from one card to the next from
 * 1024 px. The list says the order to screen readers, the numbers are not
 * read.
 */
export function StepsSection() {
  const t = home.steps;
  return (
    <MarketingSection
      id="comment"
      look="showcase"
      eyebrow={t.eyebrow}
      title={t.title}
      accent={t.accent}
      revealContent={false}
    >
      <ol data-reveal-stagger="" className="grid gap-5 lg:grid-cols-3">
        {t.items.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? ChartLine;
          return (
            <li
              key={step.title}
              className={cn(v1Card, "relative flex flex-col rounded-lk-xl px-6 py-7")}
            >
              {index < t.items.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-11.5 left-[calc(100%-0.5rem)] hidden h-0.5 w-8 bg-[repeating-linear-gradient(90deg,var(--color-lk-blue-line)_0_6px,transparent_6px_12px)] lg:block"
                />
              ) : null}
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-lk-lg bg-linear-135 from-lk-blue to-lk-blue-mid text-lk-title font-extrabold text-white shadow-lk-cta"
              >
                {index + 1}
              </span>
              <Icon aria-hidden="true" className="mt-4.5 mb-3.5 size-6.5 text-lk-blue" />
              <h3 className="text-lk-h3-lg font-semibold text-lk-ink lg:text-lk-h2">
                {step.title}
              </h3>
              <p className="mt-2 text-lk-body text-pretty text-lk-ink-2">{step.text}</p>
              <p className="mt-auto pt-3.5 text-lk-caption font-semibold text-lk-blue">
                {step.tag}
              </p>
            </li>
          );
        })}
      </ol>
    </MarketingSection>
  );
}

/**
 * « Ce que vous obtenez en quelques minutes. » (#fonctionnalites): the dark
 * section of the V1 page, its label, its curve and its four items
 * (DECISIONS 2026-10-20).
 */
export function FeaturesSection() {
  const t = home.features;
  return (
    <MarketingSection
      id="fonctionnalites"
      look="showcase"
      tone="navy"
      eyebrow={t.eyebrow}
      title={t.title}
      accent={t.accent}
      lead={t.lead}
      revealContent={false}
    >
      <ValueCurve items={t.items} />
      <div data-reveal="" className="mt-10 flex justify-center lg:mt-12">
        <Button
          asChild
          variant="cta"
          size="lg"
          trailingIcon={ArrowRight}
          className="focus-visible:outline-white"
        >
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
      look="showcase"
      tone="navy"
      eyebrow={t.eyebrow}
      title={t.title}
      accent={t.accent}
      lead={t.lead}
    >
      <SellerSpacePreview />
    </MarketingSection>
  );
}

/**
 * « Bénéficiez d'un support total… » (#comparatif): the V1 table, three ways
 * to sell against four criteria, a green check or a grey cross before each
 * value, Leenkey in a 2 px blue frame on the blue tint. A table from 768 px;
 * below, a card for each way, Leenkey framed, the criteria in each.
 */
export function ComparisonSection() {
  const t = home.comparison;
  return (
    <MarketingSection
      id="comparatif"
      look="showcase"
      tone="mist"
      eyebrow={t.eyebrow}
      title={t.title}
      accent={t.accent}
      lead={t.lead}
    >
      <div
        className={cn(v1Card, "mx-auto hidden max-w-275 overflow-hidden rounded-lk-xl md:block")}
      >
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          {/* The figures of the table hold for this sale (« ≈ 15 000 € »). */}
          <caption className="sr-only">
            {t.title} {t.example}
          </caption>
          <colgroup>
            <col className="w-[27%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <td className="bg-lk-mist px-6 pt-7 pb-4 align-bottom text-lk-caption text-lk-ink-3">
                {t.example}
              </td>
              {t.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-6 pt-7 pb-4 align-bottom font-normal",
                    column.key === "leenkey" &&
                      "border-x-2 border-t-2 border-lk-blue bg-lk-blue-tint rounded-t-lk-xl",
                  )}
                >
                  <span className="block text-lk-h2 font-bold text-lk-ink">{column.name}</span>
                  <span className="mt-1 block text-lk-secondary text-lk-ink-3">
                    {column.detail}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, index) => {
              const last = index === t.rows.length - 1;
              return (
                <tr key={row}>
                  <th
                    scope="row"
                    className="border-t border-lk-mist-line bg-lk-mist px-6 py-4.5 text-lk-compact font-semibold text-lk-ink"
                  >
                    {row}
                  </th>
                  {t.columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "border-t border-lk-mist-line px-6 py-4.5",
                        column.key === "leenkey" &&
                          cn(
                            "border-x-2 border-x-lk-blue bg-lk-blue-tint",
                            last && "rounded-b-lk-xl border-b-2 border-b-lk-blue",
                          ),
                      )}
                    >
                      <ComparisonValue
                        value={column.values[index] ?? ""}
                        good={column.good[index] ?? false}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mb-4 text-center text-lk-caption text-lk-ink-3 md:hidden">{t.example}</p>
      <ul className="flex flex-col gap-4 md:hidden">
        {t.columns.map((column) => {
          const leenkey = column.key === "leenkey";
          return (
            <li
              key={column.key}
              className={cn(
                v1Card,
                "rounded-lk-xl px-5 py-6",
                leenkey && "border-2 border-lk-blue bg-lk-blue-tint",
              )}
            >
              <h3 className="text-lk-h2 font-bold text-lk-ink">{column.name}</h3>
              <p className="mt-1 text-lk-secondary text-lk-ink-3">{column.detail}</p>
              <dl className="mt-3">
                {t.rows.map((row, index) => (
                  <div
                    key={row}
                    className="flex items-start justify-between gap-4 border-t border-lk-mist-line py-3"
                  >
                    <dt className="text-lk-secondary font-semibold text-lk-ink-2">{row}</dt>
                    <dd className="text-right">
                      <ComparisonValue
                        value={column.values[index] ?? ""}
                        good={column.good[index] ?? false}
                      />
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

/** A value of the comparison: the check or the cross of the V1, said in words to screen readers. */
function ComparisonValue({ value, good }: { value: string; good: boolean }) {
  const t = home.comparison;
  const Icon = good ? CircleCheck : CircleX;
  return (
    <span className="inline-flex items-center gap-2.5 text-lk-compact font-semibold text-lk-ink tabular-nums">
      <Icon
        aria-hidden="true"
        className={cn("size-4.5 shrink-0", good ? "text-lk-success" : "text-lk-ink-3")}
      />
      <span>
        <span className="sr-only">{good ? t.good : t.bad} </span>
        {value}
      </span>
    </span>
  );
}

/**
 * « Les trois questions essentielles. » (#faq): the V1 list, a white card for
 * each question that unfolds its answer (<details>, without script), a blue
 * « + » that becomes a « − » once open; « Toutes les questions » under it.
 */
export function HomeFaqSection() {
  const t = home.faq;
  return (
    <MarketingSection
      id="faq"
      look="showcase"
      eyebrow={t.eyebrow}
      title={t.title}
      accent={t.accent}
      revealContent={false}
    >
      <ul data-reveal-stagger="" className="mx-auto flex max-w-220 flex-col gap-3.5">
        {t.items.map((item) => (
          <li key={item.question}>
            <details
              className={cn(
                "group rounded-lk-lg border border-lk-mist-line bg-lk-surface",
                "transition-[border-color,box-shadow] duration-220 ease-out-lk open:border-lk-blue-line open:shadow-lk-card",
              )}
            >
              <summary
                className={cn(
                  "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4.5 px-5 py-5 md:px-6 md:py-5.5 [&::-webkit-details-marker]:hidden",
                  "text-lk-h3 font-semibold text-lk-ink lg:text-lk-h3-lg",
                  "rounded-lk-lg focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
                )}
              >
                <span>{item.question}</span>
                <span aria-hidden="true" className="relative size-5.5 shrink-0">
                  <span className="absolute top-1/2 left-1/2 h-0.5 w-4.25 -translate-1/2 rounded-lk-xs bg-lk-blue" />
                  <span className="absolute top-1/2 left-1/2 h-4.25 w-0.5 -translate-1/2 rounded-lk-xs bg-lk-blue transition-transform duration-220 ease-out-lk group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-lk-prose px-5 pb-6 text-lk-body text-pretty text-lk-ink-2 md:px-6">
                <RichText parts={item.answer} />
              </p>
            </details>
          </li>
        ))}
      </ul>
      <div data-reveal="" className="mt-8 flex justify-center">
        <Button asChild variant="secondary" size="lg" trailingIcon={ArrowRight}>
          <Link href={ROUTES.faq}>{t.all}</Link>
        </Button>
      </div>
    </MarketingSection>
  );
}

/**
 * « Parlons-en ensemble. » (#contact): the contact form of the site, also
 * /contact, in the white card of the V1 under its centred head.
 */
export function ContactSection({ titleAs = "h2" }: { titleAs?: "h1" | "h2" }) {
  const t = home.contact;
  return (
    <MarketingSection
      id="contact"
      look="showcase"
      tone="mist"
      titleAs={titleAs}
      eyebrow={t.eyebrow}
      title={t.title}
      accent={t.accent}
      lead={t.lead}
    >
      <ContactForm source="contact" look="showcase" className="mx-auto max-w-lk-settings" />
    </MarketingSection>
  );
}

/**
 * Last call to action of the home page, the V1 one: the brand blue in its
 * gradient with a white glow and a grid of dots, the title and its text
 * centred, « Valoriser mon bien gratuitement » in white with its arrow, the
 * note under it with a shield.
 */
export function FinalCta() {
  const t = home.final;
  return (
    <section
      aria-labelledby="cta-final-titre"
      className="lk-cta-bg relative isolate overflow-hidden text-white"
    >
      <div
        aria-hidden="true"
        className="lk-dots-round pointer-events-none absolute inset-0 -z-10"
      />
      <div
        data-reveal=""
        className="mx-auto flex max-w-lk-settings flex-col items-center px-5 py-16 text-center md:px-10 lg:py-24"
      >
        <h2
          id="cta-final-titre"
          className="text-lk-h1-lg font-bold text-wide text-balance md:text-lk-section-lg lg:text-lk-showcase"
        >
          {t.title}
        </h2>
        <p className="mt-4 max-w-lk-prose text-lk-body-lg text-pretty lg:text-lk-lead-lg">
          {t.text}
        </p>
        <Button
          asChild
          variant="inverse"
          size="lg"
          trailingIcon={ArrowRight}
          className="mt-8 shadow-lk-raised"
        >
          <Link href={ROUTES.valuation}>{t.action}</Link>
        </Button>
        {/* The shield in the line: on two lines, it stays before the first word. */}
        <p className="mt-5 text-lk-secondary text-balance">
          <ShieldCheck aria-hidden="true" className="mr-2 inline size-4 align-[-0.1875em]" />
          {t.note}
        </p>
      </div>
    </section>
  );
}
