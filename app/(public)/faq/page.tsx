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
// each answer opened on demand; on the navy of the V1, in its glass cards,
// since L1-50.
export default function FaqPage() {
  return (
    <PublicPage header="night">
      <MarketingSection
        id="faq"
        titleAs="h1"
        look="showcase"
        tone="navy"
        eyebrow={t.eyebrow}
        title={t.title}
        revealContent={false}
      >
        <FaqList
          tone="dark"
          className="mx-auto max-w-220"
          items={t.items.map((item) => ({
            question: item.question,
            answer: (
              <p>
                <RichText parts={item.answer} tone="dark" />
              </p>
            ),
          }))}
        />
      </MarketingSection>
    </PublicPage>
  );
}
