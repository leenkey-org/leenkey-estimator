import { clusterPoints, type PixelPoint } from "./cluster";
import type { GoogleMap, GoogleMapsApi, LatLngLiteral } from "./google-maps";

export type MapLabel = {
  id: string;
  position: LatLngLiteral;
  /** Text of the label. */
  text: string;
  /** Accessible name of its button: its text first (WCAG 2.5.3), then more. */
  name: string;
};

export type LabelLayer = {
  setLabels(labels: readonly MapLabel[]): void;
  /** One label highlighted (its card hovered in the list), or none. */
  setActive(id: string | null): void;
  /** The label chosen (`data-selected`): its card shown over the map. */
  setSelected(id: string | null): void;
  /** The labels already chosen during the visit (`data-visited`). */
  setVisited(ids: ReadonlySet<string>): void;
  /** The focus back on a label (after the card it opened is closed). */
  focus(id: string): void;
  remove(): void;
};

/**
 * Grouping of the labels that pile up (L1-16b, DESIGN.md 8): a round button
 * with their number in their place, below the highest zoom (labels at the
 * same point would stay grouped at any zoom).
 */
export type LabelClusters = {
  className: string;
  /** Accessible name of a group: « 4 biens, zoomer ». */
  name: (count: number) => string;
  /** Fewest labels that make a group. */
  minSize: number;
  /** Distance in pixels within which labels join a group. */
  radius: number;
  /** From this zoom, no group. */
  maxZoom: number;
  /** A group chosen: the positions of its labels, for the map to show them. */
  onSelect: (positions: LatLngLiteral[]) => void;
};

/** Room kept between two labels before the later one is collapsed. */
const GAP_PX = 4;

type Box = { left: number; right: number; top: number; bottom: number };

const overlap = (a: Box, b: Box) =>
  a.left < b.right + GAP_PX &&
  a.right > b.left - GAP_PX &&
  a.top < b.bottom + GAP_PX &&
  a.bottom > b.top - GAP_PX;

/**
 * Labels drawn in HTML over a map, one button each, in a single overlay:
 * lighter than one marker per point, and styled like the rest of the page by
 * the class given (`data-active` on the highlighted one). A label that would
 * cover one before it in the list is marked `data-collapsed` (drawn as a dot
 * by the class), until the zoom makes room. A click, a hover or the focus of
 * a label is told to the page; it never reaches the map. With `clusters`,
 * labels that pile up at a low zoom are hidden behind one round button with
 * their number (L1-16b), recomputed at every draw of the overlay (each zoom);
 * the label chosen is never grouped.
 */
export function createLabelLayer(
  api: GoogleMapsApi,
  map: GoogleMap,
  options: {
    className: string;
    onSelect: (id: string) => void;
    onHover: (id: string | null) => void;
    clusters?: LabelClusters;
  },
): LabelLayer {
  const { OverlayView } = api.maps;
  const { LatLng } = api.core;
  const nodes = new Map<
    string,
    { button: HTMLButtonElement; position: LatLngLiteral; size?: { width: number; height: number } }
  >();
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "0";
  container.style.top = "0";
  OverlayView.preventMapHitsAndGesturesFrom(container);
  let activeId: string | null = null;
  let selectedId: string | null = null;
  /** Buttons of the groups, reused from one draw to the next. */
  const groups: Array<{ button: HTMLButtonElement; ids: string[] }> = [];

  function createGroup(settings: LabelClusters): { button: HTMLButtonElement; ids: string[] } {
    const button = document.createElement("button");
    button.type = "button";
    button.className = settings.className;
    button.dataset.clusterOf = "";
    const group: { button: HTMLButtonElement; ids: string[] } = { button, ids: [] };
    button.addEventListener("click", () => {
      settings.onSelect(group.ids.flatMap((id) => nodes.get(id)?.position ?? []));
    });
    container.append(button);
    return group;
  }

  function markGroupsActive() {
    for (const { button, ids } of groups) {
      if (activeId && ids.includes(activeId)) button.setAttribute("data-active", "");
      else button.removeAttribute("data-active");
    }
  }

  class Layer extends OverlayView {
    onAdd() {
      this.getPanes()?.overlayMouseTarget.append(container);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection) return;
      const points = new Map<string, PixelPoint>();
      for (const [id, { position }] of nodes) {
        const point = projection.fromLatLngToDivPixel(new LatLng(position.lat, position.lng));
        if (point) points.set(id, { id, x: point.x, y: point.y });
      }
      const grouped = this.group(points);
      const placed: Box[] = [];
      for (const [id, node] of nodes) {
        const { button } = node;
        const point = points.get(id);
        button.hidden = grouped.has(id);
        if (!point || button.hidden) continue;
        button.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -50%)`;
        // The size of the whole label, read once it is drawn in full.
        if (!node.size && !button.hasAttribute("data-collapsed") && button.offsetWidth > 0) {
          node.size = { width: button.offsetWidth, height: button.offsetHeight };
        }
        if (!node.size) continue;
        const box = {
          left: point.x - node.size.width / 2,
          right: point.x + node.size.width / 2,
          top: point.y - node.size.height / 2,
          bottom: point.y + node.size.height / 2,
        };
        if (placed.some((other) => overlap(box, other))) {
          button.setAttribute("data-collapsed", "");
        } else {
          button.removeAttribute("data-collapsed");
          placed.push(box);
        }
      }
    }

    /** The groups drawn at this zoom; the ids of the labels they hide. */
    group(points: ReadonlyMap<string, PixelPoint>): Set<string> {
      const settings = options.clusters;
      const zoom = map.getZoom();
      const hidden = new Set<string>();
      const found =
        settings && zoom !== undefined && zoom < settings.maxZoom
          ? clusterPoints(
              [...points.values()].filter((point) => point.id !== selectedId),
              settings,
            ).clusters
          : [];
      found.forEach((cluster, index) => {
        if (!settings) return;
        const group = (groups[index] ??= createGroup(settings));
        group.ids = cluster.ids;
        group.button.textContent = String(cluster.ids.length);
        group.button.setAttribute("aria-label", settings.name(cluster.ids.length));
        group.button.style.transform = `translate(${Math.round(cluster.x)}px, ${Math.round(cluster.y)}px) translate(-50%, -50%)`;
        for (const id of cluster.ids) hidden.add(id);
      });
      for (const { button } of groups.splice(found.length)) button.remove();
      markGroupsActive();
      return hidden;
    }

    onRemove() {
      container.remove();
    }
  }

  const layer = new Layer();
  layer.setMap(map);

  function create(id: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = options.className;
    button.dataset.labelId = id;
    button.addEventListener("click", () => options.onSelect(id));
    button.addEventListener("pointerenter", () => options.onHover(id));
    button.addEventListener("pointerleave", () => options.onHover(null));
    button.addEventListener("focus", () => options.onHover(id));
    button.addEventListener("blur", () => options.onHover(null));
    container.append(button);
    return button;
  }

  return {
    setLabels(labels) {
      const kept = new Set(labels.map((label) => label.id));
      for (const [id, node] of nodes) {
        if (!kept.has(id)) {
          node.button.remove();
          nodes.delete(id);
        }
      }
      for (const label of labels) {
        const known = nodes.get(label.id);
        const button = known?.button ?? create(label.id);
        const size = known && button.textContent === label.text ? known.size : undefined;
        button.textContent = label.text;
        button.setAttribute("aria-label", label.name);
        nodes.set(label.id, { button, position: label.position, size });
      }
      layer.draw();
    },
    setActive(id) {
      activeId = id;
      markGroupsActive();
      for (const [key, { button }] of nodes) {
        if (key === id) button.setAttribute("data-active", "");
        else button.removeAttribute("data-active");
      }
    },
    setSelected(id) {
      for (const [key, { button }] of nodes) {
        if (key === id) button.setAttribute("data-selected", "");
        else button.removeAttribute("data-selected");
      }
      // The label chosen leaves its group, the one closed may join one.
      if (options.clusters && id !== selectedId) {
        selectedId = id;
        layer.draw();
      }
      selectedId = id;
    },
    setVisited(ids) {
      for (const [key, { button }] of nodes) {
        if (ids.has(key)) button.setAttribute("data-visited", "");
        else button.removeAttribute("data-visited");
      }
    },
    focus(id) {
      nodes.get(id)?.button.focus({ preventScroll: true });
    },
    remove() {
      layer.setMap(null);
      nodes.clear();
      groups.length = 0;
    },
  };
}
