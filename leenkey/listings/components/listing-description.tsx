"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.listing.description;

/**
 * Description of the listing (SPEC-V2 8.5, docs/DESIGN.md 12.7): folded to
 * six lines on mobile with « Lire la suite » when it is longer, in full from
 * 1024 px. The line breaks of the seller are kept.
 */
export function ListingDescription({ text }: { text: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <p
        ref={ref}
        id={id}
        className={cn(
          "whitespace-pre-line text-lk-compact leading-relaxed text-lk-ink lg:max-w-lk-prose",
          !expanded && "line-clamp-6 lg:line-clamp-none",
        )}
      >
        {text}
      </p>
      {overflows || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
          className="self-start rounded-lk-sm py-1 text-lk-label font-semibold text-lk-blue underline underline-offset-2 hover:no-underline lg:hidden"
        >
          {expanded ? t.less : t.more}
        </button>
      ) : null}
    </>
  );
}
