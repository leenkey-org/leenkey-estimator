import type { BrowserContext } from "@playwright/test";

// The Maps JavaScript API is replaced by a stand-in in the E2E tests (L1-16):
// no request reaches Google, no key is needed (the CI build has a fake one),
// and the tests read what the page drew. The stand-in implements what
// core/maps calls: Map (Web Mercator, fitBounds), OverlayView (the price
// pills), Circle, LatLng, LatLngBounds, Street View. It marks its element
// with data-fake-map and its zoom in data-zoom, the circle with data-circle,
// the open Street View with data-street-view="open"; a press on the map
// itself (not on a pill) is its « click ». Flags set by a test before the page loads:
// __fakeMapsNoStreetView (no panorama near), __fakeMapsAuthFailure (key refused).

export const MAPS_SCRIPT = /maps\.googleapis\.com\/maps\/api\/js/;
/** Any host of Google Maps: none may be asked before « Afficher la carte ». */
export const MAPS_HOSTS = /maps\.googleapis\.com|maps\.gstatic\.com|mapsresources-pa/;

const FAKE_MAPS = String.raw`(() => {
  const script = document.currentScript;
  const callback = new URL(script.src).searchParams.get("callback");
  const TILE = 256;
  const world = (point) => {
    const sin = Math.min(Math.max(Math.sin((point.lat * Math.PI) / 180), -0.9999), 0.9999);
    return {
      x: TILE * (0.5 + point.lng / 360),
      y: TILE * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)),
    };
  };
  const literal = (point) =>
    typeof point.lat === "function" ? { lat: point.lat(), lng: point.lng() } : point;
  const events = () => {
    const handlers = new Map();
    return {
      add(name, handler) {
        if (!handlers.has(name)) handlers.set(name, []);
        handlers.get(name).push(handler);
        return { remove: () => handlers.set(name, handlers.get(name).filter((h) => h !== handler)) };
      },
      emit(name) {
        for (const handler of handlers.get(name) ?? []) handler();
      },
    };
  };

  class LatLng {
    constructor(lat, lng) { this._lat = lat; this._lng = lng; }
    lat() { return this._lat; }
    lng() { return this._lng; }
  }
  class LatLngBounds {
    constructor() { this.points = []; }
    extend(point) { this.points.push(literal(point)); return this; }
    isEmpty() { return this.points.length === 0; }
  }
  class StreetViewPanorama {
    constructor(element) { this.element = element; this.visible = false; this.events = events(); }
    setPano(pano) { this.pano = pano; }
    setOptions(options) { this.options = { ...this.options, ...options }; }
    setPosition(position) { this.position = literal(position); }
    setPov() {}
    setVisible(visible) {
      this.visible = visible;
      this.element.setAttribute("data-street-view", visible ? "open" : "closed");
      this.events.emit("visible_changed");
    }
    getVisible() { return this.visible; }
    addListener(name, handler) { return this.events.add(name, handler); }
  }
  class GoogleMap {
    constructor(element, options) {
      this.element = element;
      this.options = options;
      this.center = options.center;
      this.zoom = options.zoom;
      this.overlays = [];
      this.events = events();
      element.setAttribute("data-fake-map", "");
      element.setAttribute("data-zoom", String(options.zoom));
      // A press on the map itself, never on a pill: the « click » of the map.
      element.addEventListener("click", (event) => {
        if (event.target === element || event.target === this.pane) this.events.emit("click");
      });
      element.style.background = "#e9e5df";
      element.style.overflow = "hidden";
      this.pane = document.createElement("div");
      // As .gm-style of Google: its own stack, never above the card shown over it.
      this.pane.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:0;";
      element.append(this.pane);
      this.streetView = new StreetViewPanorama(element);
    }
    size() { return { width: this.element.clientWidth, height: this.element.clientHeight }; }
    redraw() { for (const overlay of this.overlays) overlay.draw?.(); }
    setCenter(center) { this.center = literal(center); this.offset = null; this.redraw(); }
    setZoom(zoom) { this.zoom = zoom; this.zoomed(); this.redraw(); }
    zoomed() {
      this.element.setAttribute("data-zoom", String(this.zoom));
      this.events.emit("zoom_changed");
    }
    getZoom() { return this.zoom; }
    panTo(center) { this.setCenter(center); }
    fitBounds(bounds, padding = 0) {
      const room =
        typeof padding === "number"
          ? { top: padding, right: padding, bottom: padding, left: padding }
          : padding;
      const points = bounds.points.map(world);
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const { width, height } = this.size();
      const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1e-9);
      const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 1e-9);
      const zoom = Math.log2(
        Math.min(
          (width - room.left - room.right) / spanX,
          (height - room.top - room.bottom) / spanY,
        ),
      );
      this.zoom = Math.min(Math.floor(zoom), this.options.maxZoom ?? 21);
      this.zoomed();
      const lats = bounds.points.map((p) => p.lat);
      const lngs = bounds.points.map((p) => p.lng);
      this.center = {
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      };
      // Asymmetric room moves the bounds into the free area, as Google does.
      this.offset = { x: (room.left - room.right) / 2, y: (room.top - room.bottom) / 2 };
      this.redraw();
    }
    project(point) {
      const scale = 2 ** this.zoom;
      const at = world(literal(point));
      const centre = world(this.center);
      const { width, height } = this.size();
      const offset = this.offset ?? { x: 0, y: 0 };
      return {
        x: width / 2 + offset.x + (at.x - centre.x) * scale,
        y: height / 2 + offset.y + (at.y - centre.y) * scale,
      };
    }
    addListener(name, handler) { return this.events.add(name, handler); }
    getStreetView() { return this.streetView; }
  }
  class OverlayView {
    static preventMapHitsAndGesturesFrom() {}
    setMap(map) {
      if (this.map) {
        this.map.overlays = this.map.overlays.filter((overlay) => overlay !== this);
        this.onRemove?.();
      }
      this.map = map;
      if (map) {
        map.overlays.push(this);
        this.onAdd?.();
        this.draw?.();
      }
    }
    getMap() { return this.map; }
    getPanes() { return this.map ? { overlayMouseTarget: this.map.pane } : null; }
    getProjection() {
      const map = this.map;
      return map ? { fromLatLngToDivPixel: (point) => map.project(point) } : null;
    }
  }
  class Circle {
    constructor(options) {
      this.options = options;
      options.map.element.setAttribute("data-circle", String(options.radius));
    }
    setMap(map) { if (!map) this.options.map.element.removeAttribute("data-circle"); }
    setCenter(center) { this.options.center = center; }
    setRadius(radius) { this.options.radius = radius; }
    getBounds() {
      const { center, radius } = this.options;
      const dLat = radius / 111320;
      const dLng = radius / (111320 * Math.cos((center.lat * Math.PI) / 180));
      return new LatLngBounds()
        .extend({ lat: center.lat - dLat, lng: center.lng - dLng })
        .extend({ lat: center.lat + dLat, lng: center.lng + dLng });
    }
  }
  class StreetViewService {
    getPanorama(request) {
      if (window.__fakeMapsNoStreetView) {
        // As MapsRequestError: the status in code, the message free.
        return Promise.reject(Object.assign(new Error("no panorama"), { code: "ZERO_RESULTS" }));
      }
      const { lat, lng } = request.location;
      return Promise.resolve({
        data: { location: { latLng: new LatLng(lat + 0.0005, lng), pano: "fake-pano" } },
      });
    }
  }

  const libraries = {
    maps: { Map: GoogleMap, OverlayView, Circle },
    core: { LatLng, LatLngBounds, ControlPosition: { RIGHT_BOTTOM: 9, RIGHT_TOP: 3 } },
    streetView: {
      StreetViewService,
      StreetViewPreference: { NEAREST: "nearest" },
      StreetViewSource: { OUTDOOR: "outdoor" },
    },
  };
  window.google = window.google || {};
  window.google.maps = { importLibrary: (name) => Promise.resolve(libraries[name]) };
  window.__fakeMapsScripts = (window.__fakeMapsScripts || 0) + 1;
  if (callback && typeof window[callback] === "function") window[callback]();
  // A key refused (domain, billing, quota): Google calls gm_authFailure once the map is drawn.
  if (window.__fakeMapsAuthFailure) setTimeout(() => window.gm_authFailure?.(), 50);
})();`;

/** Serves the stand-in for the script of Google Maps; returns the URLs asked. */
export async function fakeGoogleMaps(context: BrowserContext): Promise<string[]> {
  const asked: string[] = [];
  await context.route(MAPS_HOSTS, async (route) => {
    const url = route.request().url();
    asked.push(url);
    if (MAPS_SCRIPT.test(url)) {
      await route.fulfill({ contentType: "text/javascript", body: FAKE_MAPS });
    } else {
      await route.fulfill({ status: 204, body: "" });
    }
  });
  return asked;
}
