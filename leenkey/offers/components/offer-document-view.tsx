import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentBlock, OfferDocument } from "../document";

/**
 * The document of an offer on the screen (docs/DESIGN.md 13.3, « Relecture »):
 * white, line border, padding 24, text of 14 px, a title per section. The
 * same content as the PDF (leenkey/offers/document.ts).
 */
export function OfferDocumentView({
  document,
  className,
}: {
  document: OfferDocument;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col gap-6 rounded-lk-md border border-lk-line bg-lk-surface p-6 text-lk-secondary text-lk-ink",
        className,
      )}
    >
      <header className="flex flex-col gap-1 border-b-2 border-lk-blue pb-4">
        <h2 className="text-lk-h3 font-bold text-wide text-lk-ink">{document.title}</h2>
        {document.meta.map((line) => (
          <p key={line} className="text-lk-caption text-lk-ink-2 tabular">
            {line}
          </p>
        ))}
      </header>
      {document.sections.map((section) => (
        <section key={section.number} className="flex flex-col gap-2.5">
          <h3 className="text-lk-body font-bold text-lk-ink">
            {section.number}. {section.title}
          </h3>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
      <aside className="flex flex-col gap-2 rounded-lk-md border-[1.5px] border-lk-blue bg-lk-blue-tint p-4 text-lk-navy">
        <h3 className="text-lk-body font-bold">{document.notice.title}</h3>
        {document.notice.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-pretty">
            {paragraph}
          </p>
        ))}
      </aside>
    </article>
  );
}

function Block({ block }: { block: DocumentBlock }) {
  switch (block.kind) {
    case "rows":
      return (
        <dl className="flex flex-col gap-1.5">
          {block.rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
              <dt className="text-lk-ink-3">{row.label}</dt>
              <dd className="font-medium break-words text-lk-ink tabular">{row.value}</dd>
            </div>
          ))}
        </dl>
      );
    case "subtitle":
      return <h4 className="mt-1.5 font-semibold text-lk-ink">{block.text}</h4>;
    case "strong":
      return <p className="text-lk-h3 font-bold text-wide text-lk-ink tabular">{block.text}</p>;
    case "checks":
      return (
        <ul className="flex flex-col gap-1.5">
          {block.items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check
                aria-hidden="true"
                strokeWidth={3}
                className="mt-0.5 size-3.5 shrink-0 text-lk-blue"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "text":
      return <p className="text-pretty text-lk-ink-2">{block.text}</p>;
  }
}
