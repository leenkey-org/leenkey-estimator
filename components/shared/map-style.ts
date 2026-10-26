import type { MapTypeStyle } from "@/core/maps/google-maps";

// Style of the maps of Leenkey (docs/DESIGN.md 8), applied by the page: no map
// ID to set in the Google Cloud console. Colours muted so that the blue of the
// brand stays for the price pills and the area of a listing: land in the
// warm white of the pages, water #CFE0F0, roads white then sand, shops and
// businesses hidden.

/** Colours drawn by Google, each the value of a token of app/globals.css (tested). */
export const MAP_TOKENS = {
  ink: "#1c1b19",
  "ink-3": "#6b6459",
  surface: "#ffffff",
  bg: "#faf8f5",
  sand: "#f1ede7",
  line: "#ece6dd",
  "line-strong": "#ddd5ca",
  blue: "#1156fc",
} as const;

const INK = MAP_TOKENS.ink;
const INK_3 = MAP_TOKENS["ink-3"];
const SURFACE = MAP_TOKENS.surface;
const PAGE = MAP_TOKENS.bg;
const SAND = MAP_TOKENS.sand;
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
  { featureType: "poi", elementType: "geometry", stylers: [{ color: SAND }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e4ecdc" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: SURFACE }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: LINE }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: SURFACE }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: SAND }] },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: LINE_STRONG }],
  },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: LINE_STRONG }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe0f0" }] },
];
