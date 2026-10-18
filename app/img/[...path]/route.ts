import { NextResponse, type NextRequest } from "next/server";
import { PHOTO_FILE } from "@/leenkey/properties/photo-files";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

// Photos of the properties (SPEC-V2 section 4 « Storage »): never a permanent
// URL. /img/{property_id}/{uuid}-{400|800|1600}.webp redirects to a URL
// signed for one hour, when the storage policies allow it (L1-12):
// - a photo of a published listing, for anyone: the redirect is cached 50
//   minutes by the CDN (5 by the browser), within the hour of the signature;
// - else, with the session: the owner's photos, the admin's; never cached.
// Anything else: 404.

const SIGNED_FOR = 3600;

function notFound() {
  return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

function redirectTo(url: string, cacheControl: string) {
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", cacheControl);
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const name = (await params).path.join("/");
  if (!PHOTO_FILE.test(name) || !isSupabaseConfigured()) return notFound();

  const visitor = await createPublicClient()
    .storage.from("photos")
    .createSignedUrl(name, SIGNED_FOR);
  if (visitor.data) {
    return redirectTo(visitor.data.signedUrl, "public, max-age=300, s-maxage=3000");
  }

  // Signed in: the photos of the owner (a draft) and of the admin.
  if (request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"))) {
    const supabase = await createClient();
    const own = await supabase.storage.from("photos").createSignedUrl(name, SIGNED_FOR);
    if (own.data) return redirectTo(own.data.signedUrl, "private, no-store");
  }
  return notFound();
}
