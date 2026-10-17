import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Back office table (docs/DESIGN.md 10.2 DataTable): radius 6 container with a
// line border, stone header in 12 px 600, rows of 56 px at least in 13 px,
// line separators. The actions of a row go in a DataTableActions row right
// under it, aligned right.

export function DataTable({
  label,
  children,
  className,
}: {
  /** Accessible name of the table. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-x-auto rounded-lk-md border border-lk-line bg-lk-surface", className)}
    >
      <table
        aria-label={label}
        className="w-full border-collapse text-left text-lk-secondary text-lk-ink"
      >
        {children}
      </table>
    </div>
  );
}

export function DataTableHeader({ columns }: { columns: readonly string[] }) {
  return (
    <thead className="bg-lk-stone-2">
      <tr>
        {columns.map((column) => (
          <th
            key={column}
            scope="col"
            className="px-5 py-3 text-lk-caption font-semibold whitespace-nowrap text-lk-ink-3"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function DataTableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-t border-lk-line first:border-t-0", className)} {...props} />;
}

export function DataTableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("h-14 px-5 py-3.5 align-middle", className)} {...props} />;
}

/** First cell of a row, which names it (the property, the person). */
export function DataTableRowHeader({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="row"
      className={cn("h-14 px-5 py-3.5 text-left align-middle font-normal", className)}
      {...props}
    />
  );
}

/** Actions of the row above, aligned right, without a separator between the two. */
export function DataTableActions({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columns} className="px-5 pt-0 pb-3.5">
        <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
      </td>
    </tr>
  );
}
