import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";
import { LegalSections } from "../_components/legal-sections";

const t = fr.legal.notice;

export const metadata: Metadata = {
  title: t.metaTitle,
  alternates: { canonical: "/mentions-legales" },
};

// The legal notice of the V1, word for word, on the legal page template
// (L1-43). Its own last section gives the contact.
export default function LegalNoticePage() {
  return (
    <LegalPage title={t.title} updated={t.updated} draft={false}>
      <LegalSections sections={t.sections} />
    </LegalPage>
  );
}
