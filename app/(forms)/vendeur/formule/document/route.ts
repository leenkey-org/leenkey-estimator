import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/core/auth/session";
import { checkoutInvoice, creditNotePdfUrl, MOCK_PDF, stripeMocked } from "@/core/billing/stripe";
import { pdfFilename } from "@/leenkey/billing/documents";
import { PAYMENTS_ANCHOR, type DocumentKind } from "@/leenkey/billing/payments";
import { createClient } from "@/lib/supabase/server";
import { documentQuerySchema } from "@/lib/validations/billing";

// The PDF of an invoice (?facture=<subscription>) or of a credit note
// (?avoir=<credit note>) of « Mes factures et paiements » (DECISIONS.md
// 2026-11-26). A file: a route handler (CLAUDE.md section 14). The session
// decides: the RLS of `subscriptions` and `credit_notes` gives them to the
// owner of the plan and to the team only (a 404 for anyone else, like a
// document that does not exist). The address of the PDF is asked of Stripe
// at each download (it does not last), never kept in the page; the browser
// is sent to it. STRIPE_MOCK=1: the mocked PDF, served here.

const headers = { "Cache-Control": "private, no-store" };
const notFound = () => new NextResponse(null, { status: 404, headers });

function mockPdf(kind: DocumentKind): NextResponse {
  return new NextResponse(new Uint8Array(MOCK_PDF), {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfFilename(kind, "MOCK")}"`,
    },
  });
}

export async function GET(request: NextRequest) {
  const query = documentQuerySchema.safeParse({
    facture: request.nextUrl.searchParams.get("facture") ?? undefined,
    avoir: request.nextUrl.searchParams.get("avoir") ?? undefined,
  });
  if (!query.success) return notFound();
  const profile = await getProfile();
  if (!profile) {
    const signIn = new URL("/connexion", request.url);
    signIn.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signIn, { status: 303, headers });
  }
  const supabase = await createClient();
  let propertyId: string;
  let pdfUrl: string | null = null;
  const kind: DocumentKind = query.data.facture ? "facture" : "avoir";
  try {
    if (query.data.facture) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("property_id, stripe_checkout_session_id")
        .eq("id", query.data.facture)
        .maybeSingle();
      if (error) throw new Error(`subscriptions: ${error.code}`);
      if (!data?.stripe_checkout_session_id) return notFound();
      propertyId = data.property_id;
      if (stripeMocked()) return mockPdf(kind);
      pdfUrl = (await checkoutInvoice(data.stripe_checkout_session_id))?.pdfUrl ?? null;
    } else {
      const { data, error } = await supabase
        .from("credit_notes")
        .select("stripe_credit_note_id, pdf_url, subscription:subscriptions!inner(property_id)")
        .eq("id", query.data.avoir ?? "")
        .maybeSingle();
      if (error) throw new Error(`credit_notes: ${error.code}`);
      if (!data) return notFound();
      propertyId = data.subscription.property_id;
      if (stripeMocked()) return mockPdf(kind);
      // A fresh address; the one kept when it was created otherwise.
      pdfUrl =
        (await creditNotePdfUrl(data.stripe_credit_note_id).catch(() => null)) ?? data.pdf_url;
    }
  } catch (error) {
    console.error("[billing] document not served", {
      user_id: profile.id,
      entity_id: query.data.facture ?? query.data.avoir,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 503, headers });
  }
  if (!pdfUrl || !pdfUrl.startsWith("https://")) {
    // Not drawn yet (or an order without an invoice): back to the list, which says so.
    const back = new URL(`/vendeur/formule`, request.url);
    back.searchParams.set("bien", propertyId);
    back.searchParams.set("document", "indisponible");
    back.hash = PAYMENTS_ANCHOR;
    return NextResponse.redirect(back, { status: 303, headers });
  }
  return NextResponse.redirect(pdfUrl, {
    status: 303,
    headers: { ...headers, "Referrer-Policy": "no-referrer" },
  });
}
