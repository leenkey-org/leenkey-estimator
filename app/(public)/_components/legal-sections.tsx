import { InlineAlert } from "@/components/shared/inline-alert";
import { RichText } from "@/leenkey/site/components/rich-text";
import type { LegalBlock, LegalSection } from "@/lib/i18n/legal-texts";

const text = "text-lk-body text-pretty text-lk-ink-2";

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className={text}>
          <RichText parts={block.text} />
        </p>
      );
    case "subtitle":
      return <h3 className="mt-2 text-lk-body font-semibold text-lk-ink">{block.text}</h3>;
    case "list":
      return (
        <ul className={`flex list-disc flex-col gap-1.5 pl-5 marker:text-lk-ink-3 ${text}`}>
          {block.items.map((item, index) => (
            <li key={index}>
              <RichText parts={item} />
            </li>
          ))}
        </ul>
      );
    case "box":
      return (
        <div className="flex flex-col gap-1 rounded-lk-md bg-lk-stone-2 p-4">
          {block.lines.map((line, index) => (
            <p key={index} className={text}>
              <RichText parts={line} />
            </p>
          ))}
        </div>
      );
    case "important":
      return (
        <InlineAlert tone="warning" live={false}>
          <RichText parts={block.text} strongClassName="font-semibold" />
        </InlineAlert>
      );
  }
}

/**
 * Numbered sections of a legal text (G10, docs/DESIGN.md 11): an h2 per
 * section with its anchor, paragraphs, lists and identity tiles; with `toc`,
 * the list of the sections first, as links.
 */
export function LegalSections({
  sections,
  toc,
}: {
  sections: readonly LegalSection[];
  /** Title of the table of contents (« Sommaire »). */
  toc?: string;
}) {
  return (
    <>
      {toc ? (
        <nav aria-labelledby="sommaire" className="rounded-lk-md border border-lk-line p-4">
          <h2 id="sommaire" className="text-lk-label font-semibold text-lk-ink">
            {toc}
          </h2>
          <ol className="mt-2 flex flex-col gap-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-8 items-center rounded-lk-sm text-lk-secondary text-lk-ink-2 underline-offset-2 hover:text-lk-ink hover:underline focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-titre`}
          className="flex scroll-mt-6 flex-col gap-3"
        >
          <h2
            id={`${section.id}-titre`}
            className="text-lk-h3 font-semibold text-balance text-lk-ink lg:text-lk-h3-lg"
          >
            {section.title}
          </h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
    </>
  );
}
