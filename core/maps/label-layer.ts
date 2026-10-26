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
  /** One label highlighted (hovered or selected), or none. */
  setActive(id: string | null): void;
  remove(): void;
};

/**
 * Labels drawn in HTML over a map, one button each, in a single overlay:
 * lighter than one marker per point, and styled like the rest of the page by
 * the class given (`data-active` on the highlighted one). A click, a hover
 * or the focus of a label is told to the page; it never reaches the map.
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
  const nodes = new Map<string, { button: HTMLButtonElement; position: LatLngLiteral }>();
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
      for (const { button, position } of nodes.values()) {
        const point = projection.fromLatLngToDivPixel(new LatLng(position.lat, position.lng));
        if (!point) continue;
        button.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -50%)`;
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
        const button = nodes.get(label.id)?.button ?? create(label.id);
        button.textContent = label.text;
        button.setAttribute("aria-label", label.name);
        nodes.set(label.id, { button, position: label.position });
      }
      layer.draw();
    },
    setActive(id) {
      for (const [key, { button }] of nodes) {
        if (key === id) button.setAttribute("data-active", "");
        else button.removeAttribute("data-active");
      }
    },
    remove() {
      layer.setMap(null);
      nodes.clear();
    },
  };
}
