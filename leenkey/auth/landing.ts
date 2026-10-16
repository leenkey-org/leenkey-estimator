import "server-only";
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { safeNextPath } from "@/core/auth/next-path";
import type { Database } from "@/types/database";
import { homePathForRoles } from "./routes";

/** Where an expired, used or malformed email link leads. */
export const EXPIRED_LINK_PATH = "/connexion?lien=expire";

/**
 * Where a verified email link leads: the new password form for a reset,
 * otherwise the page the person came from (kept in the user metadata at
 * signup) or the home of their role.
 */
export async function pathAfterEmailLink(
  supabase: SupabaseClient<Database>,
  type: EmailOtpType | null,
): Promise<string> {
  if (type === "recovery") return "/reinitialiser";
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
  return safeNextPath(typeof nextPath === "string" ? nextPath : null, homePathForRoles(roles));
}
