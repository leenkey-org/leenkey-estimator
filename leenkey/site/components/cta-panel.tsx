import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Accented } from "@/components/shared/accented";
import { Button } from "@/components/shared/button";
import { cn } from "@/lib/utils";

/**
 * Last call to action of a public page (« cta-final », L1-49, L1-50), in the
 * charte D since L1-58: the night of the final banner of the home page with
 * its halos and a grid of dots, the title (its accent in the gradient of the
 * night) and its text centred, the action in the gradient with its arrow, a
 * second one of glass beside it, the note under them with a shield. Light:
 * the white one of « Qui sommes-nous », its accent in the gradient, the
 * second action in the blue outline.
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
  /** The highlighted words of the title, in the gradient. */
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
          <Accented
            text={title}
            accent={accent}
            className={light ? "lk-text-grad" : "lk-text-grad-light"}
          />
        </Title>
        <p
          className={cn(
            "mt-4 max-w-lk-prose text-lk-body-lg text-pretty lg:text-lk-lead-lg",
            light ? "text-lk-ink-2" : "text-lk-night-muted",
          )}
        >
          {text}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 md:flex-row">
          <Button
            asChild
            variant="cta"
            size="lg"
            trailingIcon={ArrowRight}
            // On the night and its halos, the focus ring turns white (the blue of
            // the charte keeps 3.5:1 there, white more).
            className={light ? undefined : "focus-visible:outline-white"}
          >
            <Link href={href}>{action}</Link>
          </Button>
          {secondary ? (
            <Button
              asChild
              variant={light ? "secondary" : "night"}
              size="lg"
              className={light ? undefined : "focus-visible:outline-white"}
            >
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          ) : null}
        </div>
        {note ? (
          // The shield in the line: on two lines, it stays before the first word.
          <p
            className={cn(
              "mt-5 text-lk-secondary text-balance",
              light ? "text-lk-ink-3" : "text-lk-night-muted",
            )}
          >
            <ShieldCheck aria-hidden="true" className="mr-2 inline size-4 align-[-0.1875em]" />
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}
