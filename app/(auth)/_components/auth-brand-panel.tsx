import Image from "next/image";
import { ChartLine, KeyRound, Search, Tag } from "lucide-react";
import { FacadeDrawing } from "@/components/shared/facade-drawing";
import { sitePhoto } from "@/leenkey/site/photos";
import { frSiteHome } from "@/lib/i18n/sections/site/home";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { site: { home: frSiteHome } } as const;

const t = fr.site.home;

// Three lines of the shortcut cards of the home page, word for word, with
// their icons: no promise the site does not already make, no figure.
const BENEFITS = [
  // Not the line of « Être accompagné »: alone here, it would promise every
  // account an adviser that only the paid plans have.
  { icon: ChartLine, text: t.shortcuts.items.valuation.text },
  { icon: Tag, text: t.shortcuts.items.sell.text },
  { icon: Search, text: t.shortcuts.items.buy.text },
] as const;

/**
 * Brand panel of the sign-up, login, password and terms screens, from
 * 1 024 px only (docs/DESIGN.md 12.1): the night of the home hero in a frame
 * rounded like its photo, the slogan pill, the photo of the home page (the
 * brand drawing where the photo may not show) and three lines of the home
 * page. A support for the form: no heading, after the form in reading order,
 * and not rendered at all below 1 024 px (`hidden`, so nothing is read twice).
 */
export function AuthBrandPanel() {
  const photo = sitePhoto("home");
  return (
    <div className="hidden min-w-0 py-6 lg:block">
      <div className="lk-hero-bg sticky top-6 flex h-[calc(100dvh-3rem)] max-h-225 min-h-140 flex-col overflow-hidden rounded-lk-4xl p-8 text-white xl:p-10">
        <p className="inline-flex items-center gap-2.5 self-start rounded-full border border-white/18 bg-lk-night/35 py-1.25 pr-4 pl-1.5 text-lk-compact font-medium">
          <span className="lk-gradient-brand flex size-6 items-center justify-center rounded-full">
            {/* The key of the slogan. */}
            <KeyRound aria-hidden="true" strokeWidth={2.6} className="size-3.25" />
          </span>
          {t.hero.badge}
        </p>
        <div className="relative mt-6 min-h-0 flex-1 overflow-hidden rounded-lk-3xl bg-lk-indigo-deep">
          {photo ? (
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 45vw, 1px"
              className="object-cover object-[42%_62%]"
            />
          ) : (
            <FacadeDrawing className="pointer-events-none absolute inset-x-8 bottom-0 h-52.5 opacity-55" />
          )}
          <span
            aria-hidden="true"
            className="lk-dots-white absolute top-6 right-6 h-22 w-33 bg-[length:18px_18px]"
          />
        </div>
        <ul className="mt-6 flex flex-col gap-3.5">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3.5 text-lk-body text-lk-night-text">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lk-lg border border-white/14 bg-white/6">
                <Icon aria-hidden="true" strokeWidth={1.9} className="size-4.5" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
