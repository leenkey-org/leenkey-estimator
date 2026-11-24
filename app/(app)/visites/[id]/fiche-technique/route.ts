import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/core/auth/session";
import { getPublicListing } from "@/leenkey/listings/queries";
import { isUuid } from "@/leenkey/messaging/queries";
import { renderOfferPdf } from "@/leenkey/offers/pdf";
import { visitForSheet } from "@/leenkey/visits/queries";
import { buildVisitSheet, visitSheetFileName, visitSheetPath } from "@/leenkey/visits/sheet";

// The technical sheet of the property of a booked visit (DECISIONS.md
// 2026-11-24, request of Cédric): a PDF drawn each time it is asked for, like
// the PDF of an offer (L2-03), nothing stored. For the buyer of a visit that
// is not cancelled, the seller of the property and the team: the RLS of
// `visits` decides with the session of the caller; anyone else gets a 404,
// like a visit that does not exist. Its content is the listing online
// (public_listings): once the listing has left the site, a 404 too. A file:
// a route handler (CLAUDE.md section 14).

export const runtime = "nodejs";

const empty = (status: number) =>
  new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return empty(404);
  const profile = await getProfile();
  if (!profile) {
    // The link of the confirmation email: back here once signed in.
    const signIn = new URL("/connexion", request.url);
    signIn.searchParams.set("next", visitSheetPath(id));
    return NextResponse.redirect(signIn, { status: 303, headers: { "Cache-Control": "no-store" } });
  }
  const found = await visitForSheet(id, profile);
  if (!found.ok) return empty(503);
  const visit = found.data;
  if (!visit?.slug) return empty(404);
  const listing = await getPublicListing(visit.slug);
  if (!listing.ok) return empty(503);
  if (!listing.data) return empty(404);
  try {
    const pdf = await renderOfferPdf(buildVisitSheet(listing.data, visit));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${visitSheetFileName(listing.data.reference)}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("[visits] sheet not rendered", {
      user_id: profile.id,
      entity_id: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return empty(500);
  }
}
