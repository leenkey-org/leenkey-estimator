import type { ReactNode } from "react";
import Link from "next/link";
import { FacadeRoot } from "@/components/shared/facade-root";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Logo } from "@/components/shared/logo";
import { SiteFooter } from "@/components/shared/site-footer";
import { fr } from "@/lib/i18n/fr";

/**
 * Legal page (G10, docs/DESIGN.md 11): 640 px column, 15 px text. Until the
 * lawyer's final texts (Q34), each page says it is being written, except the
 * texts of the V1 already in force (legal notice, CGU: `draft={false}`).
 */
export function LegalPage({
  title,
  lead,
  updated,
  contact,
  draft = true,
  children,
}: {
  title: string;
  lead?: string;
  /** « Dernière mise à jour : 23 juillet 2026 » */
  updated?: string;
  /** « Pour toute question …, écrivez-nous à », then the address; none when the text has its own. */
  contact?: string;
  draft?: boolean;
  children?: ReactNode;
}) {
  return (
    <FacadeRoot className="flex min-h-dvh flex-col bg-lk-surface">
      <main className="mx-auto w-full max-w-lk-prose flex-1 px-5 py-10">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lk-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
        >
          <Logo className="h-8" />
        </Link>
        <h1 className="mt-10 text-lk-h1 font-bold text-wide text-balance text-lk-ink lg:text-lk-h1-lg">
          {title}
        </h1>
        {updated ? <p className="mt-2 text-lk-caption text-lk-ink-3">{updated}</p> : null}
        {lead ? <p className="mt-3 text-lk-body text-pretty text-lk-ink-2">{lead}</p> : null}
        {draft ? (
          <InlineAlert tone="info" className="mt-6">
            {fr.legal.draft}
          </InlineAlert>
        ) : null}
        {children ? <div className="mt-8 flex flex-col gap-6">{children}</div> : null}
        {contact ? (
          <>
            <p className="mt-8 text-lk-body text-lk-ink-2">
              {contact}{" "}
              <a
                href={`mailto:${fr.legal.contactEmail}`}
                className="text-lk-blue underline underline-offset-2"
              >
                {fr.legal.contactEmail}
              </a>
              .
            </p>
            <address className="mt-4 text-lk-secondary not-italic text-lk-ink-3">
              {fr.legal.company}
              <br />
              {fr.legal.address}
            </address>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </FacadeRoot>
  );
}
