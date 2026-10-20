// Loader of next/image (next.config.ts): the photos of the route /img (L1-12)
// and those of the public pages in /images (L1-46) exist in three widths,
// already WebP: the smallest one wide enough is asked, without the optimiser
// of Vercel. Any other image is served as it is.

const PHOTO = /^(\/(?:img|images)\/.+)-(400|800|1600)\.webp$/;
const WIDTHS = [400, 800, 1600];

export default function imageLoader({ src, width }: { src: string; width: number }): string {
  const photo = PHOTO.exec(src);
  if (photo) return `${photo[1]}-${WIDTHS.find((size) => size >= width) ?? 1600}.webp`;
  // The width in the address: next/image wants one per size.
  return src.startsWith("/") ? `${src}${src.includes("?") ? "&" : "?"}w=${width}` : src;
}
