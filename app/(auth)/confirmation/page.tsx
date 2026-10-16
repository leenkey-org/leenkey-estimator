import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EXPIRED_LINK_PATH } from "@/leenkey/auth/landing";
import { fr } from "@/lib/i18n/fr";
import { confirmLinkSchema } from "@/lib/validations/auth";
import { AuthShell } from "../_components/auth-shell";
import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = { title: fr.auth.confirm.metaTitle };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Link of the confirmation and reset emails (supabase/templates/). Opening it
// uses nothing: the token is used by the button, so an email scanner that
// opens the link first does not consume it.
export default async function ConfirmationPage({ searchParams }: { searchParams: SearchParams }) {
  const parsed = confirmLinkSchema.safeParse(await searchParams);
  if (!parsed.success) redirect(EXPIRED_LINK_PATH);
  const { token_hash, type } = parsed.data;
  const t = fr.auth.confirm;
  const recovery = type === "recovery";
  return (
    <AuthShell
      title={recovery ? t.recoveryTitle : t.emailTitle}
      lead={recovery ? t.recoveryLead : t.emailLead}
    >
      <ConfirmForm
        tokenHash={token_hash}
        type={type}
        label={recovery ? t.recoverySubmit : t.emailSubmit}
      />
    </AuthShell>
  );
}
