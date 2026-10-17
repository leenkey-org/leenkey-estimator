import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";

const t = fr.legal.privacy;

export const metadata: Metadata = { title: t.metaTitle };

// Linked from the signup form (L1-09) and the footers (L1-36).
// TODO(client): final text from Cédric's lawyer (Q10, Q34).
export default function PrivacyPage() {
  return <LegalPage title={t.title} contact={t.contact} />;
}
