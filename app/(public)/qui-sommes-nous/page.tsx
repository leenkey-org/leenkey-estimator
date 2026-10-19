import type { Metadata } from "next";
import {
  AboutCta,
  AboutFigures,
  AboutHero,
  StorySection,
  ValuesSection,
} from "@/leenkey/site/components/about-sections";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.about;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/qui-sommes-nous" },
  openGraph: { title: t.metaTitle, description: t.metaDescription, url: "/qui-sommes-nous" },
};

// /qui-sommes-nous in V2 (L1-43, DECISIONS 2026-10-19): the V1 page in its order.
export default function AboutPage() {
  return (
    <PublicPage>
      <AboutHero />
      <AboutFigures />
      <StorySection />
      <ValuesSection />
      <AboutCta />
    </PublicPage>
  );
}
