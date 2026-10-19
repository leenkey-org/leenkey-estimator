import Link from "next/link";
import { FOOTER_LINKS } from "@/leenkey/legal/footer-links";
import { SITE_LINKS } from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { CookieSettingsButton } from "./cookie-settings-button";

const t = fr.footer;

// 44 px high: touch target of DESIGN.md 15.
const linkClass =
  "inline-flex min-h-11 items-center rounded-lk-sm text-lk-secondary text-lk-ink-2 underline-offset-2 hover:text-lk-ink hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue";

// The pages of the site, above: 14 px 500 ink.
const siteLinkClass =
  "inline-flex min-h-11 items-center rounded-lk-sm text-lk-compact font-medium text-lk-ink underline-offset-2 hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue";

/**
 * Footer of the V2 pages (L1-36, docs/DESIGN.md 10.6): the pages of the site
 * (DECISIONS 2026-10-19), the legal links, « Gérer mes cookies » and the
 * legal identity of Leenkey, on stone.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-lk-line bg-lk-bg", className)}>
      <div className="mx-auto flex max-w-lk-page flex-col gap-4 px-5 py-8 md:px-10">
        <nav aria-label={fr.site.links.label}>
          <ul className="flex flex-wrap gap-x-6">
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={siteLinkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.label}>
          <ul className="flex flex-wrap gap-x-5">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                {link.href.startsWith("mailto:") ? (
                  <a href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
            <li>
              <CookieSettingsButton className={cn(linkClass, "cursor-pointer")} />
            </li>
          </ul>
        </nav>
        <p className="text-lk-caption text-lk-ink-3">
          {fr.legal.company} · {fr.legal.address}
          <br />
          {t.rights}
        </p>
      </div>
    </footer>
  );
}
