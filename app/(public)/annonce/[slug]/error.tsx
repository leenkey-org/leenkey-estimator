"use client";

import { useEffect } from "react";
import { Button } from "@/components/shared/button";
import { FacadeRoot } from "@/components/shared/facade-root";
import { InlineAlert } from "@/components/shared/inline-alert";
import { fr } from "@/lib/i18n/fr";

// The listing could not be read (database unavailable): the text of SPEC-V2
// section 6 (« Erreur »), and a way to try again.
export default function ListingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const t = fr.listing.error;
  return (
    <FacadeRoot className="min-h-screen bg-lk-surface">
      <main className="mx-auto flex max-w-lk-form flex-col gap-4 px-5 py-16">
        <h1 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.title}</h1>
        <InlineAlert tone="danger">{t.text}</InlineAlert>
        <Button className="self-start" onClick={() => reset()}>
          {t.retry}
        </Button>
      </main>
    </FacadeRoot>
  );
}
