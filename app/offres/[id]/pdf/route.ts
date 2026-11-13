import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/core/auth/session";
import { isUuid } from "@/leenkey/messaging/queries";
import { buildOfferDocument } from "@/leenkey/offers/document";
import { offerPdfPath } from "@/leenkey/offers/paths";
import { renderOfferPdf } from "@/leenkey/offers/pdf";
import { buyerOffer } from "@/leenkey/offers/queries";
import { sellerOffer } from "@/leenkey/offers/seller";
import { frOffer } from "@/lib/i18n/sections/offer";

// The PDF of an offer sent (L2-03, SPEC-V2 13): drawn from the frozen offer
// for its buyer or the team (RLS of `offers` decides; anyone else gets a 404,
// like an offer that does not exist), and for its seller once it is accepted
// (L2-04a). Never a draft: a document has a date of issue.

export const runtime = "nodejs";

const notFound = () =>
  new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const profile = await getProfile();
  if (!profile) {
    const signIn = new URL("/connexion", request.url);
    signIn.searchParams.set("next", offerPdfPath(id));
    return NextResponse.redirect(signIn, { status: 303, headers: { "Cache-Control": "no-store" } });
  }
  const found = await buyerOffer(profile.id, id);
  if (!found.ok) return notFound();
  let offer = found.data?.offer;
  let snapshot = found.data?.snapshot ?? null;
  if (!offer) {
    // Its seller, once the offer is accepted only: the view then gives the
    // whole identity of the buyers (L2-04a, SPEC 13).
    const received = await sellerOffer(id);
    if (!received.ok || !received.data || received.data.offer.status !== "accepted") {
      return notFound();
    }
    offer = received.data.offer;
    snapshot = received.data.property;
  }
  if (offer.status === "draft" || !snapshot) return notFound();
  try {
    const pdf = await renderOfferPdf(buildOfferDocument(offer, snapshot));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${frOffer.document.fileName(offer.reference, offer.version)}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("[offers] pdf not rendered", {
      user_id: profile.id,
      entity_id: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
