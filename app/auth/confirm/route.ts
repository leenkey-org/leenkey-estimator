import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { homePathForRoles, safeNextPath } from "@/core/auth/next-path";

// Target of the links sent by Supabase Auth (signup confirmation, password
// reset). Two forms:
// - our templates (supabase/templates/): ?token_hash=…&type=email|recovery,
//   valid from any browser;
// - Supabase's default templates: ?code=… (PKCE), valid in the browser that
//   asked for the email.
const OTP_TYPES: readonly EmailOtpType[] = ["signup", "email", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const supabase = await createClient();

  let verified = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
    if (error) console.error("[auth] verifyOtp failed", { code: error.code, type });
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
    if (error) console.error("[auth] exchangeCodeForSession failed", { code: error.code });
  }
  if (!verified) redirect("/connexion?lien=expire");

  if (type === "recovery") redirect("/reinitialiser");

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  let roles: string[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .maybeSingle();
    roles = profile?.roles ?? [];
  }
  const nextPath: unknown = user?.user_metadata?.next_path;
  redirect(safeNextPath(typeof nextPath === "string" ? nextPath : null, homePathForRoles(roles)));
}
