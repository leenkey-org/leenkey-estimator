"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { FacadeRoot } from "@/components/shared/facade-root";
import { InlineAlert } from "@/components/shared/inline-alert";
import { useRetry } from "@/components/shared/use-retry";
import { fr } from "@/lib/i18n/fr";

const t = fr.errors.failed;

// A page that could not be shown (the server or the page failed): the text of
// SPEC-V2 section 6 (« Erreur »), a way to try again, the way home and the
// way to write to us, as the error of a listing or of a conversation.
export default function PageError({
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
    <FacadeRoot className="min-h-dvh bg-lk-surface">
      <main className="mx-auto flex max-w-lk-form flex-col gap-4 px-5 py-16">
        <h1 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.title}</h1>
        <InlineAlert tone="danger">{t.text}</InlineAlert>
        <div className="flex flex-wrap gap-3">
          <Button loading={pending} onClick={retry}>
            {t.retry}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">{t.home}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">{t.contact}</Link>
          </Button>
        </div>
      </main>
    </FacadeRoot>
  );
}
