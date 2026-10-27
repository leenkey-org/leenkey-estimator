import Link from "next/link";
import { ArrowRight, ChartLine, FileText, PenLine, Search, Tag, UserRound } from "lucide-react";
import { Accented } from "@/components/shared/accented";
import { Button } from "@/components/shared/button";
import { DecorativeShapes } from "@/components/shared/decorative-shapes";
import { FaqList } from "@/components/shared/faq-list";
import { MarketingSection } from "@/components/shared/marketing-section";
import { PlanCardSoft } from "@/components/shared/plan-card-soft";
import { ShortcutCard } from "@/components/shared/shortcut-card";
import { activePlans } from "@/core/billing/plans";
import { getProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { HOME_SECTION_TITLE } from "../home-styles";
import { ContactForm } from "./contact-form";
import { directListingHref } from "./home-hero";
import { RichText } from "./rich-text";
import { SavingsSimulator } from "./savings-simulator";

// Sections of the home page after the hero, in the charte of the redesign D
// (docs/design-handoff-d/SPECS.md 3, items 4 to 10), and the contact section
// of /contact. Texts: fr.site.home. The steps, the plans and the questions
// keep the anchors of the V1 home page (#comment, #tarifs, #faq).

const home = fr.site.home;

const sectionTitle = HOME_SECTION_TITLE;

/** « Que voulez-vous faire ? »: four shortcuts, two by two on a phone. */
export async function ShortcutsSection() {
  const t = home.shortcuts;
  const signedIn = (await getProfile()) !== null;
  const items = [
    { key: "valuation", href: ROUTES.valuation, icon: ChartLine },
    { key: "sell", href: directListingHref(signedIn), icon: Tag },
    { key: "support", href: ROUTES.pricing, icon: UserRound },
    { key: "buy", href: ROUTES.search, icon: Search },
  ] as const;
  return (
    <section
      aria-labelledby="que-faire"
      className="lk-frame max-md:[--lk-gutter:1rem] pt-10 md:pt-18"
    >
      <h2 id="que-faire" data-reveal="" className={`${sectionTitle} mb-3.5 md:mb-6`}>
        {t.title}
      </h2>
      <ul data-reveal-stagger="" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {items.map(({ key, href, icon }) => (
          <li key={key} className="flex">
            <ShortcutCard
              className="flex-1"
              href={href}
              icon={icon}
              title={t.items[key].title}
              text={t.items[key].text}
              action={t.items[key].action}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Price of the Accompagné plan, from the plans table (reference data), or null. */
async function accompaniedCents(): Promise<number | null> {
  const plans = await activePlans();
  return plans?.find((plan) => plan.code === "accompagne")?.priceCents ?? null;
}

/**
 * « Combien vous économisez avec Leenkey »: white, its shapes behind. Left
 * out without the plans table, as the plan cards: a price is never written
 * in the code (CLAUDE.md section 5).
 */
export async function SavingsSection() {
  const t = home.savings;
  const planCents = await accompaniedCents();
  if (planCents === null) return null;
  return (
    <section
      aria-labelledby="economies"
      className="relative isolate mt-10 overflow-hidden border-y border-lk-line bg-lk-surface md:mt-22"
    >
      <DecorativeShapes
        shapes={[
          {
            kind: "orb",
            className: "-top-22 -right-22 size-60 md:-top-30 md:-right-25 md:size-90",
          },
          {
            kind: "dots",
            slow: true,
            className: "bottom-12 left-10 hidden h-25 w-37.5 md:block",
          },
          {
            kind: "orb-solid",
            slow: true,
            className:
              "top-9 right-6 size-8.5 md:top-17.5 md:right-auto md:left-[44%] md:size-11.5",
          },
        ]}
      />
      <div className="lk-frame max-md:[--lk-gutter:1rem] py-10 md:py-22">
        <SavingsSimulator
          accompaniedCents={planCents}
          intro={
            <>
              <p className="mb-2 text-lk-micro font-semibold tracking-lk-caps text-lk-blue-dark uppercase md:mb-3 md:text-lk-secondary">
                {t.eyebrow}
              </p>
              <h2
                id="economies"
                className="max-w-75 text-lk-d-feature font-bold tracking-lk-d-tight text-lk-ink md:max-w-none md:text-lk-d-feature-lg"
              >
                <Accented text={t.title} accent={t.accent} className="lk-gradient-text" />
              </h2>
              <p className="mt-2.5 text-lk-body text-lk-ink-2 md:mt-4 md:text-lk-d-lead">
                <span className="md:hidden">{t.leadShort}</span>
                <span className="hidden md:inline">{t.lead}</span>
              </p>
            </>
          }
        />
      </div>
    </section>
  );
}

const STEP_ICONS = [ChartLine, FileText, PenLine] as const;

/** « Trois étapes. Vous gardez les clés du début à la fin. » */
export function StepsSection() {
  const t = home.steps;
  return (
    <section
      id="comment"
      aria-labelledby="etapes"
      className="lk-frame max-md:[--lk-gutter:1rem] pt-12 md:pt-22"
    >
      <h2 id="etapes" data-reveal="" className={`${sectionTitle} mb-3.5 md:mb-7`}>
        {t.title}
      </h2>
      <ol data-reveal-stagger="" className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-6">
        {t.items.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? ChartLine;
          return (
            <li
              key={step.title}
              className="flex gap-3.5 rounded-lk-d-card border border-lk-line bg-lk-surface p-4 md:flex-col md:rounded-lk-2xl md:p-7"
            >
              {/* The number in a square of the gradient, its tag beside it. */}
              <div className="flex shrink-0 items-start justify-between md:items-center">
                <span
                  aria-hidden="true"
                  className="lk-gradient flex size-9 items-center justify-center rounded-lk-lg text-lk-title font-bold text-white md:size-10"
                >
                  {index + 1}
                </span>
                <span className="hidden rounded-full bg-lk-blue-tint px-3 py-1 text-lk-caption font-semibold text-lk-blue-dark md:inline">
                  {step.tag}
                </span>
              </div>
              <Icon
                aria-hidden="true"
                strokeWidth={1.7}
                className="lk-icon-gradient hidden size-7.5 md:block"
              />
              <div className="min-w-0">
                <p className="text-lk-caption font-semibold text-lk-blue-dark md:hidden">
                  {`${t.label(index + 1)} · ${step.tag}`}
                </p>
                <h3 className="text-lk-c-card font-bold text-lk-ink md:mb-1.5 md:text-lk-c-card-lg">
                  {step.title}
                </h3>
                <p className="text-lk-compact text-lk-ink-2 md:text-lk-body">{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** « Choisissez votre niveau d'accompagnement »: the three plans, read from the plans table. */
export async function PlansSection() {
  const t = home.plans;
  const plans = await activePlans();
  return (
    <section
      id="tarifs"
      aria-labelledby="formules"
      className="lk-frame max-md:[--lk-gutter:1rem] pt-12 md:pt-22"
    >
      <div data-reveal="" className="mb-3.5 flex flex-wrap items-end justify-between gap-4 md:mb-6">
        <h2 id="formules" className={sectionTitle}>
          {t.title}
        </h2>
        <Link
          href={ROUTES.pricing}
          className="inline-flex min-h-11 items-center text-lk-compact font-semibold text-lk-blue underline-offset-3 hover:underline md:text-lk-body"
        >
          {t.all}
        </Link>
      </div>
      {plans && plans.length > 0 ? (
        <ul
          data-reveal-stagger=""
          className="flex flex-col gap-2.5 md:gap-4 lg:grid lg:grid-cols-3 lg:gap-6"
        >
          {plans.map((plan) => (
            <li key={plan.code} className="flex">
              <PlanCardSoft
                className="flex-1"
                tag={t.items[plan.code].tag}
                name={plan.name}
                text={t.items[plan.code].text}
                price={
                  plan.priceCents === 0 ? t.free : `${formatPrice(plan.priceCents)}\u00a0${t.taxes}`
                }
                note={t.items[plan.code].note}
                featured={plan.code === "accompagne"}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** « Les trois questions essentielles. »: rows that unfold, « Toutes les questions » under them. */
export function HomeFaqSection() {
  const t = home.faq;
  return (
    <section
      id="faq"
      aria-labelledby="questions"
      className="mx-auto max-w-220 px-4 pt-12 md:px-8 md:pt-22"
    >
      <h2 id="questions" data-reveal="" className={`${sectionTitle} mb-2 md:mb-5`}>
        {t.title}
      </h2>
      <FaqList
        look="rows"
        items={t.items.map((item) => ({
          question: item.question,
          answer: (
            <p>
              <RichText parts={item.answer} />
            </p>
          ),
        }))}
      />
      <Link
        href={ROUTES.faq}
        className="mt-3 inline-flex min-h-11 items-center text-lk-body font-semibold text-lk-blue underline-offset-3 hover:underline"
      >
        {t.all}
      </Link>
    </section>
  );
}

/** « Prêt à garder les clés de votre vente ? »: the white banner and its shapes. */
export function FinalBanner() {
  const t = home.final;
  return (
    <section aria-labelledby="pret" className="lk-frame max-md:[--lk-gutter:1rem] pt-10 md:pt-22">
      <div
        data-reveal=""
        className="relative isolate flex flex-col gap-5 overflow-hidden rounded-lk-3xl bg-lk-night px-5.5 py-8 text-white md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-8 md:rounded-lk-4xl md:p-16"
      >
        <DecorativeShapes
          shapes={[
            {
              kind: "halo-blue",
              className: "-bottom-40 -left-30 size-90 md:-bottom-55 md:size-130",
            },
            {
              kind: "halo-violet",
              className: "-top-40 -right-20 size-80 md:-top-50 md:right-[10%] md:size-110",
            },
            { kind: "dots-white", className: "top-7 right-9 hidden h-20 w-30 md:block" },
          ]}
        />
        <div className="max-w-160">
          <h2
            id="pret"
            className="text-lk-d-banner font-bold tracking-lk-d-tight md:text-lk-c-banner-lg"
          >
            <Accented text={t.title} accent={t.accent} className="lk-gradient-text-night" />
          </h2>
          <p className="mt-2 text-lk-body text-lk-night-muted md:mt-3 md:text-lk-d-lead">
            {t.text}
          </p>
        </div>
        <Button
          asChild
          variant="gradient"
          shape="pill"
          size="xl"
          trailingIcon={ArrowRight}
          className="w-full font-semibold md:h-14.5 md:w-auto md:px-7"
        >
          <Link href={ROUTES.valuation}>{t.action}</Link>
        </Button>
      </div>
    </section>
  );
}

/**
 * « Parlons-en ensemble. » (#contact): the contact form of the site, on
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
