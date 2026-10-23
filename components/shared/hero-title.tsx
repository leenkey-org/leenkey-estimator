import type { CSSProperties, ReactNode } from "react";
import { splitAccent } from "./accented";
import { cn } from "@/lib/utils";

// The display title of a hero, word by word (BrandPanel, the hero of the home
// page): the « lk-word » entrance of the V1 home page, without its blur, and
// the dimension line of facade.svg under its accent (DESIGN.md 9).

/** Entrance of a hero (DESIGN.md 9): one word every 45 ms, then the rest. */
const FIRST_WORD_MS = 80;
const WORD_MS = 45;
/** What follows the title (its text, then its actions), one after the other. */
export const NEXT_MS = 120;
/** The dimension line is traced once its words have risen. */
const COTE_MS = 250;
/**
 * Longest accent under the dimension line, in one piece (it never wraps):
 * « votre vente. » fits a 390 px screen at 36 px. A longer one gets a line
 * under each of its lines instead (« enfin simple, humaine et transparente. »).
 */
const COTE_MAX = 14;

export const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

export type AccentStyle = {
  /** Classes of the accent itself (« lk-text-grad-light », L1-49). */
  accentClassName?: string;
  /** Colour of its dimension line when the accent has no plain colour. */
  lineClassName?: string;
  /** Colour of the line under each line of a long accent, in the same case. */
  decorationClassName?: string;
};

/**
 * Title of a hero, word by word: each one rises a little after the previous
 * one; a short accent rises in one piece with its dimension line, a long one
 * fades in with its line once the words are there. `last`: delay of the last
 * piece, after which the rest of the hero follows.
 */
export function heroTitle(
  text: string,
  accent?: string,
  style: AccentStyle = {},
): { content: ReactNode; last: number } {
  const parts = splitAccent(text, accent);
  const pieces: Array<string | { accent: string }> = parts
    ? [...wordsOf(parts.before), { accent: parts.accent }, ...wordsOf(parts.after)]
    : wordsOf(text);
  let last = FIRST_WORD_MS - WORD_MS;
  const content = pieces.map((piece, index) => {
    last += WORD_MS;
    // The spaces stay between the words: the title still wraps and balances.
    const space = index < pieces.length - 1 ? " " : null;
    let word: ReactNode;
    if (typeof piece === "string") {
      word = (
        <span className="lk-rise inline-block" style={delay(last)}>
          {piece}
        </span>
      );
    } else if (piece.accent.length <= COTE_MAX) {
      word = (
        <span className="lk-rise relative inline-block whitespace-nowrap" style={delay(last)}>
          <span className={style.accentClassName}>{piece.accent}</span>
          <CoteLine delayMs={last + COTE_MS} className={style.lineClassName} />
        </span>
      );
    } else {
      word = (
        <span
          className={cn("lk-cote-wrap lk-enter", style.accentClassName, style.decorationClassName)}
          style={delay(last)}
        >
          {piece.accent}
        </span>
      );
    }
    return (
      <span key={index}>
        {word}
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

/** A title out of a hero: its accent with the dimension line, drawn as it is. */
export function StillAccent({ text, accent }: { text: string; accent?: string }) {
  const parts = splitAccent(text, accent);
  if (!parts) return text;
  return (
    <>
      {parts.before}
      {parts.accent.length <= COTE_MAX ? (
        <span className="relative inline-block whitespace-nowrap">
          {parts.accent}
          <CoteLine still />
        </span>
      ) : (
        <span className="lk-cote-wrap">{parts.accent}</span>
      )}
      {parts.after}
    </>
  );
}

/**
 * The dimension line of facade.svg under a short accent: two ticks and the
 * line between them, traced after `delayMs` (`still`: drawn as it is).
 */
function CoteLine({
  delayMs = 0,
  still = false,
  className,
}: {
  delayMs?: number;
  still?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={still ? undefined : delay(delayMs)}
      className={cn(
        "lk-cote pointer-events-none absolute inset-x-0 -bottom-[0.12em] flex h-[0.2em] items-center",
        still && "lk-cote-still",
        className,
      )}
    >
      <span style={still ? undefined : delay(delayMs)} className="lk-cote-line block w-full" />
    </span>
  );
}
