import type { Metadata } from "next";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SiteFooter } from "@/components/shared/site-footer";
import { LeenkeyWizard } from "@/leenkey/estimator/Wizard";
import { SiteMobileHeader } from "@/leenkey/navigation/components/site-mobile-header";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = {
  title: fr.site.valuation.metaTitle,
  alternates: { canonical: "/estimer" },
};

// The valuation wizard of the V1 (L1-01) in the header and the footer of the
// V2 site (L1-43), restyled in Façade (L1-44, docs/DESIGN.md 13.1) without
// any change of its logic or texts. It renders the main landmark; while its
// bar is fixed at the bottom of the screen (81 px, then the iOS safe area),
// the footer gets room above it.
export default function ValuationPage() {
  return (
    <FacadeRoot className="group/estimer flex min-h-dvh flex-col bg-lk-surface">
      <div className="sticky top-0 z-40">
        <SiteTopNav />
        <SiteMobileHeader />
      </div>
      <LeenkeyWizard />
      <div className="mt-auto group-has-[[data-wizard-bar]]/estimer:pb-[calc(5.25rem+env(safe-area-inset-bottom))]">
        <SiteFooter />
      </div>
    </FacadeRoot>
  );
}
