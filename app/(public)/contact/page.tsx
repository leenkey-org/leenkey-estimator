import type { Metadata } from "next";
import { ContactSection } from "@/leenkey/site/components/home-sections";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.contactPage;
// The lead of the section, Cédric's words as they are.
const description = fr.site.home.contact.lead;

export const metadata: Metadata = {
  title: t.metaTitle,
  description,
  alternates: { canonical: "/contact" },
  openGraph: { title: t.metaTitle, description, url: "/contact" },
};

// /contact (L1-45, DECISIONS 2026-10-20): « Contact » of the menu leads to the
// form of the home page (#contact), on a page of its own.
export default function ContactPage() {
  return (
    <PublicPage>
      <ContactSection titleAs="h1" />
    </PublicPage>
  );
}
