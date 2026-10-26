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

// Home page of direction C (docs/design-handoff/SPECS.md 3, DECISIONS
// 2026-10-26), in its order: the photo and the search card, the services,
// the shortcuts, the savings, the listings around Épinay-sur-Orge, the three
// steps, the plans, the questions and the last call. On the warm neutral of
// the page. Title, description and canonical address: app/layout.tsx. The
// listings are rendered with the rest, not streamed after it: coming in
// later, they would push down the sections under them, and an anchor
// (/#tarifs) with them.
export default function HomePage() {
  return (
    <PublicPage tone="warm">
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
