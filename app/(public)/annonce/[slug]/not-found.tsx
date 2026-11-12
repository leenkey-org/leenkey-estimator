import { NotFoundScreen } from "@/components/shared/not-found-screen";
import { frErrors } from "@/lib/i18n/sections/errors";
import { frListing } from "@/lib/i18n/sections/listing";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { errors: frErrors, listing: frListing } as const;

// Listing that does not exist or is not published (docs/DESIGN.md 13.1, 404).
export default function ListingNotFound() {
  const t = fr.errors.notFound;
  return (
    <NotFoundScreen
      title={t.title}
      text={fr.listing.notFound.text}
      action={{ href: "/", label: t.action }}
    />
  );
}
