import { NotFoundScreen } from "@/components/shared/not-found-screen";
import { fr } from "@/lib/i18n/fr";

// Listing that does not exist or is not published (docs/DESIGN.md 13.1, 404).
export default function ListingNotFound() {
  const t = fr.listing.notFound;
  return <NotFoundScreen title={t.title} text={t.text} action={{ href: "/", label: t.action }} />;
}
