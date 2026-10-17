import type { ReactNode } from "react";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";

/**
 * Page of a signed-in area until its screen exists: H1, the bell on its right
 * below 768 px (DECISIONS Q26; in the TopNav from there), then the content.
 * The bell is on every page of the areas: the buyer home is not a tab.
 */
export function SpacePage({
  title,
  roles,
  children,
}: {
  title: string;
  /** Roles of the account: the bell takes the sentence of the current space. */
  roles: readonly string[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lk-settings px-5 py-8 md:px-10 md:py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">
          {title}
        </h1>
        <SpaceNotificationBell roles={roles} className="md:hidden" />
      </div>
      {children}
    </div>
  );
}
