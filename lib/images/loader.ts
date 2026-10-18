// Loader of next/image (next.config.ts): the photos of the route /img exist
// in three widths, already WebP (L1-12): the smallest one wide enough is
// asked, without the optimiser of Vercel. Any other image is served as it is.

const PHOTO = /^(\/img\/.+)-(400|800|1600)\.webp$/;
const WIDTHS = [400, 800, 1600];

export default function imageLoader({ src, width }: { src: string; width: number }): string {
  const photo = PHOTO.exec(src);
  if (photo) return `${photo[1]}-${WIDTHS.find((size) => size >= width) ?? 1600}.webp`;
  // The width in the address: next/image wants one per size.
  return src.startsWith("/") ? `${src}${src.includes("?") ? "&" : "?"}w=${width}` : src;
}
