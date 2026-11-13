"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Textarea } from "@/components/shared/textarea";
import { frFinancingDocument } from "@/lib/i18n/sections/financingDocument";
import { FINANCING_NOTE_MAX } from "@/lib/validations/admin";
import { checkFinancingDocument, type FinancingCheckResult } from "../users/actions";
import { useModerationFeedback } from "./listing-moderation";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { financingDocument: frFinancingDocument } as const;

const t = fr.financingDocument.admin;

// « Marquer le justificatif comme vérifié » (L2-02, SPEC-V2 13 and 17), on
// the sheet of a buyer: an internal note, optional, then the button. The
// outcome shows at the top of the sheet (ModerationFeedback). Never « Valider
// le financement »: the team checks a document, it guarantees nothing.

export function FinancingCheck({
  documentId,
  profileId,
}: {
  documentId: string;
  profileId: string;
}) {
  const report = useModerationFeedback();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [working, startTransition] = useTransition();
  const tooLong = note.trim().length > FINANCING_NOTE_MAX;
  const count = t.noteHelp(String(note.trim().length), String(FINANCING_NOTE_MAX));

  const check = () => {
    startTransition(async () => {
      let result: FinancingCheckResult | null = null;
      try {
        result = await checkFinancingDocument({ documentId, profileId, note });
      } catch (error) {
        console.error("[admin] financing check request failed", error);
      }
      if (result?.ok) {
        report({ tone: "success", text: t.done });
        return;
      }
      // Removed, replaced or already checked since the page was shown.
      if (result?.error === "conflict" || result?.error === "not_found") {
        router.refresh();
        report({ tone: "warning", text: t.stale });
        return;
      }
      report({ tone: "danger", text: t.failed, reload: result === null });
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        label={t.note}
        optional
        rows={3}
        placeholder={t.notePlaceholder}
        value={note}
        maxLength={FINANCING_NOTE_MAX + 200}
        help={count}
        error={tooLong ? count : undefined}
        onChange={(event) => setNote(event.target.value)}
      />
      <p className="text-lk-caption text-lk-ink-3">{t.checkHelp}</p>
      <div>
        <Button onClick={check} loading={working} disabled={tooLong}>
          {t.check}
        </Button>
      </div>
    </div>
  );
}
