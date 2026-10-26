import { placeLabel, toPropertyCard } from "./cards";
import type { SearchListing } from "./queries";
import { propertySummary, type PropertyCardData } from "@/components/shared/property-card";
import type { LatLngLiteral } from "@/core/maps/google-maps";
import { LAUNCH_ZONE_CENTRE } from "@/lib/config/launch-zone";
import { formatPriceShort } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

// The results on the map (L1-16): one price pill per listing at its public
// location (snapped to about 200 m, never the address). A listing without
// one is in the list only.

export type MapListing = {
  id: string;
  position: LatLngLiteral;
  /** « 350 k€ » on the pill. */
  label: string;
  /** Name of the pill: its text, then kind and place as the card says them. */
  name: string;
  /** The card shown over the map on a phone. */
  card: PropertyCardData;
};

export function toMapListings(items: readonly SearchListing[], now: Date): MapListing[] {
  return items.flatMap((item) => {
    if (item.lat === null || item.lng === null) return [];
    const card = toPropertyCard(item, now);
    const label = formatPriceShort(item.priceCents);
    return [
      {
        id: item.id,
        position: { lat: item.lat, lng: item.lng },
        label,
        name: fr.search.map.pill(
          label,
          propertySummary(card, "long", true),
          placeLabel(item.city, item.district),
        ),
        card,
      },
    ];
  });
}

/** Where the map opens without results: the place searched, else Épinay-sur-Orge. */
export function mapCentre(place: { centre?: LatLngLiteral } | null): LatLngLiteral {
  return place?.centre ?? { ...LAUNCH_ZONE_CENTRE };
}
