import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Accented } from "@/components/shared/accented";
import { Button } from "@/components/shared/button";
import { StillAccent } from "@/components/shared/hero-title";
import { cn } from "@/lib/utils";

/**
 * Last call to action of a public page, the V1 one (« cta-final », L1-49,
 * L1-50): the brand blue in its gradient with a white glow behind the title
 * and a grid of dots, the title (its accent over the dimension line) and its
 * text centred, the action in white with its arrow, a second one in a white
 * outline beside it, the note under them with a shield. Light: the white one
 * of the V1 « Qui sommes-nous », its accent in the blue gradient, the action
 * in the gradient, the second one in the blue outline.
 */
export function CtaPanel({
  id = "cta-final",
  tone = "blue",
  title,
  accent,
  text,
  action,
  href,
  secondary,
  note,
  titleAs: Title = "h2",
}: {
  /** Prefix of the id of the title, which names the section. */
  id?: string;
  /** HTML level of the title: h2 after the sections of a page, lower in /design. */
  titleAs?: "h2" | "h3" | "h4";
  tone?: "blue" | "light";
  title: string;
  /** The highlighted words of the V1 title, over the dimension line. */
  accent?: string;
  text: string;
  action: string;
  href: string;
  /** A second way (« Valoriser mon bien gratuitement » of /qui-sommes-nous). */
  secondary?: { label: string; href: string };
  note?: string;
}) {
  const titleId = `${id}-titre`;
  const light = tone === "light";
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "relative isolate overflow-hidden",
        light ? "bg-lk-surface text-lk-ink" : "lk-cta-bg text-white",
      )}
    >
      {light ? null : (
        <div
          aria-hidden="true"
          className="lk-dots-round pointer-events-none absolute inset-0 -z-10"
        />
      )}
      <div
        data-reveal=""
        className="mx-auto flex max-w-lk-heading flex-col items-center px-5 py-16 text-center md:px-10 lg:py-24"
      >
        <Title
          id={titleId}
          className="text-lk-h1-lg font-bold text-wide text-balance md:text-lk-section-lg lg:text-lk-showcase"
        >
          {light ? (
            <Accented text={title} accent={accent} className="lk-text-grad" />
          ) : (
            <StillAccent text={title} accent={accent} />
          )}
        </Title>
        <p
          className={cn(
            "mt-4 max-w-lk-prose text-lk-body-lg text-pretty lg:text-lk-lead-lg",
            light && "text-lk-ink-2",
          )}
        >
          {text}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 md:flex-row">
          <Button
            asChild
            variant={light ? "cta" : "inverse"}
            size="lg"
            trailingIcon={ArrowRight}
            className={light ? undefined : "shadow-lk-raised"}
          >
            <Link href={href}>{action}</Link>
          </Button>
          {secondary ? (
            <Button asChild variant={light ? "secondary" : "outline-inverse"} size="lg">
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          ) : null}
        </div>
        {note ? (
          // The shield in the line: on two lines, it stays before the first word.
          <p className={cn("mt-5 text-lk-secondary text-balance", light && "text-lk-ink-3")}>
            <ShieldCheck aria-hidden="true" className="mr-2 inline size-4 align-[-0.1875em]" />
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}
