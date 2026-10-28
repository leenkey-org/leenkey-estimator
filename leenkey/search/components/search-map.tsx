"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
 * the charte, white text and above the others when its card is hovered, when
 * chosen, or under the pointer; light grey at rest once its card was seen
 * (Airbnb). `scale` leaves `transform` to the position of the pill. A pill
 * that would cover an earlier one is a dot (label-layer.ts) until the zoom
 * makes room, or while it is hovered, focused, lit or chosen. « Seen » and
 * « dot » are variants of app/globals.css: at rest only, never over the
 * gradient.
 */
const PILL = cn(
  "absolute left-0 top-0 cursor-pointer whitespace-nowrap rounded-full border-[1.5px] border-lk-line bg-lk-surface px-2.5 py-1.5",
  "text-lk-label font-semibold tabular text-lk-ink shadow-float",
  "duration-140 ease-out-lk motion-safe:transition-[scale,background-color,border-color,color]",
  "pill-seen:border-lk-line-strong pill-seen:bg-lk-stone-2 pill-seen:text-lk-ink-2",
  "hover:z-20 hover:scale-105 hover:lk-gradient hover:border-transparent hover:text-white",
  "data-active:z-10 data-active:scale-105 data-active:lk-gradient data-active:border-transparent data-active:text-white",
  "data-selected:z-10 data-selected:scale-105 data-selected:lk-gradient data-selected:border-transparent data-selected:text-white",
  "focus-visible:z-20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue",
  "lg:px-3 lg:py-2",
  // The dot: 14 px navy on a white ring, under the pills, a target of 44 px.
  "pill-dot:z-0 pill-dot:size-3.5 pill-dot:border-2 pill-dot:border-lk-surface pill-dot:bg-lk-navy pill-dot:p-0 pill-dot:text-[0px] pill-dot:after:-inset-[15px]",
  // A pill above the dots, its target 44 px high at least.
  "z-1 after:absolute after:-inset-2",
);

const ZOOM_BUTTON =
  "flex size-11 items-center justify-center text-lk-ink transition-colors duration-140 ease-out-lk not-aria-disabled:hover:bg-lk-stone-2 aria-disabled:cursor-not-allowed aria-disabled:text-lk-field focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid [&_svg]:size-4.5";

/**
 * « + » and « − » at the top right, white and rounded (Airbnb). At a limit,
 * off but kept in the order of the focus (aria-disabled, DESIGN.md 15).
 */
function ZoomButtons({ map, onZoom }: { map: GoogleMap; onZoom: (zoom: number) => void }) {
  const [zoom, setZoom] = useState(() => map.getZoom() ?? ZOOM);
  useEffect(() => {
    const listener = map.addListener("zoom_changed", () => setZoom(map.getZoom() ?? ZOOM));
    return () => listener.remove();
  }, [map]);
  const step = (by: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (map.getZoom() ?? ZOOM) + by));
    if (next !== map.getZoom()) onZoom(next);
  };
  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded-full bg-lk-surface shadow-float">
      <button
        type="button"
        aria-label={t.zoomIn}
        aria-disabled={zoom >= MAX_ZOOM || undefined}
        onClick={() => step(1)}
        className={ZOOM_BUTTON}
      >
        <Plus aria-hidden="true" strokeWidth={2} />
      </button>
      <span aria-hidden="true" className="mx-2.5 h-px bg-lk-line" />
      <button
        type="button"
        aria-label={t.zoomOut}
        aria-disabled={zoom <= MIN_ZOOM || undefined}
        onClick={() => step(-1)}
        className={ZOOM_BUTTON}
      >
        <Minus aria-hidden="true" strokeWidth={2} />
      </button>
    </div>
  );
}

/** Room kept between a pill and the edges of the room left above the card. */
const MARGIN_PX = 16;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SearchMap({
  apiKey,
  listings,
  centre,
  activeId,
  selectedId,
  visited,
  onHover,
  onSelect,
  onVisit,
  padding = FIT_PADDING,
  previewClassName,
  previewSizes,
  className,
}: {
  apiKey: string;
  listings: readonly MapListing[];
  /** Without results: the place searched, or the launch zone. */
  centre: LatLngLiteral;
  /** The pill lit: its card hovered in the list. */
  activeId: string | null;
  /** The pill chosen: its card over the map. */
  selectedId: string | null;
  /** The pills whose card was seen during the visit. */
  visited: ReadonlySet<string>;
  onHover: (id: string | null) => void;
  /** A pill chosen, or null when its card is closed or its listing gone. */
  onSelect: (id: string | null) => void;
  /** A card shown: its pill is « seen ». */
  onVisit: (id: string) => void;
  /** Room kept around the pills when the map is framed on them. */
  padding?: Padding;
  /** Where the card of the pill chosen sits over the map. */
  previewClassName?: string;
  /** Widths of its photo, for the images of the right size. */
  previewSizes?: string;
  className?: string;
}) {
  const maps = useGoogleMaps(apiKey);
  const region = useRef<HTMLDivElement>(null);
  const element = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLElement>(null);
  const [view, setView] = useState<{ map: GoogleMap; layer: LabelLayer } | null>(null);
  // The latest handlers, listings and choice, for the pills created once.
  const handlers = useRef({ onHover, onSelect, onVisit });
  const latest = useRef({ listings, centre, padding, selectedId });
  useEffect(() => {
    handlers.current = { onHover, onSelect, onVisit };
    latest.current = { listings, centre, padding, selectedId };
  });

  useEffect(() => {
    if (maps.status !== "ready" || !element.current) return;
    const { api } = maps;
    const map = new api.maps.Map(element.current, {
      center: latest.current.centre,
      zoom: ZOOM,
      styles: LEENKEY_MAP_STYLE,
      clickableIcons: false,
      // Our zoom buttons (ZoomButtons); the logo and the terms of Google stay.
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
  // change (`ids`, `place`: new arrays of the same ones keep the view). A
  // card shown before is closed: the map is framed again under it.
  const ids = listings.map((listing) => listing.id).join(",");
  const place = `${centre.lat},${centre.lng}`;
  useEffect(() => {
    if (!view || maps.status !== "ready") return;
    const { map, layer } = view;
    if (latest.current.selectedId) handlers.current.onSelect(null);
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

  const selected = listings.find((listing) => listing.id === selectedId) ?? null;

  /** The pixels the centre goes south for the pill to sit in the middle of the room above the card. */
  function shiftForCard(): number | null {
    const box = region.current?.getBoundingClientRect();
    const card = preview.current?.getBoundingClientRect();
    if (!box || !card) return null;
    return Math.max(0, box.height / 2 - Math.max(0, card.top - box.top) / 2);
  }

  // A pill chosen: lit, seen; the map moves only when the pill is not in
  // the room left above the card (Airbnb), and the focus goes to the card.
  useEffect(() => {
    view?.layer.setSelected(selectedId);
    const chosen = latest.current.listings.find((listing) => listing.id === selectedId);
    if (!view || !chosen) return;
    handlers.current.onVisit(chosen.id);
    const box = region.current?.getBoundingClientRect();
    const card = preview.current?.getBoundingClientRect();
    const pill = region.current
      ?.querySelector(`[data-label-id="${CSS.escape(chosen.id)}"]`)
      ?.getBoundingClientRect();
    const inRoom =
      box &&
      card &&
      pill &&
      pill.left >= box.left + MARGIN_PX &&
      pill.right <= box.right - MARGIN_PX &&
      pill.top >= box.top + MARGIN_PX &&
      pill.bottom <= card.top - MARGIN_PX;
    const shift = shiftForCard();
    const zoom = view.map.getZoom();
    if (!inRoom && shift !== null && zoom !== undefined) {
      const target = centreBelow(chosen.position, zoom, shift);
      if (reducedMotion()) view.map.setCenter(target);
      else view.map.panTo(target);
    }
    preview.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
  }, [view, selectedId]);

  /** A step of zoom; a card shown, its pill kept in the room above it. */
  function zoomTo(zoom: number) {
    if (!view) return;
    view.map.setZoom(zoom);
    const shift = selected ? shiftForCard() : null;
    if (selected && shift !== null) view.map.setCenter(centreBelow(selected.position, zoom, shift));
  }

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
      data-search-map=""
      // Escape closes the card from anywhere on the map: a pill, the zoom.
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape" && selectedId) {
          event.stopPropagation();
          close();
        }
      }}
      className={cn("relative overflow-hidden", className)}
    >
      <div ref={element} className="absolute inset-0" />
      {view ? <ZoomButtons map={view.map} onZoom={zoomTo} /> : null}
      {selected ? (
        <MapPreview
          // One card per listing: its photo back to the first one.
          key={selected.id}
          ref={preview}
          listing={selected}
          onClose={close}
          sizes={previewSizes}
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
