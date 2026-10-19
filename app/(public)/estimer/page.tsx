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
// V2 site (L1-43). The wizard keeps its V1 styles until it is restyled
// (docs/DESIGN.md 13.1): it stays out of the Façade scope, and renders the
// main landmark. While its bar is fixed at the bottom of the screen, the
// footer gets room to show above it.
export default function ValuationPage() {
  return (
    <div className="group/estimer flex min-h-dvh flex-col">
      <FacadeRoot className="sticky top-0 z-40">
        <SiteTopNav />
        <SiteMobileHeader />
      </FacadeRoot>
      <LeenkeyWizard />
      <FacadeRoot className="mt-auto group-has-[[data-wizard-bar]]/estimer:pb-20">
        <SiteFooter />
      </FacadeRoot>
    </div>
  );
}
