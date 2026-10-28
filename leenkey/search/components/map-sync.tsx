"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// The list and the map of the results together (docs/DESIGN.md 8): the card
// hovered or focused lights its pill; a pill chosen shows its card over the
// map (L1-62, in the way of Airbnb), the list stays where it is.

type MapSyncValue = {
  /** The card or pill under the pointer or the focus. */
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  /** The pill chosen: its card is shown over the map. */
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

const MapSyncContext = createContext<MapSyncValue | null>(null);

export function useMapSync(): MapSyncValue {
  const value = useContext(MapSyncContext);
  if (!value) throw new Error("useMapSync must be used inside <MapSyncProvider>");
  return value;
}

export function MapSyncProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const value = useMemo<MapSyncValue>(
    () => ({ hoveredId, setHoveredId, selectedId, setSelectedId }),
    [hoveredId, selectedId],
  );
  return <MapSyncContext.Provider value={value}>{children}</MapSyncContext.Provider>;
}

/** One result of the list, tied to its pill on the map. */
export function ResultItem({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: ReactNode;
}) {
  const { setHoveredId } = useMapSync();
  return (
    <li
      data-listing-id={id}
      data-result-index={index}
      onPointerEnter={() => setHoveredId(id)}
      onPointerLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(id)}
      onBlur={() => setHoveredId(null)}
    >
      {children}
    </li>
  );
}
