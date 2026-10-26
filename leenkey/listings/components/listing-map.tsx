"use client";

import { useEffect, useRef, useState } from "react";
import { Footprints } from "lucide-react";
import { MapGate, MapNotice } from "@/components/shared/map-gate";
import { LEENKEY_MAP_STYLE, MAP_TOKENS } from "@/components/shared/map-style";
import type { GoogleMap, GoogleMapsApi, LatLngLiteral } from "@/core/maps/google-maps";
import { useGoogleMaps } from "@/core/maps/use-google-maps";
import { useMapsConsent } from "@/core/maps/use-maps-consent";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// « Localisation » of a listing (L1-16, docs/DESIGN.md 8, SPEC-V2 8.5): a
// circle of 400 m around the public location of the property (itself moved
// to a grid of about 200 m), never its address. « Voir la rue » opens the
// Street View nearest to that point, to look around the neighbourhood.

const t = fr.listing.map;
const RADIUS_M = 400;
const STREET_VIEW_RADIUS_M = 300;
const BLUE = MAP_TOKENS.blue;

type StreetView = "idle" | "searching" | "open" | "none" | "error";

function AreaMap({
  apiKey,
  position,
  place,
}: {
  apiKey: string;
  position: LatLngLiteral;
  place: string;
}) {
  const maps = useGoogleMaps(apiKey);
  const element = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<{ api: GoogleMapsApi; map: GoogleMap } | null>(null);
  const [streetView, setStreetView] = useState<StreetView>("idle");

  useEffect(() => {
    if (maps.status !== "ready" || !element.current) return;
    const { api } = maps;
    const map = new api.maps.Map(element.current, {
      center: position,
      zoom: 14,
      styles: LEENKEY_MAP_STYLE,
      clickableIcons: false,
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: true,
      streetViewControl: true,
      streetViewControlOptions: { position: api.core.ControlPosition.RIGHT_BOTTOM },
      // The page scrolls under a finger; two fingers move the map.
      gestureHandling: "cooperative",
      minZoom: 11,
    });
    const circle = new api.maps.Circle({
      map,
      center: position,
      radius: RADIUS_M,
      clickable: false,
      fillColor: BLUE,
      fillOpacity: 0.18,
      strokeColor: BLUE,
      strokeOpacity: 1,
      strokeWeight: 2,
    });
    const bounds = circle.getBounds();
    if (bounds) map.fitBounds(bounds, 12);
    // Back from Street View (its own close button): the area again.
    const listener = map
      .getStreetView()
      .addListener("visible_changed", () =>
        setStreetView(map.getStreetView().getVisible() ? "open" : "idle"),
      );
    setView({ api, map });
    return () => {
      listener.remove();
      circle.setMap(null);
      setView(null);
    };
  }, [maps, position]);

  async function openStreetView() {
    if (!view) return;
    setStreetView("searching");
    try {
      const { StreetViewService, StreetViewPreference, StreetViewSource } = view.api.streetView;
      const { data } = await new StreetViewService().getPanorama({
        location: position,
        radius: STREET_VIEW_RADIUS_M,
        preference: StreetViewPreference.NEAREST,
        sources: [StreetViewSource.OUTDOOR],
      });
      const at = data.location?.latLng;
      if (!at) {
        setStreetView("none");
        return;
      }
      const panorama = view.map.getStreetView();
      panorama.setPosition(at);
      panorama.setPov({ heading: 0, pitch: 0 });
      panorama.setVisible(true);
    } catch (error) {
      // ZERO_RESULTS: no panorama near the area.
      const code = error instanceof Error ? error.message : String(error);
      if (/ZERO_RESULTS/.test(code)) {
        setStreetView("none");
        return;
      }
      console.error("[maps] street view failed", { error: code });
      setStreetView("error");
    }
  }

  if (maps.status === "error") {
    return <MapNotice className="absolute inset-0">{fr.maps.unavailable}</MapNotice>;
  }
  const message =
    streetView === "none" ? t.noStreetView : streetView === "error" ? t.streetViewError : null;
  return (
    <div role="region" aria-label={t.region} className="absolute inset-0">
      <div ref={element} className="absolute inset-0" />
      {maps.status === "loading" ? (
        <MapNotice busy className="absolute inset-0">
          {fr.maps.loading}
        </MapNotice>
      ) : null}
      {view && streetView !== "open" ? (
        <>
          <button
            type="button"
            onClick={() => void openStreetView()}
            disabled={streetView === "searching"}
            className="absolute left-2.5 top-2.5 flex h-10 items-center gap-1.5 rounded-full bg-lk-surface px-3.5 text-lk-button-sm font-bold text-lk-ink shadow-float transition-colors duration-140 ease-out-lk not-disabled:hover:bg-lk-blue-tint not-disabled:hover:text-lk-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue disabled:opacity-60 after:absolute after:-inset-y-0.5 after:inset-x-0 [&_svg]:size-4"
          >
            <Footprints aria-hidden="true" />
            {t.streetView}
          </button>
          <p className="pointer-events-none absolute bottom-2.5 left-2.5 max-w-[calc(100%-4.5rem)] rounded-lk-sm bg-lk-surface px-2 py-1 text-lk-micro font-semibold text-lk-ink shadow-float">
            {t.sector(place)}
          </p>
        </>
      ) : null}
      {message ? (
        <p
          role="status"
          className="absolute inset-x-2.5 top-15 w-fit rounded-lk-sm bg-lk-surface px-2.5 py-1.5 text-lk-caption text-lk-ink-2 shadow-float"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** The map of the area, after « Afficher la carte »; without a key, not available. */
export function ListingMap({
  apiKey,
  position,
  place,
  className,
}: {
  apiKey: string | null;
  position: LatLngLiteral;
  /** « Savigny-sur-Orge · centre ». */
  place: string;
  className?: string;
}) {
  const { allowed, allow } = useMapsConsent();
  // The position is a new object at each render of the page: kept by value.
  const [area] = useState(position);
  let content;
  if (!apiKey) content = <MapNotice className="absolute inset-0">{fr.maps.unavailable}</MapNotice>;
  else if (!allowed) {
    content = (
      <MapGate
        compact
        title={t.gateTitle}
        note={fr.maps.gateNote}
        action={fr.maps.gateAction}
        onAllow={allow}
        className="absolute inset-0"
      />
    );
  } else content = <AreaMap apiKey={apiKey} position={area} place={place} />;
  return (
    <div
      className={cn(
        "relative h-60 overflow-hidden rounded-lk-md border border-lk-line lg:h-80",
        className,
      )}
    >
      {content}
    </div>
  );
}
