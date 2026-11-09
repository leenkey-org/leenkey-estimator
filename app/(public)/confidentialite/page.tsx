import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";
import { LegalSections } from "../_components/legal-sections";

const t = fr.legal.privacy;

export const metadata: Metadata = {
  title: t.metaTitle,
  alternates: { canonical: "/confidentialite" },
};

// Linked from the signup form (L1-09) and the footers (L1-36); the version
// accepted at signup (lib/legal/versions.ts, DECISIONS.md 2026-11-09).
export default function PrivacyPage() {
  return (
    <LegalPage title={t.title} updated={t.updated} contact={t.contact} draft={false}>
      <LegalSections sections={t.sections} toc={t.toc} />
    </LegalPage>
  );
}
