import type { ReactNode } from "react";

/**
 * Page of the back office until its screen exists. Page title 24 px 700
 * wide from 768 px (docs/DESIGN.md 10.6); below, the AdminMobileHeader shows
 * it and the H1 stays for screen readers only.
 */
export function AdminPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only text-lk-h2-lg font-bold text-wide text-lk-ink md:not-sr-only">
        {title}
      </h1>
      {children}
    </div>
  );
}
