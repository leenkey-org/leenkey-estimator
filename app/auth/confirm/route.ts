import { NextResponse, type NextRequest } from "next/server";
import {
  CONFIRM_COOKIE,
  CONFIRMATION_PATH,
  EXPIRED_LINK_PATH,
  encodeConfirmLink,
  pathAfterEmailLink,
} from "@/leenkey/auth/landing";
import { createClient } from "@/lib/supabase/server";
import { confirmLinkSchema } from "@/lib/validations/auth";

// Target of the links sent by Supabase Auth.
// - Our templates (supabase/templates/): ?token_hash=…&type=…. Nothing is
//   used here: the token goes into an httpOnly cookie and the person lands on
//   /confirmation, whose button uses it. An email scanner that opens the link
//   does not consume it, the link works from any browser, and the token never
//   appears in the address of a page (analytics).
// - Supabase's default templates: ?code=… (PKCE), valid in the browser that
//   asked for the email.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const tokenHash = params.get("token_hash");
  if (tokenHash) {
    const link = confirmLinkSchema.safeParse({
      token_hash: tokenHash,
      type: params.get("type") ?? "email",
    });
    if (!link.success) return to(EXPIRED_LINK_PATH);
    const response = to(CONFIRMATION_PATH);
    response.cookies.set(CONFIRM_COOKIE.name, encodeConfirmLink(link.data), {
      ...CONFIRM_COOKIE.options,
      secure: request.nextUrl.protocol === "https:",
    });
    return response;
  }
  const code = params.get("code");
  if (!code) return to(EXPIRED_LINK_PATH);
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth] exchangeCodeForSession failed", { code: error.code });
    return to(EXPIRED_LINK_PATH);
  }
  const type = params.get("type") === "recovery" ? "recovery" : null;
  return to(await pathAfterEmailLink(supabase, type));
}
