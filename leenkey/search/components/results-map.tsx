"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { List, Map as MapIcon } from "lucide-react";
import type { MapListing } from "../map-listings";
import { useMapSync } from "./map-sync";
import { SearchMap } from "./search-map";
import { facadeScope } from "@/components/shared/facade-root";
import { MapGate, MapNotice } from "@/components/shared/map-gate";
import type { LatLngLiteral, Padding } from "@/core/maps/google-maps";
import { useMapsConsent } from "@/core/maps/use-maps-consent";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// The map of the results (L1-16, docs/DESIGN.md 8, 12.5, 12.6): beside the
// list from 1024 px; on a phone and a tablet, full screen from a floating
// « Carte » button. A pill chosen shows its card over the map (L1-62). Google is
// reached only after « Afficher la carte » (core/maps/use-maps-consent.ts);
// without a key (previews, CI) the map says it is not available.

const t = fr.search.map;

type Props = {
  apiKey: string | null;
  listings: readonly MapListing[];
  centre: LatLngLiteral;
};

const DESKTOP = "(min-width: 1024px)";

/** From 1024 px: the panel beside the list is shown (false on the server). */
function useDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(DESKTOP);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

/** Floating pill of the map, « Carte » over the list and « Liste » over the map. */
const FLOATING =
  "flex h-12 items-center gap-2 rounded-full bg-lk-ink px-5 text-lk-button-md font-bold text-white shadow-lk-fab transition-colors duration-140 ease-out-lk hover:bg-lk-navy focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue [&_svg]:size-4.5";

function MapContent({
  apiKey,
  listings,
  centre,
  activeId,
  selectedId,
  onHover,
  onSelect,
  shown = true,
  padding,
  previewClassName,
  className,
}: Props & {
  activeId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  /** False while hidden by the layout: no map is loaded for nothing. */
  shown?: boolean;
  padding?: Padding;
  previewClassName?: string;
  className?: string;
}) {
  const { allowed, allow } = useMapsConsent();
  if (!apiKey) return <MapNotice className={className}>{fr.maps.unavailable}</MapNotice>;
  if (!allowed) {
    return (
      <MapGate
        title={t.gateTitle}
        note={fr.maps.gateNote}
        action={fr.maps.gateAction}
        onAllow={allow}
        className={className}
      />
    );
  }
  if (!shown) return null;
  return (
    <SearchMap
      apiKey={apiKey}
      listings={listings}
      centre={centre}
      activeId={activeId}
      selectedId={selectedId}
      onHover={onHover}
      onSelect={onSelect}
      padding={padding}
      previewClassName={previewClassName}
      className={className}
    />
  );
}

/** From 1024 px: the right part of the page, held under the top bar. */
export function ResultsMapPanel(props: Props) {
  const { hoveredId, setHoveredId, selectedId, setSelectedId } = useMapSync();
  // Below 1024 px the panel is hidden: the map is the one of « Carte », and
  // a hidden one would still be loaded (and counted) by Google.
  const desktop = useDesktop();
  return (
    <MapContent
      {...props}
      shown={desktop}
      activeId={hoveredId ?? selectedId}
      selectedId={selectedId}
      onHover={setHoveredId}
      onSelect={setSelectedId}
      // At the bottom, in the middle, above the logo and the terms of Google.
      previewClassName="inset-x-0 bottom-10 mx-auto w-80"
      className="size-full"
    />
  );
}

/** Up to 1023 px: « Carte » opens the map over the whole screen. */
export function ResultsMapDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);
  // A tablet turned to 1024 px and more: the map is beside the list, this
  // one closes (hidden, it would keep the page locked and a map loaded).
  const desktop = useDesktop();
  useEffect(() => {
    if (desktop) {
      setOpen(false);
      setChosenId(null);
    }
  }, [desktop]);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setChosenId(null);
      }}
    >
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          className={cn(
            FLOATING,
            "fixed bottom-[calc(4.625rem+max(1.375rem,env(safe-area-inset-bottom)))] left-1/2 z-20 -translate-x-1/2 md:bottom-6 lg:hidden",
          )}
        >
          <MapIcon aria-hidden="true" />
          {t.open}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // A card shown: Escape closes it, not the map (inside the card, the
          // card closes itself and gives the focus back to its pill).
          onEscapeKeyDown={(event) => {
            if (!chosenId) return;
            event.preventDefault();
            const inCard =
              event.target instanceof Element && event.target.closest("[data-map-preview]");
            if (!inCard) setChosenId(null);
          }}
          className={cn(
            facadeScope,
            "fixed inset-0 z-50 bg-lk-sand outline-none lg:hidden",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        >
          <DialogPrimitive.Title className="sr-only">{t.region}</DialogPrimitive.Title>
          <MapContent
            {...props}
            activeId={chosenId}
            selectedId={chosenId}
            onHover={() => {}}
            onSelect={setChosenId}
            // Room for « Liste » at the bottom of the screen.
            padding={{ top: 48, right: 40, bottom: 120, left: 40 }}
            // Above « Liste », across the screen up to 480 px.
            previewClassName="inset-x-4 bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+3.75rem)] mx-auto max-w-120"
            className="absolute inset-0"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <DialogPrimitive.Close asChild>
              <button type="button" className={cn(FLOATING, "pointer-events-auto")}>
                <List aria-hidden="true" />
                {t.close}
              </button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
