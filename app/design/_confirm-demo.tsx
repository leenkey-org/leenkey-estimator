"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UnitInput } from "@/components/shared/unit-input";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.sheet;

/** The confirmation of « Marquer comme vendu » (L1-14), opened from the /design catalogue. */
export function ConfirmDemo({ open: openLabel }: { open: string }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {openLabel}
      </Button>
      <ConfirmDialog
        open={open}
        title={t.soldDialog.title}
        description={t.soldDialog.text}
        confirmLabel={t.soldDialog.confirm}
        labels={t.dialog}
        working={false}
        onConfirm={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <UnitInput
          label={t.soldDialog.price}
          help={t.soldDialog.priceHelp}
          unit="€"
          inputMode="numeric"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}
