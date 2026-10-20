/** `text` cut around `accent`, the last time it appears; null when absent or not in it. */
export function splitAccent(
  text: string,
  accent?: string,
): { before: string; accent: string; after: string } | null {
  const at = accent ? text.lastIndexOf(accent) : -1;
  if (!accent || at === -1) return null;
  return { before: text.slice(0, at), accent, after: text.slice(at + accent.length) };
}

/**
 * A title with a few words set apart, the highlighted words of the V1 titles
 * (« Où en êtes-vous dans votre vente ? », DECISIONS 2026-10-20): `accent`,
 * the last time it appears in `text`, in a span of its own. The text as it
 * is when the accent is absent or not in it.
 */
export function Accented({
  text,
  accent,
  className,
}: {
  text: string;
  accent?: string;
  className: string;
}) {
  const parts = splitAccent(text, accent);
  if (!parts) return text;
  return (
    <>
      {parts.before}
      <span className={className}>{parts.accent}</span>
      {parts.after}
    </>
  );
}
