import Link from "next/link";
import { FileText } from "lucide-react";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import type { ShownDocuments } from "../shown";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

const t = fr.assistant.sources;

/** Where a document shared with the buyer is on « Documents partagés ». */
export const sharedDocumentAnchor = (documentId: string) => `document-${documentId}`;

/**
 * Under an answer written from the documents shared with a buyer
 * (summarize_shared_documents, L3-07): the documents the assistant read,
 * by the name their seller gave them, each leading to its line of
 * « Documents partagés », where the buyer opens it with their own rights;
 * and what the answer is not. The names are plain text, the addresses are
 * built here from an id checked (shownDocuments), never taken as written.
 */
export function AssistantSources({ data }: { data: ShownDocuments }) {
  return (
    <section
      aria-label={t.title}
      className="flex w-full max-w-[min(100%,40rem)] flex-col gap-1 rounded-lk-md border border-lk-line bg-lk-surface px-3.5 py-3"
    >
      <p className="text-lk-caption font-semibold text-lk-ink-3">{t.title}</p>
      <ul className="flex flex-col">
        {data.items.map((item) => (
          <li key={item.id}>
            <Link
              href={`${ROUTES.buyerDocuments}#${sharedDocumentAnchor(item.id)}`}
              className="inline-flex min-h-11 items-center gap-1.5 text-lk-secondary font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
            >
              <FileText aria-hidden="true" className="size-4 shrink-0" />
              <span className="break-words">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-lk-caption text-pretty text-lk-ink-3">{t.note}</p>
    </section>
  );
}
