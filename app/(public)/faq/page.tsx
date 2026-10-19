import type { Metadata } from "next";
import { FaqList } from "@/components/shared/faq-list";
import { MarketingSection } from "@/components/shared/marketing-section";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { RichText } from "@/leenkey/site/components/rich-text";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.faqPage;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/faq" },
  openGraph: { title: t.metaTitle, description: t.metaDescription, url: "/faq" },
};

// /faq in V2 (L1-42, DECISIONS 2026-10-19): the questions of the V1 page,
// each answer opened on demand.
export default function FaqPage() {
  return (
    <PublicPage>
      <MarketingSection id="faq" titleAs="h1" title={t.title}>
        <FaqList
          items={t.items.map((item) => ({
            question: item.question,
            answer: <RichText parts={item.answer} />,
          }))}
        />
      </MarketingSection>
    </PublicPage>
  );
}
