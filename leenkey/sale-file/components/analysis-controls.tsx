"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { retryDocumentAnalysis, setPublicFacts } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.analysis;

/** Reads the tab again while an analysis is being written: every 20 seconds, for 10 minutes. */
export function AnalysisRefresher() {
  const router = useRouter();
  useEffect(() => {
    let rounds = 0;
    const timer = setInterval(() => {
      rounds += 1;
      if (rounds > 30) return clearInterval(timer);
      if (document.visibilityState === "visible") router.refresh();
    }, 20_000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}

/** « Relancer l'analyse » of a document whose analysis failed, « Lancer l'analyse » of one never read. */
export function RetryAnalysisButton({
  propertyId,
  documentId,
  title,
  first = false,
}: {
  propertyId: string;
  documentId: string;
  title: string;
  /** Never analysed (filed before the analysis existed): « Lancer l'analyse ». */
  first?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={pending}
        aria-label={first ? t.startAbout(title) : t.retryAbout(title)}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await retryDocumentAnalysis(propertyId, documentId).catch(() => null);
            if (!result?.ok) return setError(t.retryErrors[result?.error ?? "unavailable"]);
            router.refresh();
          })
        }
      >
        {first ? t.start : t.retry}
      </Button>
      {error ? (
        <span role="alert" className="text-lk-caption text-lk-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** « Afficher sur l'annonce » / « Retirer de l'annonce »: the public facts of a document. */
export function PublicFactsButton({
  propertyId,
  documentId,
  title,
  shown,
}: {
  propertyId: string;
  documentId: string;
  title: string;
  /** Shown on the listing: the button takes them off. */
  shown: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={shown ? "ghost" : "secondary"}
        size="sm"
        loading={pending}
        aria-label={shown ? t.publicFacts.hideAbout(title) : t.publicFacts.showAbout(title)}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await setPublicFacts(propertyId, documentId, !shown).catch(() => null);
            if (!result?.ok) return setError(t.publicFacts.error);
            router.refresh();
          })
        }
      >
        {shown ? t.publicFacts.hide : t.publicFacts.show}
      </Button>
      {error ? (
        <span role="alert" className="text-lk-caption text-lk-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
