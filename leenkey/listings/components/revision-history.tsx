import { formatDateTime, formatPrice } from "@/lib/format";
import { frListingRevisions } from "@/lib/i18n/sections/listingRevisions";
import { priceChangePct, type ListingRevision, type RevisionChange } from "../revision";
import type { RevisionsResult } from "../revisions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { listingRevisions: frListingRevisions } as const;

const t = fr.listingRevisions;

// The history of a listing online (L1-35, SPEC-V2 8.3): a chronological list
// « field · old → new value », the most recent first, no visual diff. The
// description, long, opens on demand. Same list for the seller (tab Annonce)
// and the team (page of the listing in the back office).

const price = (value: number | null) => (value === null ? t.none : formatPrice(value));
const quoted = (value: string | null) => (value === null ? t.noCaption : t.quoted(value));

function Line({ change }: { change: RevisionChange }) {
  switch (change.kind) {
    case "price": {
      const pct = priceChangePct(change.oldCents, change.newCents);
      return (
        <>
          <span className="font-semibold">{t.price}</span>
          {" · "}
          <span className="tabular-nums">
            {t.change(price(change.oldCents), price(change.newCents))}
          </span>
          {pct !== null && pct !== 0 ? (
            <span className="text-lk-ink-3 tabular-nums"> ({t.pct(pct)})</span>
          ) : null}
        </>
      );
    }
    case "title":
      return (
        <>
          <span className="font-semibold">{t.title}</span>
          {" · "}
          {t.change(t.quoted(change.old ?? ""), t.quoted(change.new ?? ""))}
        </>
      );
    case "description":
      return <span className="font-semibold">{t.description}</span>;
    case "photoAdded":
      return (
        <>
          <span className="font-semibold">{t.photoAdded}</span>
          {change.caption ? <> · {t.quoted(change.caption)}</> : null}
        </>
      );
    case "photoRemoved":
      return (
        <>
          <span className="font-semibold">{t.photoRemoved}</span>
          {change.caption ? <> · {t.quoted(change.caption)}</> : null}
        </>
      );
    case "caption":
      return (
        <>
          <span className="font-semibold">{t.caption}</span>
          {" · "}
          {t.change(quoted(change.old), quoted(change.new))}
        </>
      );
  }
}

function Texts({ before, after }: { before: string | null; after: string | null }) {
  return (
    <details className="group mt-1">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-lk-secondary font-semibold text-lk-blue-dark underline-offset-4 hover:underline focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue">
        {t.showTexts}
      </summary>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {[
          { label: t.before, text: before },
          { label: t.after, text: after },
        ].map((part) => (
          <div key={part.label} className="flex flex-col gap-1 rounded-lk-sm bg-lk-bg p-3">
            <p className="text-lk-caption font-semibold text-lk-ink-3">{part.label}</p>
            <p className="text-lk-secondary whitespace-pre-line text-pretty text-lk-ink-2">
              {part.text?.trim() || t.emptyText}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

function Entry({ entry, now }: { entry: ListingRevision; now: Date }) {
  const { change } = entry;
  return (
    <li className="flex flex-col gap-0.5 px-5 py-3">
      <p className="text-lk-label text-pretty break-words text-lk-ink">
        <Line change={change} />
      </p>
      <p className="text-lk-caption text-lk-ink-3">
        {formatDateTime(entry.at, now)}
        {entry.byTeam ? ` · ${t.byTeam}` : null}
      </p>
      {change.kind === "description" ? <Texts before={change.old} after={change.new} /> : null}
    </li>
  );
}

export function RevisionHistory({ result }: { result: RevisionsResult }) {
  if (!result.ok) return <p className="text-lk-secondary text-lk-ink-3">{t.unavailable}</p>;
  const { entries, limited } = result.data;
  if (entries.length === 0) return <p className="text-lk-secondary text-lk-ink-3">{t.empty}</p>;
  const now = new Date();
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col divide-y divide-lk-line rounded-lk-md border border-lk-line bg-lk-surface">
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} now={now} />
        ))}
      </ol>
      {limited ? (
        <p className="text-lk-caption text-lk-ink-3">{t.limited(entries.length)}</p>
      ) : null}
    </div>
  );
}
