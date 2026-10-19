import { Check, Mail, MessageCircle } from "lucide-react";
import { BrandPanel } from "@/components/shared/brand-panel";
import { Button } from "@/components/shared/button";
import { FaqList } from "@/components/shared/faq-list";
import { MarketingSection } from "@/components/shared/marketing-section";
import { fr } from "@/lib/i18n/fr";
import type { ContactMotif } from "@/lib/validations/contact";
import { cn } from "@/lib/utils";
import { emailHref, whatsappHref } from "../contact-links";
import { ContactForm } from "./contact-form";
import { CtaPanel } from "./cta-panel";
import { RichText } from "./rich-text";
import { card, cardText, cardTitle, statement } from "./site-styles";
import { StagePill } from "./stage-pill";

// Sections of /investir (L1-43), in the order of the V1 page, rebuilt with
// the Façade components (DECISIONS 2026-10-19). Texts: fr.site.invest.

const t = fr.site.invest;
/** Anchor of the form, the one of the V1 page (links already shared). */
const FORM = "formulaire";
const MOTIFS: readonly ContactMotif[] = ["Investisseur", "Vendeur", "Partenaire", "Autre"];

/** « L'immobilier français se réinvente. Soyez-en. » */
export function InvestHero() {
  return (
    <BrandPanel title={t.hero.title} description={t.hero.lead} titleSize="hero" illustration>
      <Button asChild variant="inverse" size="lg">
        <a href={`#${FORM}`}>{t.hero.action}</a>
      </Button>
    </BrandPanel>
  );
}

/** What the owners pay the agencies, « Jusqu'ici. » */
export function HookSection() {
  return (
    <MarketingSection id="constat" title={t.hook.title}>
      <div className="flex max-w-lk-prose flex-col gap-2">
        <p className={statement}>
          <RichText parts={t.hook.text} strongClassName="text-lk-ink" />
        </p>
        <p className={cn(statement, "text-lk-blue")}>{t.hook.last}</p>
      </div>
    </MarketingSection>
  );
}

/** « Un marché gigantesque, figé depuis 30 ans. »: alone, or an agency. */
export function MarketSection() {
  return (
    <MarketingSection
      id="marche"
      tone="stone"
      title={t.market.title}
      lead={<RichText parts={t.market.lead} />}
    >
      <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
        <p className={cn(card, cardText)}>
          <RichText parts={t.market.alone} />
        </p>
        <p className="text-center text-lk-h3 font-semibold text-lk-ink-3">{t.market.or}</p>
        <p className={cn(card, cardText)}>
          <RichText parts={t.market.agency} />
        </p>
      </div>
      <div className="mt-10 flex max-w-lk-prose flex-col gap-3">
        <p className={statement}>
          <RichText parts={t.market.need} strongClassName="text-lk-ink" />
        </p>
        <p className={cardText}>{t.market.answer}</p>
      </div>
    </MarketingSection>
  );
}

/** « Un écosystème IA qui copilote la vente immobilière, de bout en bout. » */
export function VisionSection() {
  return (
    <MarketingSection id="vision" title={t.vision.title} lead={t.vision.lead}>
      <div className="flex max-w-lk-prose flex-col gap-4">
        <p className="text-lk-body font-semibold text-pretty text-lk-ink lg:text-lk-body-lg">
          {t.vision.statement}
        </p>
        <p className={cardText}>
          <RichText parts={t.vision.steps} />
        </p>
        <p className="border-l-2 border-lk-blue pl-4 text-lk-body text-pretty text-lk-ink">
          {t.vision.goal}
        </p>
      </div>
      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {t.vision.items.map((item) => (
          <li key={item.title} className={card}>
            <h3 className={cardTitle}>{item.title}</h3>
            <p className={cn(cardText, "mt-2")}>{item.text}</p>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

/** « Ce n'est pas une idée. C'est un projet construit. »: the milestones. */
export function ProgressSection() {
  return (
    <MarketingSection id="avancement" tone="stone" title={t.progress.title}>
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {t.progress.items.map((item) => (
          <li key={item.title} className={cn(card, "flex flex-col gap-2")}>
            <div className="flex items-start justify-between gap-3">
              <h3 className={cardTitle}>{item.title}</h3>
              <StagePill stage={item.status} className="mt-0.5 shrink-0" />
            </div>
            <p className={cardText}>{item.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 max-w-lk-prose text-lk-body text-pretty text-lk-ink-2 lg:text-lk-body-lg">
        <RichText parts={t.progress.closing} />
      </p>
    </MarketingSection>
  );
}

/** « Un modèle simple, rentable dès le premier client. »: the three sources. */
export function ModelSection() {
  return (
    <MarketingSection id="modele" title={t.model.title}>
      <ul className="grid gap-4 lg:grid-cols-3">
        {t.model.items.map((item) => (
          <li key={item.title} className={cn(card, "flex flex-col gap-2")}>
            <div className="flex items-start justify-between gap-3">
              <h3 className={cardTitle}>{item.title}</h3>
              {"status" in item ? (
                <StagePill stage={item.status} className="mt-0.5 shrink-0" />
              ) : null}
            </div>
            <p className={cardText}>{item.text}</p>
            <p className="mt-auto pt-2 text-lk-caption font-semibold text-lk-blue">{item.tag}</p>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

/** « La fenêtre est ouverte. Elle ne le sera pas toujours. » */
export function TimingSection() {
  return (
    <MarketingSection id="timing" tone="stone" title={t.timing.title}>
      <ul className="grid gap-4 lg:grid-cols-3">
        {t.timing.items.map((item) => (
          <li key={item.title} className={cn(card, "flex flex-col gap-2")}>
            <h3 className={cardTitle}>{item.title}</h3>
            <p className={cardText}>{item.text}</p>
            <p className="text-lk-body font-semibold text-pretty text-lk-ink">{item.point}</p>
          </li>
        ))}
      </ul>
      <p className={cn(statement, "mt-10")}>{t.timing.closing}</p>
    </MarketingSection>
  );
}

/** « Une construction méthodique, étape par étape. »: now, tomorrow, after. */
export function RoadmapSection() {
  return (
    <MarketingSection id="feuille-de-route" title={t.roadmap.title}>
      <ol className="grid gap-4 lg:grid-cols-3">
        {t.roadmap.items.map((phase) => (
          <li key={phase.title} className={cn(card, "flex flex-col gap-2")}>
            <p className="text-lk-caption font-semibold text-lk-blue">{phase.when}</p>
            <h3 className={cardTitle}>{phase.title}</h3>
            <ul className="mt-1 flex flex-col gap-2">
              {phase.list.map((line) => (
                <li key={line} className="flex gap-2 text-lk-compact text-lk-ink-2">
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

/** « Pourquoi les bons rejoignent Leenkey maintenant. » */
export function ReasonsSection() {
  return (
    <MarketingSection id="pourquoi" tone="stone" title={t.reasons.title}>
      <ul className="grid gap-4 md:grid-cols-2">
        {t.reasons.items.map((item) => (
          <li key={item.title} className={card}>
            <h3 className={cardTitle}>{item.title}</h3>
            <p className={cn(cardText, "mt-2")}>{item.text}</p>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

/** The word of Leenkey to its future partners, then the way to the form. */
export function MessageSection() {
  return (
    <div className="bg-lk-surface">
      <div className="mx-auto flex max-w-lk-page flex-col gap-4 px-5 py-12 md:px-10 lg:py-18">
        <blockquote className={cn(statement, "max-w-lk-prose")}>
          <p>
            <RichText parts={t.message.quote} strongClassName="text-lk-blue" />
          </p>
        </blockquote>
        <div className="flex max-w-lk-prose flex-col gap-3">
          {t.message.paragraphs.map((paragraph) => (
            <p key={paragraph} className={cardText}>
              {paragraph}
            </p>
          ))}
        </div>
        <Button asChild size="lg" className="mt-2 self-start">
          <a href={`#${FORM}`}>{t.message.action}</a>
        </Button>
      </div>
    </div>
  );
}

/** « Vos questions méritent des réponses claires. » */
export function InvestFaqSection() {
  return (
    <MarketingSection id="questions" tone="stone" title={t.faq.title}>
      <FaqList
        items={t.faq.items.map((item) => ({
          question: item.question,
          answer: <RichText parts={item.answer} />,
        }))}
      />
    </MarketingSection>
  );
}

const direct =
  "flex min-h-16 items-center gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4 hover:border-lk-blue";

/** #formulaire: WhatsApp, email, or the form (source « investir », V1 ids). */
export function InvestContactSection() {
  const c = t.contact;
  return (
    <MarketingSection id={FORM} title={c.title} lead={c.lead}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-10">
        <div className="flex flex-col gap-3">
          <a
            href={whatsappHref(c.whatsapp.message)}
            target="_blank"
            rel="noopener noreferrer"
            className={direct}
          >
            <MessageCircle aria-hidden="true" className="size-6 shrink-0 text-lk-blue" />
            <span className="flex flex-col">
              <span className="text-lk-caption text-lk-ink-3">{c.whatsapp.hint}</span>
              <span className="text-lk-body font-semibold text-lk-ink">{c.whatsapp.label}</span>
            </span>
          </a>
          <a
            href={emailHref(fr.legal.contactEmail, c.email.subject, c.email.body)}
            className={direct}
          >
            <Mail aria-hidden="true" className="size-6 shrink-0 text-lk-blue" />
            <span className="flex flex-col">
              <span className="text-lk-caption text-lk-ink-3">{c.email.hint}</span>
              <span className="text-lk-body font-semibold text-lk-ink">{c.email.label}</span>
            </span>
          </a>
          <p className="text-lk-caption text-lk-ink-3">{c.note}</p>
        </div>
        <ContactForm source="investir" formId="invest-form" idPrefix="if" motifs={MOTIFS} />
      </div>
    </MarketingSection>
  );
}

/** « … vous en faites partie ou pas ? » */
export function InvestCta() {
  return (
    <CtaPanel title={t.final.title} text={t.final.text} action={t.final.action} href={`#${FORM}`} />
  );
}
