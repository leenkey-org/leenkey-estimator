import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";

const t = fr.legal.ai;

export const metadata: Metadata = { title: t.metaTitle };

// L1-36: AI notice of the SPEC. TODO(client): final text from Cédric's
// lawyer (Q34).
export default function AiNoticePage() {
  return <LegalPage title={t.title} lead={t.lead} contact={t.contact} />;
}
