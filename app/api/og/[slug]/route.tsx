import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  FACADE_DIMENSION,
  FACADE_OUTLINE,
  FACADE_VIEWBOX,
} from "@/components/shared/facade-drawing-shapes";
import { listingSummary } from "@/leenkey/listings/presentation";
import { getPublicListing } from "@/leenkey/listings/queries";
import { SHARE_PHOTO, sharePhoto } from "@/leenkey/listings/share-photo";
import { NBSP, NNBSP, formatPrice } from "@/lib/format";

// Open Graph image of a listing (SPEC-V2 8.5, docs/DESIGN.md 14): 1200 × 630,
// main photo on the left (60 %), blue band on the right with the price in
// wide Archivo, the summary, the town and the logo in white (the word
// « Leenkey » without its file). Without a photo, or when it cannot be read
// in time, facade.svg on stone. Colours of
// docs/DESIGN.md 2.1 and 14, written out because the image is drawn outside
// the CSS of the site.

const BLUE = "#1156FC"; // --lk-blue
const ON_BLUE_2 = "#F0F4FF"; // --lk-on-blue-2
const STONE_2 = "#ECEDE8"; // --lk-stone-2
const INK_3 = "#5B6474"; // --lk-ink-3

type Font = { name: string; data: ArrayBuffer; weight: 500 | 700; style: "normal" };

/** The white logo at the bottom of the band, 32 px high (public/brand, 309 × 80). */
const LOGO = { width: 124, height: 32 };
let whiteLogo: Promise<string | null> | null = null;

/** The white logo as a data URL, read once; null without the file: the word instead. */
function logoImage(): Promise<string | null> {
  whiteLogo ??= readFile(join(process.cwd(), "public/brand/logo-white.svg")).then(
    (file) => `data:image/svg+xml;base64,${file.toString("base64")}`,
    (error: unknown) => {
      console.error("[listings] share logo not read", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    },
  );
  return whiteLogo;
}

/**
 * Archivo from Google Fonts, limited to the characters drawn: semi-expanded
 * bold (the closest static instance to the 116 % width of the site) for the
 * price and the brand, normal width for the rest. Without the network, the
 * default font of next/og is used, for both (a font of the list without the
 * characters of the other text would leave them blank; an empty list, none).
 */
async function loadFont(axes: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Archivo:${axes}&text=${encodeURIComponent(text)}`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(2_000) },
    ).then((response) => (response.ok ? response.text() : ""));
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const font = await fetch(url, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(2_000),
    });
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const result = await getPublicListing((await params).slug);
  if (!result.ok) return new Response(null, { status: 503 });
  const listing = result.data;
  if (!listing) return new Response(null, { status: 404 });

  // The narrow no-break space of the prices is not in every font.
  const price = formatPrice(listing.priceCents).replaceAll(NNBSP, NBSP);
  const summary = listingSummary(listing).replaceAll(NNBSP, NBSP);
  const brand = "Leenkey";
  const cover = listing.photos[0];
  const [wide, regular, photo, logo] = await Promise.all([
    loadFont("wdth,wght@112.5,700", `${price}${brand}`),
    loadFont("wght@500", `${summary}${listing.city}`),
    cover ? sharePhoto(cover.path) : null,
    logoImage(),
  ]);
  const fonts: Font[] = [];
  if (wide) fonts.push({ name: "Archivo Wide", data: wide, weight: 700, style: "normal" });
  if (regular) fonts.push({ name: "Archivo", data: regular, weight: 500, style: "normal" });

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {photo ? (
        // Already cropped to the area: drawn as it is.
        <div
          style={{
            display: "flex",
            width: SHARE_PHOTO.width,
            height: SHARE_PHOTO.height,
            backgroundImage: `url(${photo})`,
            backgroundSize: `${SHARE_PHOTO.width}px ${SHARE_PHOTO.height}px`,
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            width: SHARE_PHOTO.width,
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: STONE_2,
          }}
        >
          <svg width={288} height={159} viewBox={FACADE_VIEWBOX} fill="none">
            {FACADE_OUTLINE.paths.map((d) => (
              <path key={d} d={d} stroke={INK_3} strokeWidth={FACADE_OUTLINE.strokeWidth} />
            ))}
            {FACADE_OUTLINE.rects.map((rect) => (
              <rect
                key={`${rect.x}-${rect.y}`}
                {...rect}
                stroke={INK_3}
                strokeWidth={FACADE_OUTLINE.strokeWidth}
              />
            ))}
            {FACADE_DIMENSION.paths.map((d) => (
              <path key={d} d={d} stroke={INK_3} strokeWidth={FACADE_DIMENSION.strokeWidth} />
            ))}
          </svg>
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 480,
          height: "100%",
          padding: "64px 48px 56px",
          backgroundColor: BLUE,
          color: "white",
          fontFamily: "Archivo",
          fontWeight: 500,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontFamily: "Archivo Wide",
              fontWeight: 700,
              fontSize: 64,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {price}
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.25 }}>{summary}</div>
          <div style={{ fontSize: 24, lineHeight: 1.3, color: ON_BLUE_2 }}>{listing.city}</div>
        </div>
        {logo ? (
          <div
            style={{
              display: "flex",
              width: LOGO.width,
              height: LOGO.height,
              backgroundImage: `url(${logo})`,
              backgroundSize: `${LOGO.width}px ${LOGO.height}px`,
            }}
          />
        ) : (
          <div style={{ fontFamily: "Archivo Wide", fontWeight: 700, fontSize: 24 }}>{brand}</div>
        )}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      ...(wide && regular ? { fonts } : {}),
      headers: {
        // The price can change: an hour in browsers, a day at most in the CDN.
        // A photo that could not be read is tried again within a minute.
        "cache-control":
          cover && !photo
            ? "public, max-age=60, s-maxage=60"
            : "public, max-age=3600, s-maxage=3600, stale-while-revalidate=82800",
      },
    },
  );
}
