import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

/**
 * Drawn streets behind the gate and the notices of a map: the place of the
 * map before it loads, never a picture of Google's.
 */
function MapBackdrop({ children, className }: { children: ReactNode; className?: string }) {
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

/**
 * Gate of a map from a third party (L1-16): nothing is asked of its provider
 * before the visitor clicks « Afficher la carte », and the note says what
 * that sends. Compact in a small frame (the map of a listing).
 */
export function MapGate({
  title,
  note,
  action,
  onAllow,
  compact = false,
  className,
}: {
  title: string;
  note: string;
  action: string;
  onAllow: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <MapBackdrop className={className}>
      <div
        className={cn(
          "relative flex max-w-90 flex-col items-center gap-2 rounded-lk-xl bg-lk-surface text-center shadow-lk-block",
          compact ? "px-4 py-3.5" : "px-6 py-5.5",
        )}
      >
        {compact ? null : (
          <span className="flex size-10 items-center justify-center rounded-full bg-lk-blue-tint text-lk-blue">
            <MapPin aria-hidden="true" className="size-5" />
          </span>
        )}
        <p className="text-lk-title font-semibold text-lk-ink">{title}</p>
        <p className="text-lk-caption text-lk-ink-3">{note}</p>
        <Button shape="pill" size="sm" onClick={onAllow} className="mt-1">
          <MapPin aria-hidden="true" />
          {action}
        </Button>
      </div>
    </MapBackdrop>
  );
}

/** In the place of a map: loading, or not available (no key, key refused). */
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
