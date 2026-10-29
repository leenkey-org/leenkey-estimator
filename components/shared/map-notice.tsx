import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Drawn streets in the place of a map before it loads, and behind its
 * notices: never a picture of Google's.
 */
export function MapBackdrop({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-lk-sand p-4",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full text-lk-line-strong"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 400 300"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      >
        <path d="M-20 70 C 80 60, 160 110, 260 90 S 380 40, 430 60" strokeWidth="10" />
        <path d="M-20 210 C 90 190, 170 240, 280 215 S 390 180, 430 200" strokeWidth="7" />
        <path d="M110 -20 C 100 80, 140 170, 120 320" strokeWidth="7" />
        <path d="M300 -20 C 290 90, 320 180, 300 320" strokeWidth="5" />
        <path d="M-20 140 L 430 150" strokeWidth="3" />
        <path d="M200 -20 L 215 320" strokeWidth="3" />
        <path
          d="M20 20 h60 v40 h-60z M160 120 h70 v50 h-70z M330 230 h50 v40 h-50z"
          strokeWidth="2"
        />
      </svg>
      {children}
    </div>
  );
}

/** In the place of a map: loading, or not available (no key, key refused, Google not reached). */
export function MapNotice({
  children,
  busy = false,
  className,
}: {
  children: ReactNode;
  busy?: boolean;
  className?: string;
}) {
  return (
    <MapBackdrop className={className}>
      <p
        role="status"
        aria-busy={busy || undefined}
        className="relative rounded-full bg-lk-surface px-4 py-2 text-lk-compact font-semibold text-lk-ink-2 shadow-lk-badge"
      >
        {children}
      </p>
    </MapBackdrop>
  );
}
