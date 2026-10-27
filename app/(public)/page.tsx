import { HomeHero } from "@/leenkey/site/components/home-hero";
import { HomeListings } from "@/leenkey/site/components/home-listings";
import {
  FinalBanner,
  HomeFaqSection,
  PlansSection,
  SavingsSection,
  ShortcutsSection,
  StepsSection,
} from "@/leenkey/site/components/home-sections";
import { PublicPage } from "@/leenkey/site/components/public-page";

// Home page of the redesign D (docs/design-handoff-d/SPECS.md 3, DECISIONS
// 2026-10-27), in its order: the night band and the search card, the
// services, the shortcuts, the savings, the listings around Épinay-sur-Orge,
// the three steps, the plans, the questions and the last call; the first
// page in the charte (night, blue to violet, Sora) before the rest of the
// site, once validated. Title, description and canonical address: app/layout.tsx. The
// listings are rendered with the rest, not streamed after it: coming in
// later, they would push down the sections under them, and an anchor
// (/#tarifs) with them.
export default function HomePage() {
  return (
    <PublicPage redesign>
      <HomeHero />
      <ShortcutsSection />
      <SavingsSection />
      <HomeListings />
      <StepsSection />
      <PlansSection />
      <HomeFaqSection />
      <FinalBanner />
      <div className="h-10 md:h-16" />
    </PublicPage>
  );
}
