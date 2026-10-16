import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/core/auth/session";
import { homePathForRoles, safeNextPath } from "@/core/auth/next-path";
import { fr } from "@/lib/i18n/fr";
import { AuthShell } from "../_components/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: fr.auth.signup.metaTitle };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Buyer when coming back to a listing or the search, seller otherwise (SPEC 8.2). */
function defaultRole(role: unknown, next: string | undefined): "seller" | "buyer" {
  if (role === "buyer" || role === "seller") return role;
  return next && /^\/(annonce|acheter|acquereur)(\/|\?|$)/.test(next) ? "buyer" : "seller";
}

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const profile = await getProfile();
  if (profile) redirect(safeNextPath(next, homePathForRoles(profile.roles)));

  return (
    <AuthShell title={fr.auth.signup.title} lead={fr.auth.signup.lead} privacyNote>
      <SignupForm defaultRole={defaultRole(params.role, next)} next={next} />
    </AuthShell>
  );
}
