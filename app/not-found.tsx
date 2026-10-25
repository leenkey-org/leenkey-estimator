import type { Metadata } from "next";
import { NotFoundScreen } from "@/components/shared/not-found-screen";
import { fr } from "@/lib/i18n/fr";

const t = fr.errors.notFound;

export const metadata: Metadata = { title: t.metaTitle };

// An address of the site that does not exist, or a page this account may not
// see (the back office answers 404 to an account without the admin role):
// the 404 of docs/DESIGN.md 13.1, as the one of a listing.
export default function NotFound() {
  return <NotFoundScreen title={t.title} text={t.text} action={{ href: "/", label: t.action }} />;
}
