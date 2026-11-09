import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";
import { LegalSections } from "../_components/legal-sections";

const t = fr.legal.terms;

export const metadata: Metadata = {
  title: t.metaTitle,
  alternates: { canonical: "/cgu" },
};

// The CGU 2.0 of the launch (DECISIONS.md 2026-11-09), the version accepted
// at signup (lib/legal/versions.ts), on the legal page template (L1-43).
export default function TermsPage() {
  return (
    <LegalPage title={t.title} updated={t.updated} contact={t.contact} draft={false}>
      <LegalSections sections={t.sections} toc={t.toc} />
    </LegalPage>
  );
}
