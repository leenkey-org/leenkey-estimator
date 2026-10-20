import type { CSSProperties, ReactNode } from "react";
import { FacadeDrawing } from "./facade-drawing";
import { cn } from "@/lib/utils";

export type BrandPanelProps = {
  /** Anchor of the panel (« #valoriser » on the home page). */
  id?: string;
  /** blue: buyer home, end of a flow; navy: dark headers. */
  variant?: "blue" | "navy";
  title: string;
  /**
   * The words of the title with the dimension line of the brand drawing
   * under them (« votre vente. »), as the V1 titles set them apart.
   */
  titleAccent?: string;
  /** HTML level, set by the page outline: h1 when the panel heads the page. */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  /**
   * hero: display 36, 44 then 56 px, text 15 then 16 px and more room
   * (public pages, DESIGN.md 13.1), rising into place word by word on the
   * first paint; page: display 36 px (buyer home, 36 to 44 px in DESIGN.md
   * 12.10).
   */
  titleSize?: "hero" | "page";
  description?: string;
  /**
   * facade.svg on the right, white at 55 %, from 1024 px; it traces itself
   * on the first paint (hero) or when it enters the screen.
   */
  illustration?: boolean;
  /** Actions or content under the description. */
  children?: ReactNode;
  className?: string;
};

/** Entrance of a hero (DESIGN.md 9): one word every 45 ms, then the rest. */
const FIRST_WORD_MS = 80;
const WORD_MS = 45;
const NEXT_MS = 120;
/** The dimension line is traced once its words have risen. */
const COTE_MS = 250;

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

/**
 * Brand flat (docs/DESIGN.md 10.6): full width, square corners, display title
 * in white. A card may overlap its bottom edge; the overlap separates it, no
 * shadow needed.
 */
export function BrandPanel({
  id,
  variant = "blue",
  title,
  titleAccent,
  titleAs: Title = "h1",
  titleSize = "hero",
  description,
  illustration = false,
  children,
  className,
}: BrandPanelProps) {
  const hero = titleSize === "hero";
  const words = hero ? heroTitle(title, titleAccent) : null;
  const last = words?.last ?? 0;
  return (
    <section
      id={id}
      className={cn(
        "relative overflow-hidden text-white",
        variant === "blue" ? "bg-lk-blue" : "bg-lk-navy",
        className,
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex min-h-52.5 max-w-lk-page flex-col justify-center px-5 md:px-10",
          hero ? "py-12 lg:py-20" : "py-8",
        )}
      >
        <div
          className={cn(
            "flex max-w-lk-prose flex-col",
            // Room for the dimension line under the title of a hero.
            hero ? "gap-4 lg:gap-5" : "gap-2",
            illustration && "lg:max-w-lk-form",
          )}
        >
          <Title
            className={cn(
              "text-lk-display font-bold text-wide",
              hero && "md:text-lk-display-md lg:text-lk-display-lg",
            )}
          >
            {words ? words.content : <Accent text={title} accent={titleAccent} />}
          </Title>
          {description ? (
            <p
              style={hero ? delay(last + NEXT_MS) : undefined}
              className={cn(
                hero ? "lk-rise text-lk-body text-pretty lg:text-lk-body-lg" : "text-lk-compact",
                variant === "blue" ? "text-lk-on-blue-2" : "text-white/72",
              )}
            >
              {description}
            </p>
          ) : null}
          {children ? (
            <div
              style={hero ? delay(last + 2 * NEXT_MS) : undefined}
              className={cn("mt-4", hero && "lk-rise")}
            >
              {children}
            </div>
          ) : null}
        </div>
        {illustration ? (
          <FacadeDrawing
            data-reveal-draw={hero ? undefined : ""}
            className={cn(
              "lk-drawing pointer-events-none absolute bottom-0 right-10 hidden h-52.5 w-95 opacity-55 lg:block",
              hero && "lk-drawing-in",
            )}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * Title of a hero, word by word: each one rises a little after the previous
 * one (the « lk-word » of the V1 home page, without its blur), the accent in
 * one piece with its dimension line. `last`: delay of the last word.
 */
function heroTitle(text: string, accent?: string): { content: ReactNode; last: number } {
  const at = accent ? text.lastIndexOf(accent) : -1;
  const pieces: Array<string | { accent: string }> =
    accent && at !== -1
      ? [...wordsOf(text.slice(0, at)), { accent }, ...wordsOf(text.slice(at + accent.length))]
      : wordsOf(text);
  let last = FIRST_WORD_MS - WORD_MS;
  const content = pieces.map((piece, index) => {
    last += WORD_MS;
    // The spaces stay between the words: the title still wraps and balances.
    const space = index < pieces.length - 1 ? " " : null;
    return (
      <span key={index}>
        {typeof piece === "string" ? (
          <span className="lk-rise inline-block" style={delay(last)}>
            {piece}
          </span>
        ) : (
          <span className="lk-rise relative inline-block whitespace-nowrap" style={delay(last)}>
            {piece.accent}
            <CoteLine delayMs={last + COTE_MS} />
          </span>
        )}
        {space}
      </span>
    );
  });
  return { content, last };
}

/** The words of a text, without its spaces (a non-breaking one keeps two words together). */
function wordsOf(text: string): string[] {
  return text.split(" ").filter(Boolean);
}

/** A title out of a hero: its accent with the dimension line, without the entrance. */
function Accent({ text, accent }: { text: string; accent?: string }) {
  const at = accent ? text.lastIndexOf(accent) : -1;
  if (!accent || at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="relative inline-block whitespace-nowrap">
        {accent}
        <CoteLine delayMs={0} />
      </span>
      {text.slice(at + accent.length)}
    </>
  );
}

/** The dimension line of facade.svg under the accent: two ticks and the line between them. */
function CoteLine({ delayMs }: { delayMs: number }) {
  return (
    <span
      aria-hidden="true"
      style={delay(delayMs)}
      className="lk-cote pointer-events-none absolute inset-x-0 -bottom-[0.12em] flex h-[0.2em] items-center"
    >
      <span style={delay(delayMs)} className="lk-cote-line block w-full" />
    </span>
  );
}
