import Link from "next/link";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FacadeRoot } from "@/components/shared/facade-root";
import { fr } from "@/lib/i18n/fr";

// Listing that does not exist or is not published (docs/DESIGN.md 13.1, 404:
// G8 variant, facade.svg in white on the blue flat).
export default function ListingNotFound() {
  const t = fr.listing.notFound;
  return (
    <FacadeRoot className="flex min-h-screen items-center justify-center bg-lk-blue px-5 py-16 text-white">
      <main>
        <EmptyState
          tone="blue"
          titleAs="h1"
          title={t.title}
          description={t.text}
          action={
            <Button asChild variant="inverse" size="lg">
              <Link href="/">{t.action}</Link>
            </Button>
          }
        />
      </main>
    </FacadeRoot>
  );
}
