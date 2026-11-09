import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/shared/button";
import { getUser } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { AuthShell } from "../../_components/auth-shell";

const t = fr.account.emailChange;

export const metadata: Metadata = { title: t.halfMetaTitle };

// One link of a change of address opened (L1-39): Supabase Auth waits for
// the other one, sent to the other address, before changing it. Reached
// from either browser, with or without a session.
export default async function EmailChangeHalfPage() {
  const user = await getUser();
  return (
    <AuthShell title={t.halfTitle} lead={t.halfLead}>
      <Link
        href={user ? ROUTES.account : "/connexion"}
        className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}
      >
        {user ? fr.account.back : t.halfAction}
      </Link>
    </AuthShell>
  );
}
