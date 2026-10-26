import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";

/**
 * Page of a signed-in area until its screen exists: H1, the bell on its right
 * below 768 px (DECISIONS Q26; in the TopNav from there), then the content.
 * The bell is on every page of the areas: the buyer home is not a tab.
 */
export function SpacePage({
  title,
  roles,
  profileId,
  back,
  children,
}: {
  title: string;
  /** Roles of the account: the bell takes the sentence of the current space. */
  roles: readonly string[];
  /** The account the page is rendered for: its notifications. */
  profileId: string;
  /** A page under another one (« Mon compte »): the way back, above the title. */
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lk-settings px-5 py-8 md:px-10 md:py-10">
      {back ? (
        <Link
          href={back.href}
          className="-ml-1 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lk-sm pr-2 text-lk-secondary font-medium text-lk-ink-2 hover:text-lk-ink focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">
          {title}
        </h1>
        <SpaceNotificationBell roles={roles} profileId={profileId} className="md:hidden" />
      </div>
      {children}
    </div>
  );
}
