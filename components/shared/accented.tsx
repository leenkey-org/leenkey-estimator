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
  const at = accent ? text.lastIndexOf(accent) : -1;
  if (!accent || at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className={className}>{accent}</span>
      {text.slice(at + accent.length)}
    </>
  );
}
