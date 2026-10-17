import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LEGAL_VERSIONS, missingLegalDocuments, type LegalDocument } from "@/lib/legal/versions";
import { loginPath } from "./next-path";

/** Request header set by the middleware: path and query of the current page. */
export const PATH_HEADER = "x-lk-path";

export async function currentPath(): Promise<string> {
  return (await headers()).get(PATH_HEADER) ?? "/";
}

/** Signed-in user of this request (one Supabase Auth call per request). */
export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export type SessionProfile = { id: string; firstName: string | null; roles: string[] };

export const getProfile = cache(async (): Promise<SessionProfile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, roles, deleted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[auth] profile read failed", { user_id: user.id, code: error.code });
    return null;
  }
  if (!data || data.deleted_at) return null;
  return { id: data.id, firstName: data.first_name, roles: data.roles };
});

/**
 * Legal texts whose current version this user has not accepted yet, and
 * whether they accepted any text before (new version vs first acceptance).
 */
export async function acceptanceStatus(
  profileId: string,
): Promise<{ missing: LegalDocument[]; acceptedBefore: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_acceptances")
    .select("document, version")
    .eq("profile_id", profileId);
  if (error) {
    console.error("[auth] acceptances read failed", { user_id: profileId, code: error.code });
    return { missing: Object.keys(LEGAL_VERSIONS) as LegalDocument[], acceptedBefore: false };
  }
  return { missing: missingLegalDocuments(data), acceptedBefore: data.length > 0 };
}

export async function missingAcceptances(profileId: string): Promise<LegalDocument[]> {
  return (await acceptanceStatus(profileId)).missing;
}

// requireProfile only, read once per request: a page and each of its reads
// check the session. Not shared with acceptTerms, which writes in between.
const sessionAcceptances = cache(acceptanceStatus);

/**
 * Signed-in area: a session, a profile and the current CGU and privacy
 * versions accepted (otherwise /conditions, then back here).
 */
export async function requireProfile(): Promise<SessionProfile> {
  const path = await currentPath();
  const profile = await getProfile();
  if (!profile) redirect(loginPath(path));
  if ((await sessionAcceptances(profile.id)).missing.length > 0) {
    redirect(`/conditions?next=${encodeURIComponent(path)}`);
  }
  return profile;
}

/**
 * Back office: an admin profile, otherwise a 404. Called by every admin page,
 * query and action, not only by the layout: a layout is not rendered again on
 * a client navigation, and can be skipped by a crafted router request.
 */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (!profile.roles.includes("admin")) notFound();
  return profile;
}
