import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { EXPIRED_LINK_PATH, pathAfterEmailLink } from "@/leenkey/auth/landing";
import { createClient } from "@/lib/supabase/server";

// Target of the links of Supabase Auth's default templates (?code=…, PKCE:
// valid in the browser that asked for the email). Our templates
// (supabase/templates/) link to /confirmation, where a button uses the token:
// an email scanner that opens the link does not consume it. A token link that
// still arrives here is sent there.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (tokenHash) {
    const query = new URLSearchParams({ token_hash: tokenHash, type: type ?? "email" });
    redirect(`/confirmation?${query}`);
  }
  const code = params.get("code");
  if (!code) redirect(EXPIRED_LINK_PATH);
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth] exchangeCodeForSession failed", { code: error.code });
    redirect(EXPIRED_LINK_PATH);
  }
  redirect(await pathAfterEmailLink(supabase, type === "recovery" ? "recovery" : null));
}
