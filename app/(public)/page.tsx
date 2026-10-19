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

// Home page (SPEC-V2 8.1, L1-41), rebuilt in V2 (DECISIONS 2026-10-19): the
// hero with « Je vends » and « J'achète », the latest listings, then the
// sections of the V1 page in its order, with its anchors. Title, description
// and canonical address: app/layout.tsx.
export default function HomePage() {
  return (
    <PublicPage>
      <HomeHero />
      <LatestListings />
      <StagesSection />
      <StepsSection />
      <FeaturesSection />
      <SellerSpaceSection />
      <ComparisonSection />
      <PlansSection />
      <HomeFaqSection />
      <ContactSection />
      <FinalCta />
    </PublicPage>
  );
}
