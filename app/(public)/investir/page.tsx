import type { Metadata } from "next";
import {
  HookSection,
  InvestContactSection,
  InvestCta,
  InvestFaqSection,
  InvestHero,
  MarketSection,
  MessageSection,
  ModelSection,
  ProgressSection,
  ReasonsSection,
  RoadmapSection,
  TimingSection,
  VisionSection,
} from "@/leenkey/site/components/invest-sections";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.invest;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/investir" },
  openGraph: { title: t.metaTitle, description: t.metaDescription, url: "/investir" },
};

// /investir in V2 (L1-43, DECISIONS 2026-10-19): the V1 page in its order.
export default function InvestPage() {
  return (
    <PublicPage>
      <InvestHero />
      <HookSection />
      <MarketSection />
      <VisionSection />
      <ProgressSection />
      <ModelSection />
      <TimingSection />
      <RoadmapSection />
      <ReasonsSection />
      <MessageSection />
      <InvestFaqSection />
      <InvestContactSection />
      <InvestCta />
    </PublicPage>
  );
}
