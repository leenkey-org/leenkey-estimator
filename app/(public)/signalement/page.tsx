import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";
import { LegalSections } from "../_components/legal-sections";

const t = fr.legal.reporting;

export const metadata: Metadata = {
  title: t.metaTitle,
  alternates: { canonical: "/signalement" },
};

// Reporting and moderation policy (legal file of 9 October, DECISIONS.md
// 2026-11-09): how to report, decisions, contesting them.
export default function ReportingPage() {
  return (
    <LegalPage title={t.title} lead={t.lead} updated={t.updated} contact={t.contact} draft={false}>
      <LegalSections sections={t.sections} />
    </LegalPage>
  );
}
