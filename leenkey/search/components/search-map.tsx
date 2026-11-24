"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Minus, Plus, Search } from "lucide-react";
import type { MapListing } from "../map-listings";
import { MapPreview } from "./map-preview";
import { MapNotice } from "@/components/shared/map-notice";
import { LEENKEY_MAP_STYLE } from "@/components/shared/map-style";
import { centreBelow } from "@/core/maps/geometry";
import type { GoogleMap, GoogleMapsApi, LatLngLiteral, Padding } from "@/core/maps/google-maps";
import { createLabelLayer, type LabelLayer } from "@/core/maps/label-layer";
import { useGoogleMaps } from "@/core/maps/use-google-maps";
import { frMaps } from "@/lib/i18n/sections/maps";
import { frSearch } from "@/lib/i18n/sections/search";
import { cn } from "@/lib/utils";
import { SearchBbox as SearchBboxSchema, type SearchBbox } from "@/lib/validations/search";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { maps: frMaps, search: frSearch } as const;

// Map of the results (L1-16, docs/DESIGN.md 8): Google Maps in the style of
// Leenkey, a price pill per listing, framed on the results; in the way of
// Airbnb since L1-62, a pill chosen shows its card over the map and our own
// zoom buttons replace those of Google. Mounted only when the map is shown
// (L1-63). Since L1-16b, pills that pile up at a low zoom are grouped in a
// round navy button with their number, and once the person has moved the
// map, « Rechercher dans cette zone » searches inside the area shown.

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

/**
 * Group of pills (L1-16b, DESIGN.md 8): round, navy on a white ring, its
 * number in white, above the pills; in the gradient while the card of one of
 * its listings is hovered. 40 px, a target of 44.
 */
const CLUSTER = cn(
  "absolute left-0 top-0 z-2 flex size-10 cursor-pointer items-center justify-center rounded-full border-2 border-lk-surface bg-lk-navy",
  "text-lk-label font-semibold tabular text-white shadow-float",
  "duration-140 ease-out-lk motion-safe:transition-[scale]",
  "hover:z-20 hover:scale-105 data-active:z-10 data-active:scale-105 data-active:lk-gradient",
  "focus-visible:z-20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue",
  "after:absolute after:-inset-0.5",
);
/** Pills grouped beyond 3 piled up (DESIGN.md 8), within about a pill of each other. */
const CLUSTER_MIN_SIZE = 4;
const CLUSTER_RADIUS_PX = 40;

/** « Rechercher dans cette zone »: a white pill at the top, in the middle (Airbnb). */
const SEARCH_AREA = cn(
  "absolute top-3 left-1/2 z-10 flex h-11 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-lk-surface px-4",
  "text-lk-label font-semibold text-lk-ink shadow-float transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue [&_svg]:size-4",
);

/** The area shown by the map, as the search reads it. */
function areaOf(map: GoogleMap): SearchBbox | null {
  const bounds = map.getBounds();
  if (!bounds) return null;
  const north = bounds.getNorthEast();
  const south = bounds.getSouthWest();
  return { south: south.lat(), west: south.lng(), north: north.lat(), east: north.lng() };
}

const sameArea = (a: SearchBbox | null, b: SearchBbox | null) =>
  a !== null &&
  b !== null &&
  a.south === b.south &&
  a.west === b.west &&
  a.north === b.north &&
  a.east === b.east;

/** The map framed on an area (a link with « bbox », or a page opened again). */
function fitArea(api: GoogleMapsApi, map: GoogleMap, area: SearchBbox) {
  const bounds = new api.core.LatLngBounds(
    { lat: area.south, lng: area.west },
    { lat: area.north, lng: area.east },
  );
  map.fitBounds(bounds, 0);
}

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

/**
 * The room left for the pill: the part of the map seen on the screen (the
 * bottom of the panel of the desktop is under the fold until the page is
 * scrolled), less the card, above or under it. Viewport pixels.
 */
function freeRoom(
  region: HTMLElement | null,
  preview: HTMLElement | null,
): { box: DOMRect; top: number; bottom: number } | null {
  const box = region?.getBoundingClientRect();
  const card = preview?.getBoundingClientRect();
  if (!box || !card) return null;
  const top = Math.max(box.top, 0);
  const bottom = Math.min(box.bottom, window.innerHeight);
  return card.top - box.top < box.bottom - card.bottom
    ? { box, top: card.bottom, bottom }
    : { box, top, bottom: card.top };
}

/** The pixels the centre goes south for the pill to sit in the middle of that room. */
function shiftForCard(region: HTMLElement | null, preview: HTMLElement | null): number | null {
  const room = freeRoom(region, preview);
  if (!room) return null;
  return room.box.top + room.box.height / 2 - (room.top + room.bottom) / 2;
}

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
  bbox = null,
  onSearchArea,
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
  /** The area of the map the search is limited to (L1-16b): the map is framed on it. */
  bbox?: SearchBbox | null;
  /** « Rechercher dans cette zone »: the area shown, once the person moved the map. */
  onSearchArea?: (bbox: SearchBbox) => void;
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
  const latest = useRef({ listings, centre, padding, selectedId, bbox });
  useEffect(() => {
    handlers.current = { onHover, onSelect, onVisit };
    latest.current = { listings, centre, padding, selectedId, bbox };
  });
  // « Rechercher dans cette zone » (L1-16b): shown once the person moved the
  // map (drag, wheel, pinch, keys, our zoom, a group), never after a move of
  // the page itself (framing, a card shown).
  const [moved, setMoved] = useState(false);
  const gesture = useRef(false);
  /** The area searched from the map: the results that follow keep the view. */
  const keepView = useRef(false);

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
      clusters: {
        className: CLUSTER,
        name: t.cluster,
        minSize: CLUSTER_MIN_SIZE,
        radius: CLUSTER_RADIUS_PX,
        maxZoom: MAX_ZOOM,
        // A group chosen: the map shows its pills (a move of the person).
        onSelect: (positions) => {
          const bounds = new api.core.LatLngBounds();
          for (const position of positions) bounds.extend(position);
          gesture.current = true;
          map.fitBounds(bounds, latest.current.padding);
        },
      },
    });
    // A press on the map itself, never on a pill or the card: the card closes.
    const click = map.addListener("click", () => handlers.current.onSelect(null));
    // The moves of the person: the button shows once the map is still again
    // and shows another area than the last one seen.
    let shown = areaOf(map);
    const drag = map.addListener("dragstart", () => {
      gesture.current = true;
    });
    const idle = map.addListener("idle", () => {
      const area = areaOf(map);
      if (gesture.current && !sameArea(area, shown)) setMoved(true);
      gesture.current = false;
      shown = area;
    });
    // The wheel, a double press, two fingers, the keys of Google: a move of
    // the person, unless on a pill or a group (they never move the map).
    const target = element.current;
    const onMap = (event: Event) =>
      !(event.target instanceof Element && event.target.closest("button"));
    const mark = (event: Event) => {
      if (onMap(event)) gesture.current = true;
    };
    const pinch = (event: TouchEvent) => {
      if (event.touches.length > 1) mark(event);
    };
    const listen = { capture: true, passive: true } as const;
    target.addEventListener("wheel", mark, listen);
    target.addEventListener("dblclick", mark, listen);
    target.addEventListener("keydown", mark, listen);
    target.addEventListener("touchstart", pinch, listen);
    setView({ map, layer });
    return () => {
      click.remove();
      drag.remove();
      idle.remove();
      target.removeEventListener("wheel", mark, listen);
      target.removeEventListener("dblclick", mark, listen);
      target.removeEventListener("keydown", mark, listen);
      target.removeEventListener("touchstart", pinch, listen);
      layer.remove();
      setView(null);
    };
  }, [maps]);

  // The pills, and the map framed on them when the results or the place
  // change (`ids`, `place`: new arrays of the same ones keep the view). A
  // card shown before is closed: the map is framed again under it.
  // With an area searched (L1-16b), the map is framed on it, or keeps its
  // view when the area comes from the map itself.
  const ids = listings.map((listing) => listing.id).join(",");
  const place = `${centre.lat},${centre.lng}`;
  const area = bbox ? `${bbox.south},${bbox.west},${bbox.north},${bbox.east}` : "";
  useEffect(() => {
    if (!view || maps.status !== "ready") return;
    const { map, layer } = view;
    if (latest.current.selectedId) handlers.current.onSelect(null);
    const current = latest.current.listings;
    layer.setLabels(
      current.map(({ id, position, label, name }) => ({ id, position, text: label, name })),
    );
    // A move of the page, not of the person: no « Rechercher dans cette zone ».
    gesture.current = false;
    setMoved(false);
    const [first, ...others] = current;
    const searched = latest.current.bbox;
    if (keepView.current) {
      keepView.current = false;
    } else if (searched) {
      fitArea(maps.api, map, searched);
    } else if (!first) {
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
  }, [view, maps, ids, place, area]);

  useEffect(() => {
    view?.layer.setActive(activeId);
  }, [view, activeId, ids]);

  useEffect(() => {
    view?.layer.setVisited(visited);
  }, [view, visited, ids]);

  const selected = listings.find((listing) => listing.id === selectedId) ?? null;

  // A pill chosen: lit, seen; the map moves only when the pill is not in
  // the room left by the card (Airbnb), and the focus goes to the card.
  useEffect(() => {
    view?.layer.setSelected(selectedId);
    const chosen = latest.current.listings.find((listing) => listing.id === selectedId);
    if (!view || !chosen) return;
    handlers.current.onVisit(chosen.id);
    const room = freeRoom(region.current, preview.current);
    const pill = region.current
      ?.querySelector(`[data-label-id="${CSS.escape(chosen.id)}"]`)
      ?.getBoundingClientRect();
    const inRoom =
      room &&
      pill &&
      pill.left >= room.box.left + MARGIN_PX &&
      pill.right <= room.box.right - MARGIN_PX &&
      pill.top >= room.top + MARGIN_PX &&
      pill.bottom <= room.bottom - MARGIN_PX;
    const shift = shiftForCard(region.current, preview.current);
    const zoom = view.map.getZoom();
    if (!inRoom && shift !== null && zoom !== undefined) {
      // A move of the page: never « Rechercher dans cette zone ».
      gesture.current = false;
      const target = centreBelow(chosen.position, zoom, shift);
      if (reducedMotion()) view.map.setCenter(target);
      else view.map.panTo(target);
    }
    preview.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
  }, [view, selectedId]);

  /** A step of zoom; a card shown, its pill kept in the room above it. */
  function zoomTo(zoom: number) {
    if (!view) return;
    gesture.current = true;
    view.map.setZoom(zoom);
    const shift = selected ? shiftForCard(region.current, preview.current) : null;
    if (selected && shift !== null) view.map.setCenter(centreBelow(selected.position, zoom, shift));
  }

  /** « Rechercher dans cette zone »: the list limited to the area shown. */
  function searchArea() {
    const shown = view ? areaOf(view.map) : null;
    const parsed = shown ? SearchBboxSchema.safeParse(shown) : null;
    setMoved(false);
    if (!parsed?.success || !onSearchArea) return;
    keepView.current = true;
    onSearchArea(parsed.data);
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
      {view && moved && onSearchArea && !selected ? (
        <button type="button" onClick={searchArea} className={SEARCH_AREA}>
          <Search aria-hidden="true" strokeWidth={2} />
          {t.searchArea}
        </button>
      ) : null}
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
