import { NextResponse, type NextRequest } from "next/server";
import { PHOTO_FILE } from "@/leenkey/properties/photo-files";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

// Photos of the properties (SPEC-V2 section 4 « Storage »): never a permanent
// URL. /img/{property_id}/{uuid}-{400|800|1600}.webp serves the file read
// from Supabase Storage, when the storage policies allow it (L1-12):
// - a photo of a published listing, for anyone: cached 50 minutes by the CDN
//   (5 by the browser), as the signed redirect it replaces was;
// - else, with the session: the owner's photos, the admin's; in their browser
//   only, a minute (never by the CDN).
// Anything else: 404.
// Served from here rather than redirected to a signed URL (P-06): the
// largest paint of a listing and of the search is a photo, and on a phone
// the redirect then the connection to another origin cost about a second;
// Supabase is read once per photo and per period of the CDN, not by every
// browser.

/** The policy of a published photo: as the signed redirect before (P-06). */
const PUBLIC_CACHE = "public, max-age=300, s-maxage=3000";

function notFound() {
  return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

type Storage = ReturnType<typeof createPublicClient>["storage"];

/** The file, read with the rights of the client; null when refused or missing. */
async function read(storage: Storage, name: string): Promise<Blob | null> {
  const { data, error } = await storage.from("photos").download(name);
  return error || !data ? null : data;
}

function serve(file: Blob, cacheControl: string) {
  return new NextResponse(file.stream(), {
    headers: {
      // Every file of the route is a WebP (PHOTO_FILE): never sniffed as anything else.
      "Content-Type": "image/webp",
      "Content-Length": String(file.size),
      "Cache-Control": cacheControl,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const name = (await params).path.join("/");
  if (!PHOTO_FILE.test(name) || !isSupabaseConfigured()) return notFound();

  const visitor = await read(createPublicClient().storage, name);
  if (visitor) return serve(visitor, PUBLIC_CACHE);

  // Signed in: the photos of the owner (a draft) and of the admin.
  if (request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"))) {
    const own = await read((await createClient()).storage, name);
    // Its own browser only, for a minute: a file never changes under its name.
    if (own) return serve(own, "private, max-age=60");
  }
  return notFound();
}
