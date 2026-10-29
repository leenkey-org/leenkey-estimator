import type { GoogleMapsApi, GoogleMapsNamespace } from "./google-maps";

// Loading of the Maps JavaScript API (L1-16), in the browser only and once
// per page: the script of Google, then its three libraries. No npm package
// (the official loader is not a pre-approved dependency). The maps call it
// when they are shown: the search beside the list, the area of a listing when
// it nears the screen, the full screen map of a phone when opened (L1-63).

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

/**
 * The script of Google, added once: a slow one is waited for again by the
 * next try, never added a second time (Google warns of a script included
 * twice). Only a script that failed to load is removed, for a new try.
 */
let injected: Promise<GoogleMapsNamespace> | null = null;

function injectScript(key: string): Promise<GoogleMapsNamespace> {
  const win = window as MapsWindow;
  injected ??= new Promise<GoogleMapsNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    win.__lkGoogleMapsReady = () => {
      delete win.__lkGoogleMapsReady;
      const namespace = namespaceOf(win);
      if (namespace) resolve(namespace);
      else reject(new Error("google maps: no importLibrary"));
    };
    script.src = googleMapsScriptUrl(key);
    script.async = true;
    script.onerror = () => {
      delete win.__lkGoogleMapsReady;
      script.remove();
      injected = null;
      reject(new Error("google maps: script not loaded"));
    };
    document.head.append(script);
  });
  return injected;
}

/** The script, or an error after TIMEOUT_MS (the script may still come for the next try). */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("google maps: timeout")), TIMEOUT_MS);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function load(key: string): Promise<GoogleMapsApi> {
  const namespace = namespaceOf(window as MapsWindow) ?? (await withTimeout(injectScript(key)));
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
