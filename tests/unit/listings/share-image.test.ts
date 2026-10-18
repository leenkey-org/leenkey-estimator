import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicListing } from "@/leenkey/listings/queries";

// L1-12: the share image of a listing (/api/og/[slug]) shows its main photo,
// read as a visitor, and keeps the drawing when the photo cannot be read.

vi.mock("server-only", () => ({}));

const path = "623efc8b-97d4-4902-ac43-406417498893/0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27";

const listing: PublicListing = {
  id: "623efc8b-97d4-4902-ac43-406417498893",
  slug: "appartement-3-pieces-savigny-sur-orge-lk0005",
  reference: "LK-0005",
  title: "Appartement 3 pièces avec balcon, proche gare",
  description: "Au 2e étage avec ascenseur d'une résidence calme, appartement traversant.",
  priceCents: 35_000_000,
  publishedAt: "2026-10-04T08:00:00Z",
  type: "appartement",
  city: "Savigny-sur-Orge",
  postalCode: "91600",
  district: "centre",
  surfaceM2: 68,
  carrezM2: 66.5,
  rooms: 3,
  bedrooms: 2,
  floor: 2,
  floorsTotal: 4,
  hasElevator: true,
  hasBalcony: true,
  hasTerrace: false,
  hasGarden: false,
  hasParking: true,
  hasCellar: true,
  orientation: "Sud-ouest",
  buildYear: 1972,
  isNewBuild: false,
  dpe: "D",
  ges: "D",
  heating: "Collectif gaz",
  chargesMonthlyCents: 21_000,
  propertyTaxYearlyCents: 115_000,
  coproLots: 48,
  sellerFirstName: "Alice",
  accompanied: true,
  photos: [{ path, width: 1600, height: 1200, caption: "Séjour" }],
};

const read = vi.fn<() => Promise<{ ok: true; data: PublicListing | null }>>();
vi.mock("@/leenkey/listings/queries", () => ({ getPublicListing: () => read() }));

type Signed = { data: { signedUrl: string } | null; error: { message: string } | null };
const sign = vi.fn<(name: string, seconds: number) => Promise<Signed>>();
vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({ storage: { from: () => ({ createSignedUrl: sign }) } }),
}));

const { GET } = await import("@/app/api/og/[slug]/route");
const { coverJpeg } = await import("@/core/images/cover");
const { sharePhoto } = await import("@/leenkey/listings/share-photo");

const RED = { r: 200, g: 30, b: 40 };
const STONE_2 = { r: 0xec, g: 0xed, b: 0xe8 };
const BLUE = { r: 0x11, g: 0x56, b: 0xfc };

/** The main photo as stored: the 1 600 px WebP, red. */
const webp = () =>
  sharp({ create: { width: 1600, height: 1200, channels: 3, background: RED } })
    .webp()
    .toBuffer();

/** Storage answers with `photo`; Google Fonts is out of reach (default font). */
function network(photo: () => Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return url.startsWith("https://storage.test/")
        ? photo()
        : new Response(null, { status: 503 });
    }),
  );
}

async function render(cache = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=82800") {
  const response = await GET(new Request(`http://localhost/api/og/${listing.slug}`), {
    params: Promise.resolve({ slug: listing.slug }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe(cache);
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([1200, 630]);
  return (x: number, y: number) => {
    const at = (y * info.width + x) * info.channels;
    return { r: data[at], g: data[at + 1], b: data[at + 2] };
  };
}

const near = (colour: { r: number; g: number; b: number }) => ({
  r: expect.toSatisfy((value: number) => Math.abs(value - colour.r) <= 8),
  g: expect.toSatisfy((value: number) => Math.abs(value - colour.g) <= 8),
  b: expect.toSatisfy((value: number) => Math.abs(value - colour.b) <= 8),
});

beforeEach(() => {
  read.mockResolvedValue({ ok: true, data: listing });
  sign.mockReset();
  sign.mockResolvedValue({ data: { signedUrl: "https://storage.test/sign/photo" }, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("share image", () => {
  it("shows the main photo on the left, read as a visitor at its largest width", async () => {
    network(async () => new Response(new Uint8Array(await webp()), { status: 200 }));
    const pixel = await render();
    expect(sign).toHaveBeenCalledWith(`${path}-1600.webp`, 60);
    expect(pixel(10, 10)).toEqual(near(RED));
    expect(pixel(710, 620)).toEqual(near(RED));
    expect(pixel(1190, 315)).toEqual(near(BLUE));
  });

  it("keeps the drawing when the photo cannot be read, a minute in the caches", async () => {
    const retry = "public, max-age=60, s-maxage=60";
    network(async () => new Response(null, { status: 404 }));
    expect((await render(retry))(10, 10)).toEqual(near(STONE_2));
    network(async () => new Response("<html>", { status: 200 }));
    expect((await render(retry))(10, 10)).toEqual(near(STONE_2));
    sign.mockResolvedValue({ data: null, error: { message: "Object not found" } });
    expect((await render(retry))(10, 10)).toEqual(near(STONE_2));
  });

  it("keeps the drawing without photo", async () => {
    network(async () => new Response(null, { status: 500 }));
    read.mockResolvedValue({ ok: true, data: { ...listing, photos: [] } });
    expect((await render())(10, 10)).toEqual(near(STONE_2));
    expect(sign).not.toHaveBeenCalled();
  });

  it("gives up after 3 seconds, signature included", async () => {
    vi.useFakeTimers();
    try {
      sign.mockReturnValue(new Promise(() => {}));
      const photo = sharePhoto(path);
      await vi.advanceTimersByTimeAsync(3_000);
      expect(await photo).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("crops a portrait photo to the area, in JPEG", async () => {
    const portrait = await sharp({
      create: { width: 900, height: 1200, channels: 3, background: RED },
    })
      .png()
      .toBuffer();
    const jpeg = await coverJpeg(portrait, { width: 720, height: 630 });
    expect(jpeg).not.toBeNull();
    const meta = await sharp(jpeg ?? Buffer.alloc(0)).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 720, 630]);
    expect(await coverJpeg(Buffer.from("not an image"), { width: 720, height: 630 })).toBeNull();
  });
});
