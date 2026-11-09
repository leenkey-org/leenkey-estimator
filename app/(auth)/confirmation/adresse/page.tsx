import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/shared/button";
import { getUser } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { AuthShell } from "../../_components/auth-shell";

const t = fr.account.emailChange;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return { title: (await searchParams).etat === "fait" ? t.doneMetaTitle : t.halfMetaTitle };
}

// A link of a change of address opened (L1-39), never signing this browser
// in (leenkey/auth/actions.ts, confirmEmailChange): the first of the two
// links (« Plus qu'un lien »), or the second one from a browser that is not
// signed in to the account (?etat=fait).
export default async function EmailChangePage({ searchParams }: { searchParams: SearchParams }) {
  const done = (await searchParams).etat === "fait";
  const user = done ? null : await getUser();
  return (
    <AuthShell title={done ? t.doneTitle : t.halfTitle} lead={done ? t.doneLead : t.halfLead}>
      <Link
        href={user ? ROUTES.account : "/connexion"}
        className={cn(
          buttonVariants({ variant: done ? "primary" : "secondary", size: "lg" }),
          "w-full",
        )}
      >
        {user ? fr.account.back : t.halfAction}
      </Link>
    </AuthShell>
  );
}
