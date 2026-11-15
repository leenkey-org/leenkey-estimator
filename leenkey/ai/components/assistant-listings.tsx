import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PropertyCard } from "@/components/shared/property-card";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import { SEARCH_PATH } from "@/lib/validations/search";
import type { ShownListings } from "../shown";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

const t = fr.assistant.listings;

/**
 * The listings a search of the assistant found (search_listings, L2-06), in
 * the conversation, under the answer: their number, 5 cards at most
 * (PropertyCard compact, DESIGN.md 10.3) and the way to the search page with
 * the same criteria. The addresses are built here, from a slug and from the
 * parameters of the search: never taken as written in the log.
 */
export function AssistantListings({ data }: { data: ShownListings }) {
  const search = data.search ? `${SEARCH_PATH}?${data.search}` : SEARCH_PATH;
  return (
    <section aria-label={t.label} className="flex w-full max-w-[min(100%,40rem)] flex-col gap-2">
      <p className="text-lk-caption font-semibold text-lk-ink-3">{t.count(data.total)}</p>
      <ul className="flex flex-col gap-2">
        {data.items.map((item) => (
          <li key={item.slug}>
            <PropertyCard
              variant="compact"
              href={`/annonce/${item.slug}`}
              priceCents={item.priceCents}
              propertyType={item.type}
              rooms={item.type === "terrain" ? null : item.rooms}
              surfaceM2={item.surfaceM2}
              location={item.place}
              // Decorative: the card says what the photo shows.
              photo={item.cover ? { src: photoUrl(item.cover, 400), alt: "" } : null}
            />
          </li>
        ))}
      </ul>
      <Link
        href={search}
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-lk-label font-semibold text-lk-blue underline-offset-2 hover:underline"
      >
        {data.total > data.items.length ? t.all(data.total) : t.search}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
