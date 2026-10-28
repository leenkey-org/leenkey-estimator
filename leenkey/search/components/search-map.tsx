"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { MapListing } from "../map-listings";
import { MapPreview } from "./map-preview";
import { MapNotice } from "@/components/shared/map-gate";
import { LEENKEY_MAP_STYLE } from "@/components/shared/map-style";
import { centreBelow } from "@/core/maps/geometry";
import type { GoogleMap, LatLngLiteral, Padding } from "@/core/maps/google-maps";
import { createLabelLayer, type LabelLayer } from "@/core/maps/label-layer";
import { useGoogleMaps } from "@/core/maps/use-google-maps";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Map of the results (L1-16, docs/DESIGN.md 8): Google Maps in the style of
// Leenkey, a price pill per listing, framed on the results; in the way of
// Airbnb since L1-62, a pill chosen shows its card over the map and our own
// zoom buttons replace those of Google. Mounted only after the visitor chose
// to show the map.

const t = fr.search.map;
const ZOOM = 12;
const ZOOM_ONE = 14;
const MIN_ZOOM = 8;
const MAX_ZOOM = 18;
const FIT_PADDING = 56;

/**
 * Price pill (DESIGN.md 8): white, 1.5 px line, floating; in the gradient of
 * the charte, white text and above the others when its card is hovered,
 * when chosen, or under the pointer; light grey once its card was seen
 * (Airbnb). `scale` leaves `transform` to the position of the pill. A pill
 * that would cover an earlier one is a dot (label-layer.ts) until the zoom
 * makes room, or while it is hovered, focused or active.
 */
const PILL = cn(
  "absolute left-0 top-0 cursor-pointer whitespace-nowrap rounded-full border-[1.5px] border-lk-line bg-lk-surface px-2.5 py-1.5",
  "text-lk-label font-semibold tabular text-lk-ink shadow-float",
  "duration-140 ease-out-lk motion-safe:transition-[scale,background-color,border-color,color]",
  "data-visited:border-lk-line-strong data-visited:bg-lk-stone-2 data-visited:text-lk-ink-2",
  "hover:z-20 hover:scale-105 hover:lk-gradient hover:border-transparent hover:text-white",
  "data-active:z-10 data-active:scale-105 data-active:lk-gradient data-active:border-transparent data-active:text-white",
  "focus-visible:z-20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue",
  "lg:px-3 lg:py-2",
  // The dot: 14 px navy on a white ring, under the pills, a target of 44 px
  // (written out in full for Tailwind to find them).
  "data-collapsed:not-data-active:not-hover:not-focus-visible:z-0 data-collapsed:not-data-active:not-hover:not-focus-visible:size-3.5 data-collapsed:not-data-active:not-hover:not-focus-visible:border-2 data-collapsed:not-data-active:not-hover:not-focus-visible:border-lk-surface data-collapsed:not-data-active:not-hover:not-focus-visible:bg-lk-navy data-collapsed:not-data-active:not-hover:not-focus-visible:p-0 data-collapsed:not-data-active:not-hover:not-focus-visible:text-[0px] data-collapsed:not-data-active:not-hover:not-focus-visible:after:-inset-[15px]",
  // A pill above the dots, its target 44 px high at least.
  "z-1 after:absolute after:-inset-2",
);

const ZOOM_BUTTON =
  "flex size-11 items-center justify-center text-lk-ink transition-colors duration-140 ease-out-lk not-disabled:hover:bg-lk-stone-2 disabled:text-lk-field focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid [&_svg]:size-4.5";

/** « + » and « − » at the top right, white and rounded (Airbnb), off at the limits. */
function ZoomButtons({ map }: { map: GoogleMap }) {
  const [zoom, setZoom] = useState(() => map.getZoom() ?? ZOOM);
  useEffect(() => {
    const listener = map.addListener("zoom_changed", () => setZoom(map.getZoom() ?? ZOOM));
    return () => listener.remove();
  }, [map]);
  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded-full bg-lk-surface shadow-float">
      <button
        type="button"
        aria-label={t.zoomIn}
        disabled={zoom >= MAX_ZOOM}
        onClick={() => map.setZoom(Math.min(MAX_ZOOM, (map.getZoom() ?? ZOOM) + 1))}
        className={ZOOM_BUTTON}
      >
        <Plus aria-hidden="true" strokeWidth={2.2} />
      </button>
      <span aria-hidden="true" className="mx-2.5 h-px bg-lk-line" />
      <button
        type="button"
        aria-label={t.zoomOut}
        disabled={zoom <= MIN_ZOOM}
        onClick={() => map.setZoom(Math.max(MIN_ZOOM, (map.getZoom() ?? ZOOM) - 1))}
        className={ZOOM_BUTTON}
      >
        <Minus aria-hidden="true" strokeWidth={2.2} />
      </button>
    </div>
  );
}

export function SearchMap({
  apiKey,
  listings,
  centre,
  activeId,
  selectedId,
  onHover,
  onSelect,
  padding = FIT_PADDING,
  previewClassName,
  className,
}: {
  apiKey: string;
  listings: readonly MapListing[];
  /** Without results: the place searched, or the launch zone. */
  centre: LatLngLiteral;
  /** The pill lit: its card hovered in the list, or chosen. */
  activeId: string | null;
  /** The pill chosen: its card over the map. */
  selectedId: string | null;
  onHover: (id: string | null) => void;
  /** A pill chosen, or null when its card is closed. */
  onSelect: (id: string | null) => void;
  /** Room kept around the pills when the map is framed on them. */
  padding?: Padding;
  /** Where the card of the pill chosen sits over the map. */
  previewClassName?: string;
  className?: string;
}) {
  const maps = useGoogleMaps(apiKey);
  const region = useRef<HTMLDivElement>(null);
  const element = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLElement>(null);
  const [view, setView] = useState<{ map: GoogleMap; layer: LabelLayer } | null>(null);
  // The pills whose card was seen during the visit (Airbnb).
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());
  // The latest handlers and listings, for the pills created once.
  const handlers = useRef({ onHover, onSelect });
  const latest = useRef({ listings, centre, padding });
  useEffect(() => {
    handlers.current = { onHover, onSelect };
    latest.current = { listings, centre, padding };
  });

  useEffect(() => {
    if (maps.status !== "ready" || !element.current) return;
    const { api } = maps;
    const map = new api.maps.Map(element.current, {
      center: latest.current.centre,
      zoom: ZOOM,
      styles: LEENKEY_MAP_STYLE,
      clickableIcons: false,
      // Our zoom buttons (ZoomButtons), the logo and the terms of Google stay.
      disableDefaultUI: true,
      gestureHandling: "greedy",
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    const layer = createLabelLayer(api, map, {
      className: PILL,
      onSelect: (id) => handlers.current.onSelect(id),
      onHover: (id) => handlers.current.onHover(id),
    });
    // A press on the map itself, never on a pill or the card: the card closes.
    const click = map.addListener("click", () => handlers.current.onSelect(null));
    setView({ map, layer });
    return () => {
      click.remove();
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
      map.fitBounds(bounds, latest.current.padding);
    }
  }, [view, maps, ids, place]);

  useEffect(() => {
    view?.layer.setActive(activeId);
  }, [view, activeId, ids]);

  useEffect(() => {
    view?.layer.setVisited(visited);
  }, [view, visited, ids]);

  // A pill chosen: seen; the map moves its pill to the middle of the room
  // left above the card, and the focus goes to the card, its link first.
  const selected = listings.find((listing) => listing.id === selectedId) ?? null;
  useEffect(() => {
    // On a new choice only: the listings are read, not watched.
    const chosen = latest.current.listings.find((listing) => listing.id === selectedId);
    if (!view || !chosen) return;
    setVisited((seen) => (seen.has(chosen.id) ? seen : new Set(seen).add(chosen.id)));
    const box = region.current?.getBoundingClientRect();
    const card = preview.current?.getBoundingClientRect();
    const zoom = view.map.getZoom();
    if (box && card && zoom !== undefined) {
      const free = card.top - box.top;
      view.map.panTo(centreBelow(chosen.position, zoom, Math.max(0, box.height / 2 - free / 2)));
    }
    preview.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
  }, [view, selectedId]);

  function close() {
    const id = selectedId;
    onSelect(null);
    if (id) view?.layer.focus(id);
  }

  if (maps.status === "error") {
    return <MapNotice className={className}>{fr.maps.unavailable}</MapNotice>;
  }
  return (
    <div
      ref={region}
      role="region"
      aria-label={t.region}
      className={cn("relative overflow-hidden", className)}
    >
      <div ref={element} className="absolute inset-0" />
      {view ? <ZoomButtons map={view.map} /> : null}
      {selected ? (
        <MapPreview
          ref={preview}
          listing={selected}
          onClose={close}
          className={cn("absolute z-10", previewClassName)}
        />
      ) : null}
      {maps.status === "loading" ? (
        <MapNotice busy className="absolute inset-0">
          {fr.maps.loading}
        </MapNotice>
      ) : null}
    </div>
  );
}
