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
