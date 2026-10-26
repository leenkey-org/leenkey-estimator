"use client";

import { useCallback, useSyncExternalStore } from "react";

// The choice of a visitor to show the maps of a third party (L1-16): nothing
// is asked of Google before it. Asked once per visit and kept for the tab
// (sessionStorage), never sent anywhere; every map of the page opens with it.

const KEY = "lk:maps:allowed";
const EVENT = "lk:maps-allowed";

/** When storage is refused (sandboxed frame), the choice holds for the page. */
let allowedInPage = false;

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function allowedNow(): boolean {
  if (allowedInPage) return true;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Whether the maps may load, and the choice to let them. */
export function useMapsConsent(): { allowed: boolean; allow: () => void } {
  // The server knows nothing of the choice: the map is asked for at first.
  const allowed = useSyncExternalStore(subscribe, allowedNow, () => false);
  const allow = useCallback(() => {
    allowedInPage = true;
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      // Kept for the page only.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { allowed, allow };
}
