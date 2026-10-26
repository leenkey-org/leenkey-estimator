import type { GoogleMapsApi, GoogleMapsNamespace } from "./google-maps";

// Loading of the Maps JavaScript API (L1-16), in the browser only and once
// per page: the script of Google, then its three libraries. No npm package
// (the official loader is not a pre-approved dependency). The maps call it
// only after the visitor asked for a map (components/shared/map-gate.tsx).

export const GOOGLE_MAPS_SCRIPT = "https://maps.googleapis.com/maps/api/js";
const CALLBACK = "__lkGoogleMapsReady";
const TIMEOUT_MS = 20_000;

type MapsWindow = Window & {
  google?: { maps?: Partial<GoogleMapsNamespace> };
  __lkGoogleMapsReady?: () => void;
  /** Called by Google when it refuses the key (domain, billing, quota). */
  gm_authFailure?: () => void;
};

/** French labels and names (`language`), borders as seen from France (`region`). */
export function googleMapsScriptUrl(key: string): string {
  const params = new URLSearchParams({
    key,
    v: "weekly",
    loading: "async",
    language: "fr",
    region: "FR",
    callback: CALLBACK,
  });
  return `${GOOGLE_MAPS_SCRIPT}?${params.toString()}`;
}

let pending: Promise<GoogleMapsApi> | null = null;

/** The API, loaded on the first call; a failure lets the next call try again. */
export function loadGoogleMaps(key: string): Promise<GoogleMapsApi> {
  pending ??= load(key).catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

function namespaceOf(win: MapsWindow): GoogleMapsNamespace | null {
  const maps = win.google?.maps;
  return maps?.importLibrary ? (maps as GoogleMapsNamespace) : null;
}

function injectScript(key: string): Promise<GoogleMapsNamespace> {
  const win = window as MapsWindow;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const fail = (reason: string) => {
      window.clearTimeout(timer);
      delete win.__lkGoogleMapsReady;
      script.remove();
      reject(new Error(`google maps: ${reason}`));
    };
    const timer = window.setTimeout(() => fail("timeout"), TIMEOUT_MS);
    win.__lkGoogleMapsReady = () => {
      window.clearTimeout(timer);
      delete win.__lkGoogleMapsReady;
      const namespace = namespaceOf(win);
      if (namespace) resolve(namespace);
      else reject(new Error("google maps: no importLibrary"));
    };
    script.src = googleMapsScriptUrl(key);
    script.async = true;
    script.onerror = () => fail("script not loaded");
    document.head.append(script);
  });
}

async function load(key: string): Promise<GoogleMapsApi> {
  const namespace = namespaceOf(window as MapsWindow) ?? (await injectScript(key));
  const [maps, core, streetView] = await Promise.all([
    namespace.importLibrary("maps"),
    namespace.importLibrary("core"),
    namespace.importLibrary("streetView"),
  ]);
  return { maps, core, streetView };
}

const authFailureHandlers = new Set<() => void>();
let authFailed = false;

/**
 * Tells when Google refuses the key once the map is drawn (domain not
 * allowed, billing off, daily quota reached): the map then says it is not
 * available instead of the grey map of Google. Returns the unsubscription.
 */
export function onGoogleMapsAuthFailure(handler: () => void): () => void {
  if (authFailed) {
    handler();
    return () => {};
  }
  authFailureHandlers.add(handler);
  (window as MapsWindow).gm_authFailure = () => {
    authFailed = true;
    for (const notify of authFailureHandlers) notify();
  };
  return () => {
    authFailureHandlers.delete(handler);
  };
}
