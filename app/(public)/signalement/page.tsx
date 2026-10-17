import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";

const t = fr.legal.reporting;

export const metadata: Metadata = { title: t.metaTitle };

// L1-36: reporting and moderation policy (legal file of 9 October).
// TODO(client): final text from Cédric's lawyer (Q34).
export default function ReportingPage() {
  return <LegalPage title={t.title} lead={t.lead} contact={t.contact} />;
}
