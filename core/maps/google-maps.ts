// The parts of the Maps JavaScript API that the maps use (reference:
// developers.google.com/maps/documentation/javascript/reference), declared
// here instead of @types/google.maps, a dependency that is not pre-approved
// (DECISIONS 2026-10-08). Only what is called is declared.

export type LatLngLiteral = { lat: number; lng: number };

export interface LatLng {
  lat(): number;
  lng(): number;
}

export interface LatLngBounds {
  extend(point: LatLngLiteral): LatLngBounds;
  isEmpty(): boolean;
}

export interface MapsEventListener {
  remove(): void;
}

/** A rule of a JSON style (raster maps, without a map ID). */
export type MapTypeStyle = {
  featureType?: string;
  elementType?: string;
  stylers: Array<Record<string, string | number>>;
};

export type ControlPosition = number;

export interface MapOptions {
  center: LatLngLiteral;
  zoom: number;
  styles?: MapTypeStyle[];
  clickableIcons?: boolean;
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  zoomControlOptions?: { position: ControlPosition };
  fullscreenControl?: boolean;
  streetViewControl?: boolean;
  mapTypeControl?: boolean;
  cameraControl?: boolean;
  keyboardShortcuts?: boolean;
  gestureHandling?: "cooperative" | "greedy" | "none" | "auto";
  minZoom?: number;
  maxZoom?: number;
  /** Street View of Google (the pegman): on the map of a listing only. */
  streetViewControlOptions?: { position: ControlPosition };
}

/** Room left around bounds fitted, in pixels. */
export type Padding = number | { top: number; right: number; bottom: number; left: number };

export interface GoogleMap {
  fitBounds(bounds: LatLngBounds, padding?: Padding): void;
  /** The Street View of the map, shown in its place when visible. */
  getStreetView(): StreetViewPanorama;
  setCenter(center: LatLngLiteral): void;
  setZoom(zoom: number): void;
  getZoom(): number | undefined;
  panTo(center: LatLngLiteral): void;
  addListener(event: string, handler: () => void): MapsEventListener;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapCanvasProjection {
  fromLatLngToDivPixel(point: LatLng): Point | null;
}

export interface MapPanes {
  overlayMouseTarget: HTMLElement;
}

/** Base of the overlays drawn in HTML over the map (the price pills). */
export interface OverlayView {
  setMap(map: GoogleMap | null): void;
  getMap(): GoogleMap | null | undefined;
  getPanes(): MapPanes | null;
  getProjection(): MapCanvasProjection | null;
}

export interface OverlayViewConstructor {
  new (): OverlayView;
  /** Clicks and drags on the element stay with it, never with the map. */
  preventMapHitsAndGesturesFrom(element: Element): void;
}

export interface CircleOptions {
  center: LatLngLiteral;
  radius: number;
  map: GoogleMap;
  clickable: boolean;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeWeight: number;
}

export interface Circle {
  setMap(map: GoogleMap | null): void;
  setCenter(center: LatLngLiteral): void;
  setRadius(radius: number): void;
  getBounds(): LatLngBounds | null;
}

export interface StreetViewPanorama {
  setPosition(position: LatLng): void;
  setPov(pov: { heading: number; pitch: number }): void;
  setVisible(visible: boolean): void;
  getVisible(): boolean;
  addListener(event: string, handler: () => void): MapsEventListener;
}

export interface StreetViewPanoramaData {
  location?: { latLng?: LatLng };
}

export interface StreetViewService {
  getPanorama(request: {
    location: LatLngLiteral;
    radius: number;
    preference?: string;
    sources?: string[];
  }): Promise<{ data: StreetViewPanoramaData }>;
}

export interface MapsLibrary {
  Map: new (element: HTMLElement, options: MapOptions) => GoogleMap;
  OverlayView: OverlayViewConstructor;
  Circle: new (options: CircleOptions) => Circle;
}

export interface CoreLibrary {
  LatLng: new (lat: number, lng: number) => LatLng;
  LatLngBounds: new () => LatLngBounds;
  ControlPosition: { RIGHT_BOTTOM: ControlPosition; RIGHT_TOP: ControlPosition };
}

export interface StreetViewLibrary {
  StreetViewService: new () => StreetViewService;
  StreetViewPreference: { NEAREST: string };
  StreetViewSource: { OUTDOOR: string };
}

/** `google.maps` once the script has run: its libraries load on demand. */
export interface GoogleMapsNamespace {
  importLibrary(name: "maps"): Promise<MapsLibrary>;
  importLibrary(name: "core"): Promise<CoreLibrary>;
  importLibrary(name: "streetView"): Promise<StreetViewLibrary>;
}

/** The three libraries the maps of the site use, loaded together. */
export type GoogleMapsApi = {
  maps: MapsLibrary;
  core: CoreLibrary;
  streetView: StreetViewLibrary;
};
