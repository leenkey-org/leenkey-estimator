import type { ReactNode } from "react";

/**
 * Section of a tab of the page of a property: an h2 (16 then 17 px 600), a
 * link « Modifier » on its right when the property can be changed, then its
 * content.
 */
export function SheetSection({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} className="text-lk-h3 font-semibold text-lk-ink lg:text-lk-h3-lg">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
