import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/core/auth/session";
import { homePathForRoles, safeNextPath } from "@/core/auth/next-path";
import { fr } from "@/lib/i18n/fr";
import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: fr.auth.login.metaTitle };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const profile = await getProfile();
  if (profile) redirect(safeNextPath(next, homePathForRoles(profile.roles)));

  return (
    <AuthShell title={fr.auth.login.title} lead={fr.auth.login.lead}>
      <LoginForm
        next={next}
        notice={params.lien === "expire" ? fr.auth.login.linkExpired : undefined}
      />
    </AuthShell>
  );
}
