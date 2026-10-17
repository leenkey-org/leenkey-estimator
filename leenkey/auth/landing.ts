import "server-only";
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { safeNextPath } from "@/core/auth/next-path";
import { confirmLinkSchema } from "@/lib/validations/auth";
import type { Database } from "@/types/database";
import { homePathForRoles } from "./routes";

/** Where an expired, used or malformed email link leads. */
export const EXPIRED_LINK_PATH = "/connexion?lien=expire";

/** Page with the button that uses the token of an email link. */
export const CONFIRMATION_PATH = "/confirmation";

/**
 * Token of an email link, kept for /confirmation only: httpOnly (never read
 * by a script), never in a page address (analytics would record it), one
 * hour like the link itself.
 */
export const CONFIRM_COOKIE = {
  name: "lk_lien",
  options: { httpOnly: true, sameSite: "lax", path: CONFIRMATION_PATH, maxAge: 60 * 60 },
} as const;

export type ConfirmLink = { token_hash: string; type: EmailOtpType };

export function encodeConfirmLink(link: ConfirmLink): string {
  return `${link.type}.${link.token_hash}`;
}

export function decodeConfirmLink(value: string | undefined): ConfirmLink | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  const parsed = confirmLinkSchema.safeParse({
    type: value.slice(0, dot),
    token_hash: value.slice(dot + 1),
  });
  return dot > 0 && parsed.success ? parsed.data : null;
}

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
