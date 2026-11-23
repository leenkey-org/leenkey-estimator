import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

// The file of an identity document (DECISIONS.md 2026-11-23): opened by its
// buyer or by the team only, through a signed URL of 10 minutes (CLAUDE.md
// section 11), never a permanent one. The session decides: the RLS of
// identity_documents and the storage policies show the document to no one
// else (a seller gets a 404, like a document that does not exist). Deleted
// once the team has checked or refused it: nothing left to open then.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_SECONDS = 600;

const notFound = () =>
  new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  const profile = await getProfile();
  if (!profile) {
    const signIn = new URL("/connexion", request.url);
    signIn.searchParams.set("next", `/documents/identite/${id}`);
    return NextResponse.redirect(signIn, { status: 303, headers: { "Cache-Control": "no-store" } });
  }
  const supabase = await createClient();
  const document = await supabase
    .from("identity_documents")
    .select("storage_path, file_deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (document.error || !document.data || document.data.file_deleted_at) return notFound();
  const signed = await supabase.storage
    .from("documents")
    .createSignedUrl(document.data.storage_path, SIGNED_SECONDS);
  if (signed.error || !signed.data) {
    console.error("[buyers] identity file not signed", {
      user_id: profile.id,
      entity_id: id,
      error: signed.error?.name,
    });
    return notFound();
  }
  return NextResponse.redirect(signed.data.signedUrl, {
    status: 303,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
