import {
  ArrowRight,
  ChartLine,
  Check,
  CircleCheck,
  Clock,
  Globe,
  Layers,
  Lightbulb,
  Mail,
  MessageCircle,
  MessageSquareMore,
  Network,
  RefreshCw,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Accented } from "@/components/shared/accented";
import { Button } from "@/components/shared/button";
import { FaqList } from "@/components/shared/faq-list";
import { MarketingSection } from "@/components/shared/marketing-section";
import { ShowcaseHero } from "@/components/shared/showcase-hero";
import { fr } from "@/lib/i18n/fr";
import type { ContactMotif } from "@/lib/validations/contact";
import { cn } from "@/lib/utils";
import { VISION_ANCHOR } from "../anchors";
import { emailHref, whatsappHref } from "../contact-links";
import { ContactForm } from "./contact-form";
import { CtaPanel } from "./cta-panel";
import { RichText } from "./rich-text";
import { card, cardText, cardTitle, iconTile } from "./site-styles";
import { StagePill, type Stage } from "./stage-pill";

// Sections of /investir (L1-43), in the order of the V1 page, in its
// direction since L1-50 (DECISIONS 2026-10-23): its hero, its labels above
// the titles, its two columns, its timeline, its cards and its icons. The
// figures without a source and the forecasts stay out (Q53). Texts:
// fr.site.invest.

const t = fr.site.invest;
/** Anchor of the form, the one of the V1 page (links already shared). */
const FORM = "formulaire";
const MOTIFS: readonly ContactMotif[] = ["Investisseur", "Vendeur", "Partenaire", "Autre"];

/** The icons of the V1 cards, in the order of their texts (no house, DESIGN.md 1). */
const VISION_ICONS = [Sparkles, MessageSquareMore, CircleCheck, Network] as const;
const TIMING_ICONS = [Users, Globe, Lightbulb] as const;
const REASON_ICONS = [Lightbulb, Layers, ChartLine, Users] as const;

/**
 * Body text of the two columns of the V1: 16 px, the secondary ink, bold
 * parts in ink, a reading width until the columns sit side by side.
 */
const columnText = "max-w-lk-prose text-lk-body-lg text-pretty text-lk-ink-2 lg:max-w-none";

/** « L'immobilier français se réinvente. Soyez-en. » */
export function InvestHero() {
  return (
    <ShowcaseHero
      id="investir"
      eyebrow={t.hero.eyebrow}
      title={t.hero.title}
      accent={t.hero.accent}
      lead={t.hero.lead.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      actions={
        <Button asChild variant="cta" size="lg" trailingIcon={ArrowRight}>
          <a href={`#${FORM}`}>{t.hero.action}</a>
        </Button>
      }
    />
  );
}

/** The three lines of the hook, as large as a title. */
const hookLine =
  "text-lk-h1 font-bold text-wide text-balance md:text-lk-h1-lg lg:text-lk-section-lg";

/**
 * What the owners pay the agencies, centred on white as in the V1: the
 * amount in the blue gradient, the reason in the tertiary ink, « Jusqu'ici. ».
 */
export function HookSection() {
  return (
    <section id="constat" aria-labelledby="constat-titre" className="bg-lk-surface">
      <div
        data-reveal=""
        className="mx-auto flex max-w-205 flex-col items-center gap-5 px-5 py-14 text-center text-lk-ink md:px-10 md:py-18 lg:gap-6 lg:py-24"
      >
        <h2 id="constat-titre" className={hookLine}>
          <Accented text={t.hook.title} accent={t.hook.accent} className="lk-text-grad" />
        </h2>
        <p className={hookLine}>
          <RichText parts={t.hook.text} strongClassName="text-lk-ink-3" />
        </p>
        <p className={hookLine}>{t.hook.last}</p>
      </div>
    </section>
  );
}

/**
 * « Un marché gigantesque, figé depuis 30 ans. »: the head on the left, the
 * two alternatives in the text, « — ou — » between them, and beside it the
 * figure of the V1 in the blue gradient (5 % of a sale at 300 000 €).
 */
export function MarketSection() {
  const m = t.market;
  return (
    <MarketingSection
      id="marche"
      tone="mist"
      look="showcase"
      align="start"
      eyebrow={m.eyebrow}
      title={m.title}
      revealContent={false}
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div data-reveal="" className={cn(columnText, "flex flex-col gap-4")}>
          <p>
            <RichText parts={m.lead} />
          </p>
          <p>
            <RichText parts={m.alone} />
          </p>
          <p className="text-center font-semibold text-lk-ink-3">
            <span aria-hidden="true">— </span>
            {m.or}
            <span aria-hidden="true"> —</span>
          </p>
          <p>
            <RichText parts={m.agency} />
          </p>
          <p>
            <RichText parts={m.need} />
          </p>
          <p>{m.answer}</p>
        </div>
        <div
          data-reveal=""
          data-reveal-delay="1"
          className="flex flex-col gap-3 rounded-lk-xl bg-linear-135 from-lk-blue to-lk-blue-mid px-7 py-10 text-white shadow-lk-cta lg:px-9 lg:py-14"
        >
          <p className="text-lk-display font-bold text-wide tabular-nums md:text-lk-display-md lg:text-lk-display-lg">
            {m.example.value}
          </p>
          <p className="text-lk-body-lg text-pretty">{m.example.label}</p>
        </div>
      </div>
    </MarketingSection>
  );
}

/**
 * « Un écosystème IA qui copilote la vente immobilière, de bout en bout. »:
 * the head on the left, the text and its objective in a frame of the blue
 * tint, the four parts of the platform beside it, each with its icon.
 */
export function VisionSection() {
  const v = t.vision;
  return (
    <MarketingSection
      id={VISION_ANCHOR}
      look="showcase"
      align="start"
      eyebrow={v.eyebrow}
      title={v.title}
      accent={v.accent}
      revealContent={false}
    >
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <div data-reveal="" className={cn(columnText, "flex flex-col gap-4")}>
          <p>{v.lead}</p>
          <p className="font-semibold text-lk-ink">{v.statement}</p>
          <p>
            <RichText parts={v.steps} />
          </p>
          <p className="rounded-lk-lg border border-lk-blue-line bg-lk-blue-tint px-5 py-4 text-lk-ink lg:px-6 lg:py-5">
            {v.goal}
          </p>
        </div>
        <ul data-reveal-stagger="" className="flex flex-col gap-4">
          {v.items.map((item, index) => {
            const Icon = VISION_ICONS[index] ?? Sparkles;
            return (
              <li key={item.title} className={cn(card, "flex gap-4 lg:px-6 lg:py-6")}>
                <span className={iconTile}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className={cardTitle}>{item.title}</h3>
                  <p className={cardText}>{item.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </MarketingSection>
  );
}

/** The mark of a milestone on the timeline: its stage is said in words by its pill. */
const MILESTONE: Record<Stage, { icon: LucideIcon; className: string }> = {
  done: { icon: Check, className: "bg-lk-success-bg text-lk-success-fg" },
  ongoing: { icon: RefreshCw, className: "bg-lk-blue-tint text-lk-blue" },
  next: { icon: Clock, className: "border border-lk-mist-line bg-lk-surface text-lk-ink-3" },
};

/**
 * « Ce n'est pas une idée. C'est un projet construit. »: the timeline of the
 * V1, a round mark per milestone joined by a line, its stage beside its
 * title; then the closing words, their end in blue.
 */
export function ProgressSection() {
  const p = t.progress;
  return (
    <MarketingSection
      id="avancement"
      tone="mist"
      look="showcase"
      eyebrow={p.eyebrow}
      title={p.title}
      revealContent={false}
    >
      <ol data-reveal-stagger="" className="mx-auto flex max-w-180 flex-col">
        {p.items.map((item, index) => {
          const mark = MILESTONE[item.status];
          const Icon = mark.icon;
          const last = index === p.items.length - 1;
          return (
            <li key={item.title} className={cn("relative flex gap-5", !last && "pb-7")}>
              {last ? null : (
                <span
                  aria-hidden="true"
                  className="absolute top-12 bottom-1 left-5.5 w-px bg-lk-mist-line"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  mark.className,
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="flex flex-col gap-1.5 pt-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-lk-h3-lg font-bold text-lk-ink lg:text-lk-h2">
                    {item.title}
                  </h3>
                  <StagePill stage={item.status} className="tracking-lk-caps uppercase" />
                </div>
                <p className={cardText}>{item.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p
        data-reveal=""
        className="mx-auto mt-12 max-w-lk-prose text-center text-lk-body-lg text-pretty text-lk-ink lg:text-lk-lead-lg"
      >
        <RichText parts={p.closing} strongClassName="font-semibold text-lk-blue" />
      </p>
    </MarketingSection>
  );
}

/**
 * « Un modèle simple, rentable dès le premier client. »: the three sources
 * of income of the V1, numbered, each with its tag; the third « À venir ».
 */
export function ModelSection() {
  const m = t.model;
  return (
    <MarketingSection
      id="modele"
      look="showcase"
      eyebrow={m.eyebrow}
      title={m.title}
      revealContent={false}
    >
      <ul data-reveal-stagger="" className="grid gap-5 lg:grid-cols-3">
        {m.items.map((item, index) => (
          <li key={item.title} className={cn(card, "flex flex-col gap-2.5")}>
            {/* As high as the pill of the third: the titles stay on one line. */}
            <div className="flex min-h-6.5 flex-wrap items-center gap-x-3 gap-y-1">
              <p className="flex items-center gap-2 text-lk-secondary font-bold text-lk-blue">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-lk-blue" />
                {m.source(index + 1)}
              </p>
              {"status" in item ? (
                <StagePill stage={item.status} className="tracking-lk-caps uppercase" />
              ) : null}
            </div>
            <h3 className="text-lk-h3-lg font-bold text-lk-ink lg:text-lk-h2">{item.title}</h3>
            <p className={cardText}>{item.text}</p>
            <p className="mt-auto self-start rounded-full bg-lk-blue-tint px-3 py-1.5 text-lk-caption font-bold text-lk-blue">
              {item.tag}
            </p>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

/**
 * « La fenêtre est ouverte. Elle ne le sera pas toujours. »: the three
 * reasons of the V1 with their icons, « C'est Leenkey. » ending the last one.
 */
export function TimingSection() {
  const m = t.timing;
  return (
    <MarketingSection
      id="timing"
      tone="mist"
      look="showcase"
      eyebrow={m.eyebrow}
      title={m.title}
      revealContent={false}
    >
      <ul data-reveal-stagger="" className="grid gap-5 lg:grid-cols-3">
        {m.items.map((item, index) => {
          const Icon = TIMING_ICONS[index] ?? Users;
          const last = index === m.items.length - 1;
          return (
            <li key={item.title} className={cn(card, "flex flex-col gap-3")}>
              <span className={iconTile}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className={cn(cardTitle, "mt-2")}>{item.title}</h3>
              <p className={cardText}>{item.text}</p>
              <p className={cardText}>
                {item.point}
                {last ? (
                  <>
                    {" "}
                    <strong className="font-bold text-lk-blue">{m.closing}</strong>
                  </>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>
    </MarketingSection>
  );
}

/** The label of a phase of the roadmap, as in the V1: the gradient, the navy, the tint. */
const PHASE = [
  "bg-linear-90 from-lk-blue to-lk-blue-mid text-white",
  "bg-lk-navy text-white",
  "bg-lk-blue-tint text-lk-blue",
] as const;

/**
 * « Une construction méthodique, étape par étape. »: now, tomorrow, after,
 * one wide card each, its label beside its title, its points on two columns.
 */
export function RoadmapSection() {
  const r = t.roadmap;
  return (
    <MarketingSection
      id="feuille-de-route"
      look="showcase"
      eyebrow={r.eyebrow}
      title={r.title}
      revealContent={false}
    >
      <ol data-reveal-stagger="" className="mx-auto flex max-w-230 flex-col gap-5">
        {r.items.map((phase, index) => (
          <li key={phase.title} className={cn(card, "lg:px-9 lg:py-8")}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-lk-micro font-bold tracking-lk-caps uppercase",
                  PHASE[index] ?? PHASE[2],
                )}
              >
                {phase.when}
              </p>
              <h3 className="text-lk-h2 font-bold text-lk-ink lg:text-lk-h2-lg">{phase.title}</h3>
            </div>
            <ul className="mt-5 grid gap-x-8 gap-y-3 md:grid-cols-2">
              {phase.list.map((line) => (
                <li key={line} className="flex gap-2.5 text-lk-body text-lk-ink">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lk-blue" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </MarketingSection>
  );
}

/** « Pourquoi les bons rejoignent Leenkey maintenant. »: four cards with their icons. */
export function ReasonsSection() {
  const r = t.reasons;
  return (
    <MarketingSection
      id="pourquoi"
      tone="mist"
      look="showcase"
      eyebrow={r.eyebrow}
      title={r.title}
      revealContent={false}
    >
      <ul data-reveal-stagger="" className="grid gap-5 md:grid-cols-2">
        {r.items.map((item, index) => {
          const Icon = REASON_ICONS[index] ?? Lightbulb;
          return (
            <li key={item.title} className={cn(card, "flex flex-col gap-3")}>
              <span className={iconTile}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className={cn(cardTitle, "mt-2")}>{item.title}</h3>
              <p className={cardText}>{item.text}</p>
            </li>
          );
        })}
      </ul>
    </MarketingSection>
  );
}

/**
 * The word of Leenkey to its future partners, on the dark of the hero as in
 * the V1: its quotation mark, the sentence as large as a title, its end in
 * the light gradient, then the way to the form.
 */
export function MessageSection() {
  return (
    <div className="lk-hero-bg relative isolate overflow-hidden text-white">
      <div
        data-reveal=""
        className="mx-auto flex max-w-205 flex-col items-center px-5 py-16 text-center md:px-10 lg:py-24"
      >
        <span
          aria-hidden="true"
          className="h-10 text-lk-display-lg font-bold text-lk-blue-light/70 lg:h-12"
        >
          “
        </span>
        <blockquote className="text-lk-h1-lg font-bold text-wide text-balance md:text-lk-section-lg">
          <p>
            <RichText parts={t.message.quote} strongClassName="lk-text-grad-light" />
          </p>
        </blockquote>
        <div className="mt-7 flex max-w-lk-prose flex-col gap-3 text-lk-body-lg text-pretty text-white/80">
          {t.message.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <Button
          asChild
          variant="cta"
          size="lg"
          trailingIcon={ArrowRight}
          className="mt-8 focus-visible:outline-white"
        >
          <a href={`#${FORM}`}>{t.message.action}</a>
        </Button>
      </div>
    </div>
  );
}

/** « Vos questions méritent des réponses claires. » */
export function InvestFaqSection() {
  return (
    <MarketingSection
      id="questions"
      look="showcase"
      eyebrow={t.faq.eyebrow}
      title={t.faq.title}
      revealContent={false}
    >
      <FaqList
        className="mx-auto max-w-220"
        items={t.faq.items.map((item) => ({
          question: item.question,
          answer: (
            <p>
              <RichText parts={item.answer} />
            </p>
          ),
        }))}
      />
    </MarketingSection>
  );
}

/** A direct way to Cédric on navy: a glass card, its icon in its colour. */
const direct =
  "flex min-h-18 items-center gap-4 rounded-lk-xl border border-white/12 bg-white/[0.06] p-4 text-white transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white md:p-5";

/**
 * #formulaire, on navy as in the V1: WhatsApp and email in glass cards (the
 * green and the blue of the V1 in their icons), the form beside them in its
 * white card (source « investir », V1 ids).
 */
export function InvestContactSection() {
  const c = t.contact;
  return (
    <MarketingSection
      id={FORM}
      tone="navy"
      look="showcase"
      eyebrow={c.eyebrow}
      title={c.title}
      lead={c.lead}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          <a
            href={whatsappHref(c.whatsapp.message)}
            target="_blank"
            rel="noopener noreferrer"
            className={direct}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lk-lg bg-lk-success-bg text-lk-success-fg">
              <MessageCircle aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-lk-caption text-white/72">{c.whatsapp.hint}</span>
              <span className="text-lk-body-lg font-semibold">{c.whatsapp.label}</span>
            </span>
          </a>
          <a
            href={emailHref(fr.legal.contactEmail, c.email.subject, c.email.body)}
            className={direct}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lk-lg bg-linear-135 from-lk-blue to-lk-blue-mid text-white">
              <Mail aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-lk-caption text-white/72">{c.email.hint}</span>
              <span className="text-lk-body-lg font-semibold">{c.email.label}</span>
            </span>
          </a>
          <p className="mt-1 text-center text-lk-caption text-white/72">{c.note}</p>
        </div>
        <ContactForm
          source="investir"
          formId="invest-form"
          idPrefix="if"
          motifs={MOTIFS}
          look="showcase"
        />
      </div>
    </MarketingSection>
  );
}

/** « … vous en faites partie ou pas ? » */
export function InvestCta() {
  return (
    <CtaPanel
      title={t.final.title}
      accent={t.final.accent}
      text={t.final.text}
      action={t.final.action}
      href={`#${FORM}`}
    />
  );
}
