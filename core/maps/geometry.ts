import type { LatLngLiteral } from "./google-maps";

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Initial bearing from one point to another, in degrees from the north,
 * clockwise (0 to 360): where a Street View turns to face a point.
 */
export function headingTo(from: LatLngLiteral, to: LatLngLiteral): number {
  const φ1 = radians(from.lat);
  const φ2 = radians(to.lat);
  const Δλ = radians(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Size of the world in pixels at zoom 0 (Web Mercator tiles). */
const TILE_PX = 256;

/**
 * The centre that shows a point `pixels` above the middle of the map, at a
 * zoom: where to pan for the point to stay in view over a card that covers
 * the bottom of the map. Web Mercator, exact enough for a few hundred pixels.
 */
export function centreBelow(point: LatLngLiteral, zoom: number, pixels: number): LatLngLiteral {
  const degreesPerPixel = (360 * Math.cos(radians(point.lat))) / (TILE_PX * 2 ** zoom);
  return { lat: point.lat - pixels * degreesPerPixel, lng: point.lng };
}
