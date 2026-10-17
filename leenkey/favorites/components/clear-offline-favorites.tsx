"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/shared/button";
import { fr } from "@/lib/i18n/fr";
import { clearOfflineFavorites } from "../actions";

const t = fr.favorites.page;

/** « Les retirer de mes favoris »: the favourites that are no longer online. */
export function ClearOfflineFavorites() {
  const [working, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={working}
        onClick={() => {
          setMessage("");
          startTransition(async () => {
            let ok = false;
            try {
              ok = (await clearOfflineFavorites()).ok;
            } catch (error) {
              console.error("[favorites] clearing failed", error);
            }
            setMessage(ok ? t.clearedOffline : t.clearError);
          });
        }}
      >
        {t.clearOffline}
      </Button>
      <span role="status" className="text-lk-caption text-lk-ink-3">
        {message}
      </span>
    </div>
  );
}
