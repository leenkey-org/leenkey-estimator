import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CONFIRM_COOKIE, decodeConfirmLink, EXPIRED_LINK_PATH } from "@/leenkey/auth/landing";
import { frAccount } from "@/lib/i18n/sections/account";
import { frAuth } from "@/lib/i18n/sections/auth";
import { AuthShell } from "../_components/auth-shell";
import { ConfirmForm } from "./confirm-form";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { account: frAccount, auth: frAuth } as const;

export const metadata: Metadata = { title: fr.auth.confirm.metaTitle };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Reached from an email link through /auth/confirm, which keeps the token in
// a cookie: opening the page uses nothing, the button does.
export default async function ConfirmationPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // A token in the address is moved into the cookie before any page renders.
  if (typeof params.token_hash === "string") {
    const query = new URLSearchParams({
      token_hash: params.token_hash,
      type: typeof params.type === "string" ? params.type : "email",
    });
    redirect(`/auth/confirm?${query}`);
  }
  const link = decodeConfirmLink((await cookies()).get(CONFIRM_COOKIE.name)?.value);
  if (!link) redirect(EXPIRED_LINK_PATH);
  const t = fr.auth.confirm;
  const copy =
    link.type === "recovery"
      ? { title: t.recoveryTitle, lead: t.recoveryLead, submit: t.recoverySubmit }
      : link.type === "email_change"
        ? fr.account.emailChange
        : { title: t.emailTitle, lead: t.emailLead, submit: t.emailSubmit };
  return (
    <AuthShell title={copy.title} lead={copy.lead}>
      <ConfirmForm label={copy.submit} />
    </AuthShell>
  );
}
