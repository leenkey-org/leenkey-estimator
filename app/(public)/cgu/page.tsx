import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";
import { LegalSections } from "../_components/legal-sections";

const t = fr.legal.terms;

export const metadata: Metadata = {
  title: t.metaTitle,
  alternates: { canonical: "/cgu" },
};

// The CGU of the V1 (version 1.0, the one accepted at signup:
// lib/legal/versions.ts), word for word, on the legal page template (L1-43).
// TODO(client): final text from Cédric's lawyer (Q34), then a new version.
export default function TermsPage() {
  return (
    <LegalPage title={t.title} updated={t.updated} contact={t.contact} draft={false}>
      <LegalSections sections={t.sections} toc={t.toc} />
    </LegalPage>
  );
}
