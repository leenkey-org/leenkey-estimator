"use client";

import { useEffect, useState } from "react";
import type { GoogleMapsApi } from "./google-maps";
import { loadGoogleMaps, onGoogleMapsAuthFailure } from "./loader";

export type GoogleMapsState =
  | { status: "loading" }
  | { status: "ready"; api: GoogleMapsApi }
  | { status: "error" };

/**
 * The Maps JavaScript API for a map being shown: loading, ready, or an error
 * (script not loaded, key refused by Google). Mounted only when the map is
 * shown (L1-63).
 */
export function useGoogleMaps(apiKey: string): GoogleMapsState {
  const [state, setState] = useState<GoogleMapsState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const unsubscribe = onGoogleMapsAuthFailure(() => {
      if (active) setState({ status: "error" });
    });
    loadGoogleMaps(apiKey).then(
      (api) => {
        if (active)
          setState((current) => (current.status === "error" ? current : { status: "ready", api }));
      },
      (error: unknown) => {
        console.error("[maps] not loaded", {
          error: error instanceof Error ? error.message : String(error),
        });
        if (active) setState({ status: "error" });
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [apiKey]);

  return state;
}
