"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { frAdminOffers } from "@/lib/i18n/sections/adminOffers";
import { markOfferAnalysed, type OfferAnalysedResult } from "../offers/actions";
import { useModerationFeedback } from "./listing-moderation";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminOffers: frAdminOffers } as const;

const t = fr.adminOffers.analysis;

// « Marquer comme analysée » (L2-07, SPEC-V2 section 17), on the sheet of an
// offer whose property has a plan with the analysis of its offers: the task
// of the team of the sale, ticked once. The outcome shows at the top of the
// sheet (ModerationFeedback).

export function OfferAnalysed({ offerId }: { offerId: string }) {
  const report = useModerationFeedback();
  const router = useRouter();
  const [working, startTransition] = useTransition();

  const mark = () => {
    startTransition(async () => {
      let result: OfferAnalysedResult | null = null;
      try {
        result = await markOfferAnalysed({ offerId });
      } catch (error) {
        console.error("[admin] offer analysed request failed", error);
      }
      if (result?.ok) {
        report({ tone: "success", text: t.done });
        return;
      }
      // Ticked meanwhile (another tab, the case of the sale).
      if (result?.error === "conflict") {
        router.refresh();
        report({ tone: "warning", text: t.stale });
        return;
      }
      // The plan ended or was refunded since the page was shown.
      if (result?.error === "not_found") {
        router.refresh();
        report({ tone: "warning", text: t.noRight });
        return;
      }
      report({ tone: "danger", text: t.failed, reload: result === null });
    });
  };

  return (
    <div>
      <Button variant="secondary" onClick={mark} loading={working}>
        {t.mark}
      </Button>
    </div>
  );
}
