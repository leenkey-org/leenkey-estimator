"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { frVisits } from "@/lib/i18n/sections/visits";
import { cancelVisit, type CancelResult } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.cancelDialog;

/**
 * « Annuler la visite », after a confirmation (SPEC-V2 14): the buyer until
 * 2 hours before, the seller until it starts; the other party is told.
 */
export function CancelVisitButton({
  visitId,
  propertyId,
  role,
  label,
  size = "sm",
}: {
  visitId: string;
  propertyId: string;
  role: "buyer" | "seller";
  /** The name of the button when several follow each other. */
  label?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    setError(null);
    start(async () => {
      let result: CancelResult | null = null;
      try {
        result = await cancelVisit(visitId, propertyId);
      } catch (caught) {
        console.error("[visits] visit not cancelled", caught);
      }
      if (!result?.ok) {
        setError(t.errors[result?.error ?? "unavailable"]);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={role === "buyer" ? "danger" : "ghost"}
        size={size}
        aria-label={label}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t.confirm}
      </Button>
      <ConfirmDialog
        open={open}
        title={t.title}
        description={t[role]}
        confirmLabel={t.confirm}
        confirmVariant="danger"
        labels={{ back: t.back, close: t.close, cancel: t.cancel }}
        working={pending}
        error={error}
        onConfirm={confirm}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
      />
    </>
  );
}
