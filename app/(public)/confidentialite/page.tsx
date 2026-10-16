import type { Metadata } from "next";
import Link from "next/link";
import { FacadeRoot } from "@/components/shared/facade-root";
import { InlineAlert } from "@/components/shared/inline-alert";
import { fr } from "@/lib/i18n/fr";

const t = fr.legal.privacy;

export const metadata: Metadata = { title: t.metaTitle };

// Linked from the signup form. Placeholder of L1-36 (Q10, Q34): the final text
// comes from Cédric's lawyer.
export default function PrivacyPage() {
  return (
    <FacadeRoot className="min-h-dvh bg-lk-surface">
      <div className="mx-auto w-full max-w-lk-prose px-5 py-10">
        <Link
          href="/"
          className="rounded-lk-sm text-lk-h2 font-bold text-wide text-lk-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
        >
          {fr.auth.brand}
        </Link>
        <h1 className="mt-10 text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">
          {t.title}
        </h1>
        <InlineAlert tone="info" className="mt-6">
          {t.draft}
        </InlineAlert>
        <p className="mt-6 text-lk-body text-lk-ink-2">
          {t.contact}{" "}
          <a
            href={`mailto:${t.contactEmail}`}
            className="text-lk-blue underline underline-offset-2"
          >
            {t.contactEmail}
          </a>
          .
        </p>
      </div>
    </FacadeRoot>
  );
}
