import { HomeHero } from "@/leenkey/site/components/home-hero";
import {
  ComparisonSection,
  ContactSection,
  FeaturesSection,
  FinalCta,
  HomeFaqSection,
  SellerSpaceSection,
  StagesSection,
  StepsSection,
} from "@/leenkey/site/components/home-sections";
import { LatestListings } from "@/leenkey/site/components/latest-listings";
import { PlansSection } from "@/leenkey/site/components/plans-section";
import { PublicPage } from "@/leenkey/site/components/public-page";

// Home page (SPEC-V2 8.1, L1-41), rebuilt in V2 (DECISIONS 2026-10-19) and
// in the direction of the V1 (DECISIONS 2026-10-23): the V1 hero, then its
// sections in its order and with its anchors, « Où en êtes-vous » first; the
// latest listings after the seller area. Title, description and canonical
// address: app/layout.tsx.
export default function HomePage() {
  return (
    <PublicPage>
      <HomeHero />
      <StagesSection />
      <StepsSection />
      <FeaturesSection />
      <SellerSpaceSection />
      <LatestListings />
      <ComparisonSection />
      <PlansSection />
      <HomeFaqSection />
      <ContactSection />
      <FinalCta />
    </PublicPage>
  );
}
