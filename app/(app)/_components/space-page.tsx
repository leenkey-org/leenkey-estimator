import type { ReactNode } from "react";

/**
 * Page of a signed-in area until its screen exists: H1, an optional element
 * on its right (the mobile bell of a home page), then the content.
 */
export function SpacePage({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lk-settings px-5 py-8 md:px-10 md:py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">
          {title}
        </h1>
        {aside}
      </div>
      {children}
    </div>
  );
}
