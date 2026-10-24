"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bell, Settings, X } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { facadeScope } from "./facade-root";
import { IconButton, iconButtonVariants } from "./icon-button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.nav.notifications;

export type NotificationBellProps = {
  /** Unread notifications: blue dot and « Notifications, 3 nouvelles ». */
  count: number;
  /** Sentence of the empty panel, written for the space (seller, buyer). */
  emptyText: string;
  /** Primary action of the empty panel (« Compléter mon annonce »). */
  emptyAction?: { href: string; label: string };
  /** Notification settings, the gear of the panel header. */
  settingsHref: string;
  /** nav: 42 px, in the TopNav; md: 44 px, in a mobile app header. */
  size?: "nav" | "md";
  /** dark: on a dark app header (DECISIONS Q26), on-dark until something is unread. */
  tone?: "light" | "dark";
  /**
   * The content of the panel under its header (filters, list, footer):
   * `empty` is the empty state of the space, for an account without any
   * notification; `close` closes the panel. Without it, the empty state.
   */
  panel?: (helpers: { close: () => void; empty: ReactNode }) => ReactNode;
  /** The panel opens or closes. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/**
 * Bell and notifications panel (docs/DESIGN.md 10.7). The bell is an
 * IconButton tint (on-dark on a dark header) with a 9 px blue dot bordered
 * white when something is unread. The panel is a Radix dialog: full screen
 * below 768 px, 420 px on the right from there, page dimmed with ink at 40 %,
 * opened from the right in 220 ms (no movement with reduced motion). Its
 * header is 72 px: round close button, « Notifications », settings. Under
 * it, the `panel` of the application (filters, list, « Tout marquer comme
 * lu »), otherwise the empty state.
 */
export function NotificationBell({
  count,
  emptyText,
  emptyAction,
  settingsHref,
  size = "md",
  tone = "light",
  panel,
  onOpenChange,
  className,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const unread = count > 0;
  const change = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  const close = () => change(false);
  const empty = (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-10">
      <EmptyState
        titleAs="h3"
        title={t.emptyTitle}
        description={emptyText}
        action={
          emptyAction ? (
            <Button asChild>
              <Link href={emptyAction.href} onClick={close}>
                {emptyAction.label}
              </Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
  return (
    <DialogPrimitive.Root open={open} onOpenChange={change}>
      <span className={cn("relative inline-flex shrink-0", className)}>
        <DialogPrimitive.Trigger asChild>
          <IconButton
            icon={Bell}
            variant={tone === "dark" && !unread ? "on-dark" : "tint"}
            aria-label={unread ? t.bellUnread(count) : t.bell}
            // 42 px in the TopNav, 44 px touch target kept.
            className={cn(size === "nav" && "size-10.5 after:absolute after:-inset-px")}
          />
        </DialogPrimitive.Trigger>
        {unread ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-1.75 top-1.5 size-3.25 rounded-full border-2 border-lk-surface bg-lk-blue"
          />
        ) : null}
      </span>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-lk-ink/40 duration-220 ease-out-lk",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "motion-reduce:animate-none",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            facadeScope,
            "fixed inset-0 z-50 flex flex-col bg-lk-surface outline-none",
            "md:left-auto md:w-105 md:border-l md:border-lk-line",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
            "motion-reduce:animate-none",
          )}
        >
          <div className="flex h-18 shrink-0 items-center gap-3 border-b border-lk-line px-4">
            <DialogPrimitive.Close asChild>
              <IconButton icon={X} variant="outline" size="sm" aria-label={t.close} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="min-w-0 flex-1 text-lk-title font-semibold text-lk-ink">
              {t.title}
            </DialogPrimitive.Title>
            <Link
              href={settingsHref}
              aria-label={t.settings}
              onClick={close}
              className={cn(
                iconButtonVariants({ variant: "transparent", size: "sm" }),
                "inline-flex items-center justify-center",
              )}
            >
              <Settings aria-hidden="true" />
            </Link>
          </div>
          {panel ? panel({ close, empty }) : empty}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
