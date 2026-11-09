import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";
import { LegalSections } from "../_components/legal-sections";

const t = fr.legal.ai;

export const metadata: Metadata = {
  title: t.metaTitle,
  alternates: { canonical: "/intelligence-artificielle" },
};

// Notice on the assistant (SPEC section 12, DECISIONS.md 2026-11-09): what
// it does, what it never does alone, its limits, the data it receives.
export default function AiNoticePage() {
  return (
    <LegalPage title={t.title} lead={t.lead} updated={t.updated} contact={t.contact} draft={false}>
      <LegalSections sections={t.sections} />
    </LegalPage>
  );
}
