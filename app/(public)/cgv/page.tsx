import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";

const t = fr.legal.salesTerms;

export const metadata: Metadata = { title: t.metaTitle };

// L1-36. TODO(client): final text from Cédric's lawyer (Q34): withdrawal,
// mediator (Q32), contract sheet of the plans (Q30). Ordering stays closed
// in production until then (L1-40).
export default function SalesTermsPage() {
  return <LegalPage title={t.title} lead={t.lead} contact={t.contact} />;
}
