"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Skeleton } from "@/components/shared/skeleton";
import { formatHour } from "@/lib/format";
import { frAdminDashboard } from "@/lib/i18n/sections/adminDashboard";
import { dailyBriefAction } from "../dashboard/actions";
import type { DailyBrief as Brief } from "../dashboard/daily-brief-facts";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminDashboard: frAdminDashboard } as const;

const t = fr.adminDashboard.brief;

type State = { state: "loading" } | { state: "ready"; brief: Brief } | { state: "error" };

/**
 * « Résumé du jour » on the dashboard of the back office (L1-30b, SPEC-V2
 * 17): five lines written by the assistant from the figures of the
 * dashboard, in a box of the blue tint of the assistant (DESIGN 10.5). The
 * page gives the brief of the last hour when there is one; otherwise the
 * card asks for it once shown, and the dashboard never waits for it. On an
 * error, a quiet sentence: the figures below stay the reference.
 */
export function DailyBrief({ initial }: { initial: Brief | null }) {
  const [brief, setBrief] = useState<State>(
    initial ? { state: "ready", brief: initial } : { state: "loading" },
  );
  const [, start] = useTransition();
  const request = useRef(0);
  const asked = useRef(false);

  const ask = useCallback((regenerate: boolean) => {
    const id = ++request.current;
    setBrief({ state: "loading" });
    start(async () => {
      let result: Awaited<ReturnType<typeof dailyBriefAction>> | null = null;
      try {
        result = await dailyBriefAction({ regenerate });
      } catch {
        // Network lost, or a page older than the last deployment.
      }
      if (id !== request.current) return;
      setBrief(result?.ok ? { state: "ready", brief: result.data } : { state: "error" });
    });
  }, []);

  useEffect(() => {
    // Once, also when React runs the effect twice in development.
    if (initial || asked.current) return;
    asked.current = true;
    ask(false);
  }, [initial, ask]);

  return (
    <section
      aria-labelledby="resume-du-jour"
      aria-busy={brief.state === "loading" || undefined}
      className="flex flex-col gap-2.5 rounded-lk-md border border-lk-blue-line bg-lk-blue-tint px-4 py-3.5"
    >
      <div className="flex min-h-10 items-center justify-between gap-2">
        <h2
          id="resume-du-jour"
          className="flex items-center gap-1.5 text-lk-caption font-semibold text-lk-blue"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          {t.title}
        </h2>
        {brief.state !== "loading" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => ask(brief.state === "ready")}
          >
            <RefreshCw aria-hidden="true" />
            {brief.state === "ready" ? t.regenerate : t.retry}
          </Button>
        ) : null}
      </div>
      <div aria-live="polite" className="flex flex-col gap-2">
        {brief.state === "loading" ? (
          <>
            <span className="sr-only">{t.writing}</span>
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-9/12" />
            <Skeleton className="h-3 w-10/12" />
          </>
        ) : brief.state === "ready" ? (
          <>
            <p className="text-lk-secondary whitespace-pre-line text-pretty text-lk-navy">
              {brief.brief.text}
            </p>
            {brief.brief.tooSoon ? (
              <InlineAlert tone="info" live={false}>
                {t.tooSoon}
              </InlineAlert>
            ) : null}
            <p className="text-lk-caption text-lk-ink-3">
              {t.written(formatHour(brief.brief.createdAt))} {t.note}
            </p>
          </>
        ) : (
          <p className="text-lk-secondary text-lk-ink-3">{t.unavailable}</p>
        )}
      </div>
    </section>
  );
}
