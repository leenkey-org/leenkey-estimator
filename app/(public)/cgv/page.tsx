import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";
import { LegalSections } from "../_components/legal-sections";

const t = fr.legal.salesTerms;

export const metadata: Metadata = {
  title: t.metaTitle,
  alternates: { canonical: "/cgv" },
};

// The CGV of the launch (DECISIONS.md 2026-11-09), the version accepted at
// checkout (lib/config/sales.ts). Ordering stays closed in production until
// the consumer mediator is published (Q32).
export default function SalesTermsPage() {
  return (
    <LegalPage title={t.title} lead={t.lead} updated={t.updated} contact={t.contact} draft={false}>
      <LegalSections sections={t.sections} toc={t.toc} />
    </LegalPage>
  );
}
