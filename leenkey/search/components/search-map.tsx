"use client";

import { useEffect, useRef, useState } from "react";
import type { MapListing } from "../map-listings";
import { MapNotice } from "@/components/shared/map-gate";
import { LEENKEY_MAP_STYLE } from "@/components/shared/map-style";
import type { GoogleMap, LatLngLiteral } from "@/core/maps/google-maps";
import { createLabelLayer, type LabelLayer } from "@/core/maps/label-layer";
import { useGoogleMaps } from "@/core/maps/use-google-maps";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Map of the results (L1-16, docs/DESIGN.md 8): Google Maps in the style of
// Leenkey, a price pill per listing, framed on the results. Mounted only
// after the visitor chose to show the map.

const ZOOM = 12;
const ZOOM_ONE = 14;
const FIT_PADDING = 56;

/**
 * Price pill (DESIGN.md 8): white, 1.5 px line, floating; blue with white
 * text and above the others when its card is hovered, when chosen, or under
 * the pointer. `scale` leaves `transform` to the position of the pill.
 */
const PILL = cn(
  "absolute left-0 top-0 cursor-pointer whitespace-nowrap rounded-full border-[1.5px] border-lk-line bg-lk-surface px-2.5 py-1.5",
  "text-lk-label font-semibold tabular text-lk-ink shadow-float",
  "duration-140 ease-out-lk motion-safe:transition-[scale,background-color,border-color,color]",
  "hover:z-20 hover:scale-105 hover:border-lk-blue hover:bg-lk-blue hover:text-white",
  "data-active:z-10 data-active:scale-105 data-active:border-lk-blue data-active:bg-lk-blue data-active:text-white",
  "focus-visible:z-20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
  "lg:px-3 lg:py-2",
);

export function SearchMap({
  apiKey,
  listings,
  centre,
  activeId,
  onHover,
  onSelect,
  className,
}: {
  apiKey: string;
  listings: readonly MapListing[];
  /** Without results: the place searched, or the launch zone. */
  centre: LatLngLiteral;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const maps = useGoogleMaps(apiKey);
  const element = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<{ map: GoogleMap; layer: LabelLayer } | null>(null);
  // The latest handlers and listings, for the pills created once.
  const handlers = useRef({ onHover, onSelect });
  const latest = useRef({ listings, centre });
  useEffect(() => {
    handlers.current = { onHover, onSelect };
    latest.current = { listings, centre };
  });

  useEffect(() => {
    if (maps.status !== "ready" || !element.current) return;
    const { api } = maps;
    const map = new api.maps.Map(element.current, {
      center: latest.current.centre,
      zoom: ZOOM,
      styles: LEENKEY_MAP_STYLE,
      clickableIcons: false,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: api.core.ControlPosition.RIGHT_TOP },
      gestureHandling: "greedy",
      minZoom: 8,
      maxZoom: 18,
    });
    const layer = createLabelLayer(api, map, {
      className: PILL,
      onSelect: (id) => handlers.current.onSelect(id),
      onHover: (id) => handlers.current.onHover(id),
    });
    setView({ map, layer });
    return () => {
      layer.remove();
      setView(null);
    };
  }, [maps]);

  // The pills, and the map framed on them when the results or the place
  // change (`ids`, `place`: new arrays of the same ones keep the view).
  const ids = listings.map((listing) => listing.id).join(",");
  const place = `${centre.lat},${centre.lng}`;
  useEffect(() => {
    if (!view || maps.status !== "ready") return;
    const { map, layer } = view;
    const current = latest.current.listings;
    layer.setLabels(
      current.map(({ id, position, label, name }) => ({ id, position, text: label, name })),
    );
    const [first, ...others] = current;
    if (!first) {
      map.setCenter(latest.current.centre);
      map.setZoom(ZOOM);
    } else if (others.length === 0) {
      map.setCenter(first.position);
      map.setZoom(ZOOM_ONE);
    } else {
      const bounds = new maps.api.core.LatLngBounds();
      for (const listing of current) bounds.extend(listing.position);
      map.fitBounds(bounds, FIT_PADDING);
    }
  }, [view, maps, ids, place]);

  useEffect(() => {
    view?.layer.setActive(activeId);
  }, [view, activeId, ids]);

  if (maps.status === "error") {
    return <MapNotice className={className}>{fr.maps.unavailable}</MapNotice>;
  }
  return (
    <div role="region" aria-label={fr.search.map.region} className={cn("relative", className)}>
      <div ref={element} className="absolute inset-0" />
      {maps.status === "loading" ? (
        <MapNotice busy className="absolute inset-0">
          {fr.maps.loading}
        </MapNotice>
      ) : null}
    </div>
  );
}
