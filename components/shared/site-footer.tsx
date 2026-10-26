import Link from "next/link";
import { FOOTER_LINKS } from "@/leenkey/legal/footer-links";
import { SITE_LINKS } from "@/leenkey/navigation/config";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { CookieSettingsButton } from "./cookie-settings-button";

const t = fr.footer;

// 44 px high: touch target of DESIGN.md 15. The legal links: 14 px, secondary.
const linkClass =
  "inline-flex min-h-11 items-center rounded-lk-sm text-lk-compact text-lk-ink-2 underline-offset-2 hover:text-lk-ink hover:underline focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue";

// The pages of the site, above: 15 px 600 ink.
const siteLinkClass =
  "inline-flex min-h-11 items-center rounded-lk-sm text-lk-title font-semibold text-lk-ink underline-offset-2 hover:underline focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue";

/**
 * Footer of the V2 pages (L1-36, docs/DESIGN.md 10.6): the pages of the site
 * (DECISIONS 2026-10-19), the legal links, « Gérer mes cookies » and the
 * legal identity of Leenkey, on sand (direction C, docs/design-handoff/SPECS.md
 * 3, item 12). In the frame of the page (L1-56), or the whole width under
 * the search, aligned on its list.
 */
export function SiteFooter({
  fullWidth = false,
  className,
}: {
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <footer className={cn("border-t border-lk-sand-line bg-lk-sand", className)}>
      <div
        className={cn(
          "flex flex-col gap-3 pt-8 pb-10 max-md:[--lk-gutter:1rem] md:gap-4 md:pt-10 md:pb-12",
          fullWidth ? "w-full lk-gutter 2xl:[--lk-gutter:2rem]" : "lk-frame",
        )}
      >
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
        <p className="text-lk-caption text-lk-ink-2">
          {fr.legal.company} · {fr.legal.address}
          <br />
          {t.rights}
        </p>
      </div>
    </footer>
  );
}
