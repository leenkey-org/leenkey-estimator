"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { useRetry } from "@/components/shared/use-retry";
import { fr } from "@/lib/i18n/fr";

const t = fr.messaging.error;

// A conversation or the first message could not be read (database
// unavailable): the text of SPEC-V2 section 6 (« Erreur »), a way to try
// again and the way back to the list, in the layout of the conversations
// (Façade, TopNav from 768 px).
export default function ConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const { retry, pending } = useRetry(reset);

  return (
    <div className="mx-auto flex w-full max-w-lk-form flex-col gap-4 px-5 py-16">
      <h1 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.title}</h1>
      <InlineAlert tone="danger">{t.text}</InlineAlert>
      <div className="flex flex-wrap gap-3">
        <Button loading={pending} onClick={retry}>
          {t.retry}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/messages">{t.back}</Link>
        </Button>
      </div>
    </div>
  );
}
