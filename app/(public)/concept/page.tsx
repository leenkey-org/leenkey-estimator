import type { Metadata } from "next";
import {
  ConceptCta,
  ConceptHero,
  NextSection,
  OptionsSection,
  ToolSection,
} from "@/leenkey/site/components/concept-sections";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.concept;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/concept" },
  openGraph: { title: t.metaTitle, description: t.metaDescription, url: "/concept" },
};

// /concept in V2 (L1-42, DECISIONS 2026-10-19): the V1 page in its order.
export default function ConceptPage() {
  return (
    <PublicPage header="night">
      <ConceptHero />
      <OptionsSection />
      <ToolSection />
      <NextSection />
      <ConceptCta />
    </PublicPage>
  );
}
