import Link from "next/link";
import { FOOTER_LINKS } from "@/leenkey/legal/footer-links";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { CookieSettingsButton } from "./cookie-settings-button";

const t = fr.footer;

const linkClass =
  "rounded-lk-sm text-lk-secondary text-lk-ink-2 underline-offset-2 hover:text-lk-ink hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue";

/**
 * Footer of the V2 pages (L1-36, docs/DESIGN.md 10.6): the legal links,
 * « Gérer mes cookies » and the legal identity of Leenkey, on stone.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-lk-line bg-lk-bg", className)}>
      <div className="mx-auto flex max-w-lk-page flex-col gap-4 px-5 py-8 md:px-10">
        <nav aria-label={t.label}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
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
          {t.rights} · {fr.legal.company} · {fr.legal.address}
        </p>
      </div>
    </footer>
  );
}
