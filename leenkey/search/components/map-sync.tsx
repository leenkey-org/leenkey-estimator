"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// The list and the map of the results together (docs/DESIGN.md 8): the card
// hovered or focused lights its pill; a pill chosen on the map brings its
// card into view with a blue outline for 1.2 s, and the focus on its link.

const FLASH_MS = 1200;

type MapSyncValue = {
  /** The card or pill under the pointer or the focus. */
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  /** The last pill chosen: it stays blue. */
  selectedId: string | null;
  flashId: string | null;
  /** A pill chosen beside the list: its card is shown. */
  revealInList: (id: string) => void;
};

const MapSyncContext = createContext<MapSyncValue | null>(null);

export function useMapSync(): MapSyncValue {
  const value = useContext(MapSyncContext);
  if (!value) throw new Error("useMapSync must be used inside <MapSyncProvider>");
  return value;
}

/** The link of a card: its title, first of the card (L1-55). */
function visibleLink(item: HTMLElement): HTMLAnchorElement | null {
  return (
    Array.from(item.querySelectorAll<HTMLAnchorElement>("a[href]")).find(
      (link) => link.getClientRects().length > 0,
    ) ?? null
  );
}

export function MapSyncProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const revealInList = useCallback((id: string) => {
    setSelectedId(id);
    const item = document.querySelector<HTMLElement>(`[data-listing-id="${CSS.escape(id)}"]`);
    if (!item) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    item.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    visibleLink(item)?.focus({ preventScroll: true });
    window.clearTimeout(timer.current);
    setFlashId(id);
    timer.current = window.setTimeout(() => setFlashId(null), FLASH_MS);
  }, []);

  const value = useMemo<MapSyncValue>(
    () => ({ hoveredId, setHoveredId, selectedId, flashId, revealInList }),
    [hoveredId, selectedId, flashId, revealInList],
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
  const { setHoveredId, flashId } = useMapSync();
  return (
    <li
      data-listing-id={id}
      data-result-index={index}
      data-flash={flashId === id || undefined}
      onPointerEnter={() => setHoveredId(id)}
      onPointerLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(id)}
      onBlur={() => setHoveredId(null)}
      className="rounded-lk-2xl data-flash:outline-2 data-flash:outline-offset-2 data-flash:outline-lk-blue"
    >
      {children}
    </li>
  );
}
