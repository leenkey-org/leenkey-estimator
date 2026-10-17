import type { ReactNode } from "react";
import Link from "next/link";
import { InlineAlert } from "@/components/shared/inline-alert";
import { fr } from "@/lib/i18n/fr";

/** Column of 560 px under the header of the creation (docs/DESIGN.md 9, G5). */
export function CreationBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-lk-form px-5 pt-6 md:pt-10 md:pb-16">{children}</div>;
}

/** The property could not be read: the message, and a way to try again. */
export function CreationLoadError({ href }: { href: string }) {
  const t = fr.properties.creation;
  return (
    <CreationBody>
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={href}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {t.retry}
          </Link>
        }
      >
        {t.loadError}
      </InlineAlert>
    </CreationBody>
  );
}
