import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { Logo } from "@/components/shared/logo";
import { frAuth } from "@/lib/i18n/sections/auth";
import { frSpaces } from "@/lib/i18n/sections/spaces";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { auth: frAuth, spaces: frSpaces } as const;

/**
 * Header (back, logo 28 px high, 44 px spacer) on the page background, then
 * the title block and the form in a card, in the 560 px column of DESIGN.md
 * 12.1; optional privacy note at the bottom. From 1 024 px the card sits in
 * the middle of the height left, beside the brand panel of the layout.
 */
export function AuthShell({
  title,
  lead,
  children,
  privacyNote = false,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  privacyNote?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lk-form flex-col px-3 pt-5 pb-8 md:px-0">
      <header className="flex items-center justify-between max-md:px-1">
        <Link
          href="/"
          aria-label={fr.spaces.home}
          className={cn(
            iconButtonVariants({ variant: "stone" }),
            // White with a line: the stone flat does not show on the page background.
            "inline-flex items-center justify-center border border-lk-line bg-lk-surface",
          )}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
        <Logo />
        <span aria-hidden="true" className="size-11" />
      </header>
      <main className="flex flex-1 flex-col pt-6 lg:justify-center lg:py-8">
        <div className="rounded-lk-d-card border border-lk-line bg-lk-surface px-5 py-6 shadow-lk-d-block md:rounded-lk-2xl md:p-8">
          <h1 className="text-lk-h1 font-bold text-wide text-balance text-lk-ink lg:text-lk-h1-lg">
            {title}
          </h1>
          {lead ? <p className="mt-2 text-lk-compact text-pretty text-lk-ink-3">{lead}</p> : null}
          <div className="mt-6 flex flex-col">{children}</div>
        </div>
      </main>
      {privacyNote ? (
        // Not a <footer>: the SiteFooter of the layout is the page's contentinfo.
        <div className="mt-8 flex items-start gap-2.5 text-lk-caption text-lk-ink-2 max-md:px-2">
          <Lock aria-hidden="true" className="mt-px size-4 shrink-0 text-lk-success" />
          <p>{fr.auth.signup.privacyNote}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Small text link of the auth screens (« Se connecter », « Mot de passe oublié ? »). */
export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lk-sm font-semibold text-lk-blue underline underline-offset-2 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue"
    >
      {children}
    </Link>
  );
}
