import Link from "next/link";
import { ArrowRight, ChartLine, FileText, PenLine, Search, Tag, UserRound } from "lucide-react";
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

// Sections of the home page of direction C after the hero
// (docs/design-handoff/SPECS.md 3, items 5 to 11), and the contact section
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
      className="mx-auto max-w-lk-wide px-4 pt-10 md:px-8 md:pt-18"
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
            kind: "halo",
            className: "-top-22 -right-27 size-75 md:-top-38 md:-right-27 md:size-120",
          },
          {
            kind: "ring",
            slow: true,
            className: "bottom-8 -left-15 size-35 md:bottom-10 md:-left-17 md:size-55",
          },
          { kind: "dot", slow: true, className: "top-18 left-[44%] hidden size-3.5 md:block" },
        ]}
      />
      <div className="mx-auto flex max-w-lk-wide flex-col gap-4 px-4 py-10 md:px-8 md:py-20 lg:flex-row lg:items-center lg:gap-14">
        <div data-reveal="" className="min-w-0 lg:flex-[1_1_440px]">
          <p className="mb-2 text-lk-compact font-bold text-lk-blue md:mb-3 md:text-lk-body-lg">
            {t.eyebrow}
          </p>
          <h2
            id="economies"
            className="text-lk-c-feature text-heavy text-lk-ink md:text-lk-c-feature-lg"
          >
            {t.title}
          </h2>
          <p className="mt-2.5 text-lk-body text-lk-ink-2 md:mt-4 md:text-lk-lead-lg">
            <span className="md:hidden">{t.leadShort}</span>
            <span className="hidden md:inline">{t.lead}</span>
          </p>
        </div>
        <div data-reveal="" className="min-w-0 lg:flex-[1_1_520px]">
          <SavingsSimulator accompaniedCents={planCents} />
        </div>
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
      className="mx-auto max-w-lk-wide px-4 pt-12 md:px-8 md:pt-22"
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
              className="flex gap-3.5 overflow-hidden rounded-lk-xl border border-lk-line bg-lk-surface p-4 md:flex-col md:gap-0 md:rounded-lk-2xl md:p-0"
            >
              <div className="relative flex shrink-0 items-center justify-center md:h-37.5 md:bg-lk-blue-tint">
                <span
                  aria-hidden="true"
                  className="absolute top-4 left-4.5 hidden text-lk-body font-extrabold text-lk-blue md:block"
                >
                  {`0${index + 1}`}
                </span>
                <span className="absolute top-3.5 right-4 hidden rounded-full bg-lk-surface px-2.5 py-1 text-lk-label font-bold text-lk-blue-dark md:block">
                  {step.tag}
                </span>
                <span className="flex size-14 items-center justify-center rounded-lk-xl bg-lk-blue-tint text-lk-blue md:size-19 md:rounded-lk-3xl md:bg-lk-surface md:shadow-lk-tile">
                  <Icon aria-hidden="true" strokeWidth={1.6} className="size-6.5 md:size-9" />
                </span>
              </div>
              <div className="min-w-0 md:px-6 md:pt-5.5 md:pb-6.5">
                <p className="text-lk-label font-extrabold text-lk-blue md:hidden">
                  {`${t.label(index + 1)} · ${step.tag}`}
                </p>
                <h3 className="text-lk-c-card font-extrabold text-lk-ink md:mb-1.5 md:text-lk-c-card-lg">
                  {step.title}
                </h3>
                <p className="text-lk-compact text-lk-ink-2 md:text-lk-body-lg">{step.text}</p>
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
      className="mx-auto max-w-lk-wide px-4 pt-12 md:px-8 md:pt-22"
    >
      <div data-reveal="" className="mb-3.5 flex flex-wrap items-end justify-between gap-4 md:mb-6">
        <h2 id="formules" className={sectionTitle}>
          {t.title}
        </h2>
        <Link
          href={ROUTES.pricing}
          className="inline-flex min-h-11 items-center text-lk-compact font-bold text-lk-blue underline-offset-3 hover:underline md:text-lk-body-lg"
        >
          {t.all}
        </Link>
      </div>
      {plans && plans.length > 0 ? (
        <ul
          data-reveal-stagger=""
          className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-6"
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
        className="mt-3 inline-flex min-h-11 items-center text-lk-body font-bold text-lk-blue underline-offset-3 hover:underline"
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
    <section aria-labelledby="pret" className="mx-auto max-w-lk-wide px-4 pt-10 md:px-8 md:pt-22">
      <div
        data-reveal=""
        className="relative isolate flex flex-col gap-4 overflow-hidden rounded-lk-3xl border border-lk-line bg-lk-surface px-5.5 py-7 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-8 md:rounded-lk-4xl md:p-16"
      >
        <DecorativeShapes
          shapes={[
            {
              kind: "halo",
              className: "-top-20 -right-20 size-55 md:-top-30 md:right-[18%] md:size-85",
            },
            {
              kind: "ring",
              slow: true,
              className:
                "-bottom-12.5 -left-10 size-30 md:-right-10 md:-bottom-15 md:left-auto md:size-45",
            },
          ]}
        />
        <div className="max-w-155">
          <h2 id="pret" className="text-lk-c-banner text-heavy text-lk-ink md:text-lk-c-banner-lg">
            {t.title}
          </h2>
          <p className="mt-2 text-lk-body text-lk-ink-2 md:mt-3 md:text-lk-lead-lg">{t.text}</p>
        </div>
        <Button
          asChild
          shape="pill"
          size="xl"
          trailingIcon={ArrowRight}
          className="w-full font-extrabold md:h-15 md:w-auto md:px-7"
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
