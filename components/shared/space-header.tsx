import Link from "next/link";
import { signOut } from "@/core/auth/actions";
import { fr } from "@/lib/i18n/fr";
import { Button } from "./button";

/**
 * Minimal header of the signed-in areas (logo, sign-out) until the role
 * navigation of L1-10 (TopNav, BottomNav, AdminShell).
 */
export function SpaceHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-lk-line bg-lk-surface px-5 lg:px-10">
      <Link
        href="/"
        className="rounded-lk-sm text-lk-h2 font-bold text-wide text-lk-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
      >
        {fr.auth.brand}
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          {fr.spaces.signOut}
        </Button>
      </form>
    </header>
  );
}
