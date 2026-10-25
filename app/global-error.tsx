"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { FacadeRoot } from "@/components/shared/facade-root";
import { InlineAlert } from "@/components/shared/inline-alert";
import { archivo } from "@/lib/fonts";
import { fr } from "@/lib/i18n/fr";
import "./globals.css";

const t = fr.errors.failed;

// The root layout itself failed (app/layout.tsx and its client providers):
// this page replaces it, html and body included, instead of the page of
// Next.js in English. « Réessayer » reloads the whole page, the layout too.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr" className={archivo.variable}>
      <body>
        <FacadeRoot className="min-h-dvh bg-lk-surface">
          <main className="mx-auto flex max-w-lk-form flex-col gap-4 px-5 py-16">
            <h1 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.title}</h1>
            <InlineAlert tone="danger">{t.text}</InlineAlert>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => window.location.reload()}>{t.retry}</Button>
              <Button asChild variant="secondary">
                <Link href="/">{t.home}</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/contact">{t.contact}</Link>
              </Button>
            </div>
          </main>
        </FacadeRoot>
      </body>
    </html>
  );
}
