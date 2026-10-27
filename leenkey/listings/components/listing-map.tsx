"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Footprints, Map as MapIcon } from "lucide-react";
import { MapGate, MapNotice } from "@/components/shared/map-gate";
import { LEENKEY_MAP_STYLE, MAP_TOKENS } from "@/components/shared/map-style";
import { headingTo } from "@/core/maps/geometry";
import type {
  GoogleMap,
  GoogleMapsApi,
  LatLngLiteral,
  MapsRequestError,
} from "@/core/maps/google-maps";
import { useGoogleMaps } from "@/core/maps/use-google-maps";
import { useMapsConsent } from "@/core/maps/use-maps-consent";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// « Localisation » of a listing (L1-16, docs/DESIGN.md 8, SPEC-V2 8.5): a
// circle of 400 m around the public location of the property (itself moved
// to a grid of about 200 m), never its address. « Voir la rue » opens the
// Street View nearest to that point, turned towards it, to look around the
// neighbourhood. The map loads once its frame nears the screen: a visitor
// who never scrolls down to it costs no map load.

const t = fr.listing.map;
const RADIUS_M = 400;
const STREET_VIEW_RADIUS_M = 300;
const BLUE = MAP_TOKENS.blue;

type StreetView = "idle" | "searching" | "open" | "none" | "error";

/** Floating white pill over the map (« Voir la rue », « Revenir à la carte »). */
const MAP_BUTTON =
  "absolute left-2.5 top-2.5 flex h-10 items-center gap-1.5 rounded-full bg-lk-surface px-3.5 text-lk-button-sm font-bold text-lk-ink shadow-float transition-colors duration-140 ease-out-lk not-aria-disabled:hover:bg-lk-blue-tint not-aria-disabled:hover:text-lk-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue aria-disabled:cursor-default aria-disabled:opacity-60 after:absolute after:-inset-y-0.5 after:inset-x-0 [&_svg]:size-4";

function isZeroResults(error: unknown): boolean {
  return (error as MapsRequestError | null)?.code === "ZERO_RESULTS";
}

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
  const streetViewButton = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<{ api: GoogleMapsApi; map: GoogleMap } | null>(null);
  const [streetView, setStreetView] = useState<StreetView>("idle");
  // Back from the street: the focus goes back to « Voir la rue ».
  const wasOpen = useRef(false);

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
    const panorama = map.getStreetView();
    // « Revenir à la carte » of the page replaces the controls of Google in
    // the top left corner, where it sits.
    panorama.setOptions({
      addressControl: false,
      enableCloseButton: false,
      fullscreenControl: true,
      motionTrackingControl: false,
    });
    // Opened by « Voir la rue » or by the pegman of Google, closed by « Revenir à la carte ».
    const listener = panorama.addListener("visible_changed", () =>
      setStreetView(panorama.getVisible() ? "open" : "idle"),
    );
    setView({ api, map });
    return () => {
      listener.remove();
      circle.setMap(null);
      setView(null);
    };
  }, [maps, position]);

  useEffect(() => {
    if (streetView === "open") {
      wasOpen.current = true;
      element.current?.focus({ preventScroll: true });
    } else if (streetView === "idle" && wasOpen.current) {
      wasOpen.current = false;
      streetViewButton.current?.focus({ preventScroll: true });
    }
  }, [streetView]);

  async function openStreetView() {
    if (!view || streetView === "searching") return;
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
      const pano = data.location?.pano;
      if (!at || !pano) {
        setStreetView("none");
        return;
      }
      const panorama = view.map.getStreetView();
      panorama.setPano(pano);
      panorama.setPov({ heading: headingTo({ lat: at.lat(), lng: at.lng() }, position), pitch: 0 });
      panorama.setVisible(true);
    } catch (error) {
      if (isZeroResults(error)) {
        setStreetView("none");
        return;
      }
      console.error("[maps] street view failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      setStreetView("error");
    }
  }

  if (maps.status === "error") {
    return <MapNotice className="absolute inset-0">{fr.maps.unavailable}</MapNotice>;
  }
  const message =
    streetView === "none" ? t.noStreetView : streetView === "error" ? t.streetViewError : "";
  return (
    <div role="region" aria-label={t.region} className="absolute inset-0">
      {/* Focused while the street is shown: its arrows move along it. */}
      <div ref={element} tabIndex={-1} className="absolute inset-0 outline-none" />
      {maps.status === "loading" ? (
        <MapNotice busy className="absolute inset-0">
          {fr.maps.loading}
        </MapNotice>
      ) : null}
      {view && streetView === "open" ? (
        <button
          type="button"
          onClick={() => view.map.getStreetView().setVisible(false)}
          className={MAP_BUTTON}
        >
          <MapIcon aria-hidden="true" />
          {t.backToMap}
        </button>
      ) : null}
      {view && streetView !== "open" ? (
        <>
          <button
            ref={streetViewButton}
            type="button"
            onClick={() => void openStreetView()}
            aria-disabled={streetView === "searching" || undefined}
            className={MAP_BUTTON}
          >
            <Footprints aria-hidden="true" />
            {t.streetView}
          </button>
          {/* Above the logo of Google (bottom left), left of its controls. */}
          <p className="pointer-events-none absolute bottom-9 left-2.5 max-w-[calc(100%-5.5rem)] rounded-lk-sm bg-lk-surface px-2 py-1 text-lk-micro font-semibold text-lk-ink shadow-float">
            {t.sector(place)}
          </p>
        </>
      ) : null}
      {/* Always there, for the readers of screens to announce what comes in. */}
      <p
        role="status"
        className={cn(
          "absolute left-2.5 top-15 max-w-[calc(100%-1.25rem)] rounded-lk-sm bg-lk-surface px-2.5 py-1.5 text-lk-caption text-lk-ink-2 shadow-float",
          !message && "sr-only",
        )}
      >
        {message}
      </p>
    </div>
  );
}

/** True once the element is within 300 px of the screen, and from then on. */
function useNearScreen<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const target = ref.current;
    if (!target || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near];
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
  const [frame, near] = useNearScreen<HTMLDivElement>();
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
  } else if (near) content = <AreaMap apiKey={apiKey} position={area} place={place} />;
  return (
    <div
      ref={frame}
      className={cn(
        "relative h-60 overflow-hidden rounded-lk-md border border-lk-line bg-lk-sand lg:h-80",
        className,
      )}
    >
      {content}
    </div>
  );
}
