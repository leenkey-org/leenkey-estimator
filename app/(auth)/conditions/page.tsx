import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { acceptanceStatus, getProfile } from "@/core/auth/session";
import { homePathForRoles, loginPath, safeNextPath } from "@/core/auth/next-path";
import { fr } from "@/lib/i18n/fr";
import { AuthShell } from "../_components/auth-shell";
import { TermsForm } from "./terms-form";

export const metadata: Metadata = { title: fr.auth.terms.metaTitle };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Shown when the current CGU or privacy version has not been accepted
// (new version of a text, or account created without the signup form).
export default async function TermsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const profile = await getProfile();
  if (!profile) redirect(loginPath(next));
  const { missing, acceptedBefore } = await acceptanceStatus(profile.id);
  if (missing.length === 0) redirect(safeNextPath(next, homePathForRoles(profile.roles)));

  return (
    <AuthShell
      title={acceptedBefore ? fr.auth.terms.titleUpdate : fr.auth.terms.titleFirst}
      lead={fr.auth.terms.lead}
    >
      <TermsForm next={next} />
    </AuthShell>
  );
}
