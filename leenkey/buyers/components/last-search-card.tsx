"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Skeleton } from "@/components/shared/skeleton";
import { lastSearchDigest } from "@/leenkey/search/actions";
import { storedSearch } from "@/leenkey/search/last-search";
import { fr } from "@/lib/i18n/fr";
import { SEARCH_PATH } from "@/lib/validations/search";
import { cn } from "@/lib/utils";

const t = fr.buyerSpace.home;

type State =
  | { kind: "reading" }
  | { kind: "none" }
  /** criteria: null when they could not be read (the search is still there to resume). */
  | { kind: "search"; href: string; criteria: string[] | null; fresh: number };

/**
 * Under the greeting of the buyer home (DESIGN.md 12.10): the search kept by
 * this browser, its criteria and its listings published since it was last
 * seen, to resume it or start a new one; without one, the way to the
 * listings. Read after the first paint (localStorage): the same height in
 * both cases, nothing jumps.
 */
export function LastSearchCard({ className }: { className?: string }) {
  const [state, setState] = useState<State>({ kind: "reading" });

  useEffect(() => {
    const stored = storedSearch();
    if (!stored) {
      setState({ kind: "none" });
      return;
    }
    let live = true;
    lastSearchDigest({ href: stored.href, since: stored.at })
      .then((result) => {
        if (!live) return;
        setState(
          result.ok
            ? { kind: "search", href: stored.href, ...result.data }
            : { kind: "search", href: stored.href, criteria: null, fresh: 0 },
        );
      })
      .catch(() => {
        if (live) setState({ kind: "search", href: stored.href, criteria: null, fresh: 0 });
      });
    return () => {
      live = false;
    };
  }, []);

  const search = state.kind === "search" ? state : null;
  return (
    <section
      aria-labelledby="derniere-recherche"
      aria-busy={state.kind === "reading" || undefined}
      className={cn(
        "flex min-h-44 flex-col gap-4 rounded-lk-2xl border border-lk-line bg-lk-surface p-5 shadow-lk-block md:p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint">
          <Search aria-hidden="true" strokeWidth={1.8} className="lk-icon-gradient size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="derniere-recherche" className="text-lk-title font-semibold text-lk-ink">
            {state.kind === "reading" ? (
              <>
                <span className="sr-only">{t.lastSearch.reading}</span>
                <Skeleton className="my-1 h-5 w-3/4" />
              </>
            ) : search ? (
              t.lastSearch.title
            ) : (
              t.start.title
            )}
          </h2>
          {state.kind === "reading" ? (
            <Skeleton className="my-0.5 h-4 w-1/2" />
          ) : (
            <p className="text-lk-compact text-lk-ink-3">
              {/* A no-break space keeps the height of the line when the criteria could not be read. */}
              {search
                ? search.criteria === null
                  ? "\u00A0"
                  : search.criteria.length > 0
                    ? search.criteria.join(" · ")
                    : t.lastSearch.any
                : t.start.text}
            </p>
          )}
        </div>
        {search && search.fresh > 0 ? (
          <span className="shrink-0 rounded-full bg-lk-blue-tint px-2.5 py-1 text-lk-caption font-semibold text-lk-blue">
            {t.lastSearch.newCount(search.fresh)}
          </span>
        ) : null}
      </div>
      {state.kind === "reading" ? (
        <Skeleton className="h-11 w-full sm:w-1/2" />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {search ? (
            <>
              <Button asChild>
                <Link href={search.href}>{t.lastSearch.resume}</Link>
              </Button>
              <Button asChild variant="outline-ink">
                <Link href={SEARCH_PATH}>{t.lastSearch.fresh}</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="sm:col-span-2 md:col-span-1">
              <Link href={SEARCH_PATH}>{t.start.action}</Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
