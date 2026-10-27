import type { MapTypeStyle } from "@/core/maps/google-maps";

// Style of the maps of Leenkey (docs/DESIGN.md 8), applied by the page: no map
// ID to set in the Google Cloud console. Colours muted so that the blue of the
// brand stays for the price pills and the area of a listing: land in the
// cool white of the pages (charte D), water #CFE0F0, roads white then slate,
// shops and businesses hidden.

/** Colours drawn by Google, each the value of a token of app/globals.css (tested). */
export const MAP_TOKENS = {
  ink: "#0f172a",
  "ink-3": "#5b6880",
  surface: "#ffffff",
  bg: "#f8fafc",
  "stone-2": "#f1f5f9",
  line: "#e2e8f0",
  "line-strong": "#cbd5e1",
  blue: "#2563eb",
} as const;

const INK = MAP_TOKENS.ink;
const INK_3 = MAP_TOKENS["ink-3"];
const SURFACE = MAP_TOKENS.surface;
const PAGE = MAP_TOKENS.bg;
const STONE = MAP_TOKENS["stone-2"];
const LINE = MAP_TOKENS.line;
const LINE_STRONG = MAP_TOKENS["line-strong"];

export const LEENKEY_MAP_STYLE: MapTypeStyle[] = [
  { stylers: [{ saturation: -50 }] },
  { elementType: "labels.text.fill", stylers: [{ color: INK_3 }] },
  { elementType: "labels.text.stroke", stylers: [{ color: SURFACE }, { weight: 3 }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: INK }],
  },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: PAGE }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: STONE }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e4ecdc" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: SURFACE }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: LINE }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: SURFACE }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: STONE }] },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: LINE_STRONG }],
  },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: LINE_STRONG }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe0f0" }] },
];
