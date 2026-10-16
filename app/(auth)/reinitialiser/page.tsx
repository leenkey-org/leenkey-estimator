import type { Metadata } from "next";
import { getUser } from "@/core/auth/session";
import { InlineAlert } from "@/components/shared/inline-alert";
import { fr } from "@/lib/i18n/fr";
import { AuthLink, AuthShell } from "../_components/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: fr.auth.reset.metaTitle };
// Depends on the recovery session of the request, never prerendered.
export const dynamic = "force-dynamic";

// Reached from the reset email: /auth/confirm opened a recovery session.
export default async function ResetPasswordPage() {
  const user = await getUser();
  return (
    <AuthShell title={fr.auth.reset.title}>
      {user ? (
        <ResetForm />
      ) : (
        <div className="flex flex-col gap-4">
          <InlineAlert tone="warning">{fr.auth.reset.expired}</InlineAlert>
          <p className="text-lk-compact">
            <AuthLink href="/mot-de-passe-oublie">{fr.auth.reset.requestNew}</AuthLink>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
