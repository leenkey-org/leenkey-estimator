import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/core/auth/session";
import {
  checkoutInvoice,
  creditNotePdfUrl,
  isStripeUrl,
  MOCK_PDF,
  stripeMocked,
} from "@/core/billing/stripe";
import { pdfFilename } from "@/leenkey/billing/documents";
import { PAYMENTS_ANCHOR, type DocumentKind } from "@/leenkey/billing/payments";
import { allowAccount } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { documentQuerySchema } from "@/lib/validations/billing";

// The PDF of an invoice (?facture=<subscription>) or of a credit note
// (?avoir=<credit note>) of « Mes factures et paiements » (DECISIONS.md
// 2026-11-26). A file: a route handler (CLAUDE.md section 14). The session
// decides: the RLS of `subscriptions` and `credit_notes` gives them to the
// owner of the plan and to the team only (a 404 for anyone else, like a
// document that does not exist); the team opening the document of a seller
// is written in audit_log (billing_document_opened). The address of the PDF
// is asked of Stripe at each download (it does not last), never kept in the
// page; the browser is sent to it only when it is an address of Stripe.
// When Stripe does not answer or has no PDF yet, back to the list, which
// says so. 30 downloads per quarter of an hour per account (each asks
// Stripe). STRIPE_MOCK=1: the mocked PDF, served here.

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

/** Back to « Mes factures et paiements », which says the document is not available. */
function unavailable(request: NextRequest, propertyId: string | null): NextResponse {
  const back = new URL("/vendeur/formule", request.url);
  if (propertyId) back.searchParams.set("bien", propertyId);
  back.searchParams.set("document", "indisponible");
  back.hash = PAYMENTS_ANCHOR;
  return NextResponse.redirect(back, { status: 303, headers });
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
  if (!(await allowAccount("document", profile.id))) {
    return new NextResponse(null, { status: 429, headers: { ...headers, "Retry-After": "900" } });
  }
  const kind: DocumentKind = query.data.facture ? "facture" : "avoir";
  const id = query.data.facture ?? query.data.avoir ?? "";
  const supabase = await createClient();

  // What the session may read: the property, and where Stripe keeps the document.
  let propertyId: string;
  let sessionId: string | null = null;
  let creditNote: { stripeId: string; pdfUrl: string | null } | null = null;
  if (kind === "facture") {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("property_id, stripe_checkout_session_id")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[billing] document not read", { user_id: profile.id, code: error.code });
      return unavailable(request, null);
    }
    if (!data?.stripe_checkout_session_id) return notFound();
    propertyId = data.property_id;
    sessionId = data.stripe_checkout_session_id;
  } else {
    const { data, error } = await supabase
      .from("credit_notes")
      .select("stripe_credit_note_id, pdf_url, subscription:subscriptions!inner(property_id)")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[billing] document not read", { user_id: profile.id, code: error.code });
      return unavailable(request, null);
    }
    if (!data) return notFound();
    propertyId = data.subscription.property_id;
    creditNote = { stripeId: data.stripe_credit_note_id, pdfUrl: data.pdf_url };
  }

  if (profile.roles.includes("admin")) {
    // Writes nothing for a document of the admin's own plan.
    const opened = await supabase.rpc("billing_document_opened", { p_kind: kind, p_id: id });
    if (opened.error) {
      console.error("[admin] billing document opening not recorded", {
        user_id: profile.id,
        entity_id: id,
        code: opened.error.code,
      });
      return notFound();
    }
  }
  if (stripeMocked()) return mockPdf(kind);

  let pdfUrl: string | null = null;
  try {
    pdfUrl = sessionId
      ? ((await checkoutInvoice(sessionId))?.pdfUrl ?? null)
      : creditNote
        ? await creditNotePdfUrl(creditNote.stripeId)
        : null;
  } catch (error) {
    // The message of the Stripe SDK: a type and a sentence, no address, no key.
    console.error("[billing] document not served", {
      user_id: profile.id,
      entity_id: id,
      kind,
      error: error instanceof Error ? error.message : String(error),
    });
    // The address kept when the credit note was created may still open.
    pdfUrl = creditNote?.pdfUrl ?? null;
  }
  if (!pdfUrl) return unavailable(request, propertyId);
  if (!isStripeUrl(pdfUrl)) {
    console.error("[billing] document refused: not an address of Stripe", {
      user_id: profile.id,
      entity_id: id,
      kind,
    });
    return unavailable(request, propertyId);
  }
  return NextResponse.redirect(pdfUrl, {
    status: 303,
    headers: { ...headers, "Referrer-Policy": "no-referrer" },
  });
}
