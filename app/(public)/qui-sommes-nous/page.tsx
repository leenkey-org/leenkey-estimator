import type { Metadata } from "next";
import {
  AboutCta,
  AboutHero,
  CommitmentsSection,
  FutureSection,
  HumanSection,
  MissionSection,
  PricingModelSection,
  StorySection,
  TechnologySection,
} from "@/leenkey/site/components/about-sections";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { frSiteAbout } from "@/lib/i18n/sections/site/about";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { site: { about: frSiteAbout } } as const;

const t = fr.site.about;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/qui-sommes-nous" },
  openGraph: { title: t.metaTitle, description: t.metaDescription, url: "/qui-sommes-nous" },
};

// /qui-sommes-nous: the text given by Cédric on 2026-11-19, in its order.
export default function AboutPage() {
  return (
    <PublicPage header="night">
      <AboutHero />
      <StorySection />
      <MissionSection />
      <TechnologySection />
      <HumanSection />
      <PricingModelSection />
      <CommitmentsSection />
      <FutureSection />
      <AboutCta />
    </PublicPage>
  );
}
