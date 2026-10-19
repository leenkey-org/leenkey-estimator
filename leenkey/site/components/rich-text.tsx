// A text of fr.site with its bold parts: « La formule », { strong: « Autonomie
// est gratuite » }, « pendant… ».

export type Rich = readonly (string | { readonly strong: string })[];

export function RichText({
  parts,
  strongClassName = "font-semibold text-lk-ink",
}: {
  parts: Rich;
  /** Style of the bold parts: ink 600 by default. */
  strongClassName?: string;
}) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          part
        ) : (
          <strong key={index} className={strongClassName}>
            {part.strong}
          </strong>
        ),
      )}
    </>
  );
}
