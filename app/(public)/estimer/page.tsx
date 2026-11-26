import type { Metadata } from "next";
import { BadgeCheck, Clock, FileText } from "lucide-react";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SiteFooter } from "@/components/shared/site-footer";
import { LeenkeyWizard } from "@/leenkey/estimator/Wizard";
import { SiteMobileHeader } from "@/leenkey/navigation/components/site-mobile-header";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { frSiteHome } from "@/lib/i18n/sections/site/home";
import { frSiteValuation } from "@/lib/i18n/sections/site/valuation";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { site: { valuation: frSiteValuation, home: frSiteHome } } as const;

// One pictogram per point of the home page: « Gratuit », « 2 minutes »,
// « Rapport PDF de 4 pages par email ».
const NOTE_ICONS = [BadgeCheck, Clock, FileText] as const;

/**
 * Beside the questions from 1024 px: the three points under the address
 * field of the home page, word for word, one per line.
 */
function ValuationNote() {
  return (
    <ul className="space-y-3.5 rounded-lk-d-card border border-lk-line bg-lk-bg p-5">
      {fr.site.home.search.valuation.points.map((point, index) => {
        const Icon = NOTE_ICONS[index] ?? BadgeCheck;
        return (
          <li key={point} className="flex items-center gap-3 text-lk-secondary text-lk-ink-2">
            <span className="lk-gradient-soft flex size-9 shrink-0 items-center justify-center rounded-lk-lg">
              <Icon
                aria-hidden="true"
                strokeWidth={1.9}
                className="lk-icon-gradient size-4.5 text-lk-blue"
              />
            </span>
            <span className="min-w-0">{point}</span>
          </li>
        );
      })}
    </ul>
  );
}

export const metadata: Metadata = {
  title: fr.site.valuation.metaTitle,
  alternates: { canonical: "/estimer" },
};

// The valuation wizard of the V1 (L1-01) in the header and the footer of the
// V2 site (L1-43), restyled in Façade (L1-44, docs/DESIGN.md 13.1) without
// any change of its logic or texts. It renders the main landmark, as tall as
// the screen under the header: its actions stay at the bottom of the screen
// and the footer comes below the fold (design pass of 2026-11-26).
export default function ValuationPage() {
  return (
    <FacadeRoot className="flex min-h-dvh flex-col bg-lk-surface">
      <div className="sticky top-0 z-40">
        <SiteTopNav />
        <SiteMobileHeader />
      </div>
      <LeenkeyWizard aside={<ValuationNote />} />
      <SiteFooter className="mt-auto" />
    </FacadeRoot>
  );
}
