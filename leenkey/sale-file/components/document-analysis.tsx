import { Sparkles } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import type { DocumentType } from "@/lib/config/documents";
import { formatDay } from "@/lib/format";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { cn } from "@/lib/utils";
import {
  publicFactLines,
  type BuyerSummary,
  type PublicFactLine,
  type SellerAnalysis,
} from "../analysis-view";
import type { PublicDocumentFacts as PublicFacts } from "../public-facts";
import { PublicFactsButton, RetryAnalysisButton } from "./analysis-controls";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.analysis;

// The reading aid of a document (L3-05, SPEC-V2 15) as its seller, a buyer
// it is shared with and the visitors of the listing read it. Plain text
// only: what the assistant wrote is never rendered as markup. The permanent
// mention stays under every summary.

const box = "flex flex-col gap-2.5 rounded-lk-md border border-lk-line px-3.5 py-3";
const caption = "text-lk-caption text-pretty text-lk-ink-3";

function Mention() {
  return <p className={caption}>{t.mention}</p>;
}

function Heading() {
  return (
    <p className="flex items-center gap-1.5 text-lk-secondary font-semibold text-lk-ink">
      <Sparkles aria-hidden="true" className="size-4 shrink-0 text-lk-blue" />
      {t.title}
    </p>
  );
}

/** The facts and the points read in a document, the same for its seller and for a buyer. */
function Findings({
  date,
  summary,
  keyFacts,
  points,
}: {
  date: string | null;
  summary: string;
  keyFacts: readonly { label: string; value: string }[];
  points: readonly { level: "info" | "attention"; text: string }[];
}) {
  return (
    <>
      {date ? <p className={caption}>{t.documentDate(formatDay(date))}</p> : null}
      <p className="text-lk-secondary text-pretty text-lk-ink-2">{summary}</p>
      {keyFacts.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-lk-caption font-semibold text-lk-ink">{t.facts}</p>
          <dl className="flex flex-col gap-1 text-lk-caption">
            {keyFacts.map((fact, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="shrink-0 text-lk-ink-3 sm:w-2/5">{fact.label}</dt>
                <dd className="min-w-0 text-lk-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {points.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-lk-caption font-semibold text-lk-ink">{t.points}</p>
          <ul className="flex flex-col gap-1 text-lk-caption text-lk-ink-2">
            {points.map((point, index) => (
              <li key={index}>
                <span
                  className={cn(
                    "font-semibold",
                    point.level === "attention" ? "text-lk-warning-fg" : "text-lk-ink",
                  )}
                >
                  {t.levels[point.level]} :
                </span>{" "}
                {point.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function FactLines({ lines }: { lines: readonly PublicFactLine[] }) {
  return (
    <dl className="flex flex-col gap-1 text-lk-caption">
      {lines.map((line) => (
        <div key={line.key} className="flex flex-col sm:flex-row sm:gap-2">
          <dt className="shrink-0 text-lk-ink-3 sm:w-2/5">{line.label}</dt>
          <dd className="min-w-0 text-lk-ink">{line.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Under a document of the seller: its analysis being written, written, or why there is none. */
export function SellerDocumentAnalysis({
  propertyId,
  document,
}: {
  propertyId: string;
  document: { id: string; type: DocumentType; title: string; analysis: SellerAnalysis | null };
}) {
  const state = document.analysis;
  if (!state) return null;
  if (state.status === "pending") {
    // The page reads itself again while an analysis is being written (one
    // AnalysisRefresher for the whole tab); after a while, it says so plainly.
    return <p className={caption}>{state.delayed ? t.delayed : t.pending}</p>;
  }
  if (state.status === "failed" || !state.analysis) {
    return (
      <InlineAlert
        tone={state.error === "not_started" ? "info" : "warning"}
        live={false}
        action={
          state.retriesLeft > 0 ? (
            <RetryAnalysisButton
              propertyId={propertyId}
              documentId={document.id}
              title={document.title}
              first={state.error === "not_started"}
            />
          ) : null
        }
      >
        {t.failed[state.error ?? "unavailable"]}
      </InlineAlert>
    );
  }
  const { analysis } = state;
  const lines =
    analysis.quality === "ok" ? publicFactLines(document.type, analysis.public_facts) : [];
  return (
    <div className={box}>
      {analysis.quality !== "ok" ? (
        <InlineAlert tone="warning" live={false}>
          {analysis.quality === "wrong_type"
            ? t.quality.wrong_type(fr.saleFile.types[document.type])
            : t.quality[analysis.quality]}{" "}
          {analysis.quality_note ? `${analysis.quality_note} ` : null}
          {analysis.quality === "wrong_type" &&
          analysis.type_detected === "ddt" &&
          document.type !== "ddt"
            ? t.quality.ddtHint
            : t.quality.help}
        </InlineAlert>
      ) : null}
      <Heading />
      <Findings
        date={analysis.date}
        summary={analysis.summary_seller}
        keyFacts={analysis.key_facts}
        points={analysis.points_of_attention}
      />
      <details className="text-lk-caption text-lk-ink-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-lk-blue-dark underline-offset-4 hover:underline">
          {t.buyerSummary}
        </summary>
        <p className="text-pretty">{analysis.summary_buyer}</p>
      </details>
      {lines.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-lk-line pt-2.5">
          <p className="text-lk-caption font-semibold text-lk-ink">
            {state.publicFactsShown ? t.publicFacts.shown : t.publicFacts.title}
          </p>
          <FactLines lines={lines} />
          <p className={caption}>{t.publicFacts.help}</p>
          <PublicFactsButton
            propertyId={propertyId}
            documentId={document.id}
            title={document.title}
            shown={state.publicFactsShown}
          />
        </div>
      ) : null}
      <Mention />
    </div>
  );
}

/** Under a document shared with a buyer: the summary meant for them. */
export function BuyerDocumentSummary({ summary }: { summary: BuyerSummary }) {
  return (
    <div className={box}>
      <Heading />
      <Findings
        date={summary.date}
        summary={summary.summary}
        keyFacts={summary.keyFacts}
        points={summary.points}
      />
      <Mention />
    </div>
  );
}

/**
 * On the public page of a listing, in « Ce que vous savez avant de visiter »:
 * the facts its seller chose to show, by document. Nothing without a fact.
 */
export function PublicDocumentFacts({ groups }: { groups: readonly PublicFacts[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="mt-6 flex flex-col gap-3">
      <h3 className="text-lk-body font-semibold text-lk-ink">{t.listing.title}</h3>
      <p className={caption}>{t.listing.intro}</p>
      <ul className="flex flex-col divide-y divide-lk-line overflow-hidden rounded-lk-md border border-lk-line">
        {groups.map((group, index) => (
          <li key={index} className="flex flex-col gap-1.5 px-3.5 py-3">
            <FactLines lines={group.lines} />
            <p className={caption}>{t.listing.source(fr.saleFile.types[group.type])}</p>
          </li>
        ))}
      </ul>
      <Mention />
    </div>
  );
}
