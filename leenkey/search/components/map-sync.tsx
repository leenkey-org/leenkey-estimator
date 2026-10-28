"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// The list and the map of the results together (docs/DESIGN.md 8): the card
// hovered or focused lights its pill; a pill chosen shows its card over the
// map (L1-62, in the way of Airbnb) and outlines its card in the list,
// which stays where it is. The pills whose card was seen stay grey for the
// visit (sessionStorage, as the choice to show the maps).

const VISITED_KEY = "lk:maps:visited";
/** Enough for a visit; the oldest go first. */
const VISITED_MAX = 200;

type MapSyncValue = {
  /** The card or pill under the pointer or the focus. */
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  /** The pill chosen beside the list (from 1024 px): its card over the map. */
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  /** The pills whose card was seen during the visit. */
  visited: ReadonlySet<string>;
  markVisited: (id: string) => void;
};

const MapSyncContext = createContext<MapSyncValue | null>(null);

export function useMapSync(): MapSyncValue {
  const value = useContext(MapSyncContext);
  if (!value) throw new Error("useMapSync must be used inside <MapSyncProvider>");
  return value;
}

function readVisited(): Set<string> {
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(VISITED_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function MapSyncProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());
  // Read after the first render: the server knows nothing of the visit.
  useEffect(() => setVisited(readVisited()), []);

  const markVisited = useCallback((id: string) => {
    setVisited((seen) => {
      if (seen.has(id)) return seen;
      const next = new Set([...seen, id].slice(-VISITED_MAX));
      try {
        window.sessionStorage.setItem(VISITED_KEY, JSON.stringify([...next]));
      } catch {
        // Kept for the page only.
      }
      return next;
    });
  }, []);

  const value = useMemo<MapSyncValue>(
    () => ({ hoveredId, setHoveredId, selectedId, setSelectedId, visited, markVisited }),
    [hoveredId, selectedId, visited, markVisited],
  );
  return <MapSyncContext.Provider value={value}>{children}</MapSyncContext.Provider>;
}

/** One result of the list, tied to its pill on the map; outlined while its pill is chosen. */
export function ResultItem({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: ReactNode;
}) {
  const { setHoveredId, selectedId } = useMapSync();
  return (
    <li
      data-listing-id={id}
      data-result-index={index}
      data-selected={selectedId === id || undefined}
      onPointerEnter={() => setHoveredId(id)}
      onPointerLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(id)}
      onBlur={() => setHoveredId(null)}
      className="rounded-lk-2xl data-selected:outline-2 data-selected:outline-offset-2 data-selected:outline-lk-brand-blue data-selected:outline-solid"
    >
      {children}
    </li>
  );
}
