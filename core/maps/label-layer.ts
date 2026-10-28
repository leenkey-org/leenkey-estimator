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
 * a label is told to the page; it never reaches the map.
 */
export function createLabelLayer(
  api: GoogleMapsApi,
  map: GoogleMap,
  options: {
    className: string;
    onSelect: (id: string) => void;
    onHover: (id: string | null) => void;
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

  class Layer extends OverlayView {
    onAdd() {
      this.getPanes()?.overlayMouseTarget.append(container);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection) return;
      const placed: Box[] = [];
      for (const node of nodes.values()) {
        const { button, position } = node;
        const point = projection.fromLatLngToDivPixel(new LatLng(position.lat, position.lng));
        if (!point) continue;
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
    },
  };
}
