import type { ReactNode } from "react";
import type { AccountMenuProps } from "./account-menu";
import { AdminMobileHeader } from "./admin-mobile-header";
import { AdminSidebar } from "./admin-sidebar";
import { BottomNav } from "./bottom-nav";
import { BOTTOM_NAV_OFFSET, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

export type AdminShellProps = {
  /** Accessible name of the navigations (sidebar and bottom bar). */
  label: string;
  /** Destination of the sidebar logo. */
  homeHref: string;
  /** Sidebar items; the mobile header takes the page title from them. */
  items: readonly NavItem[];
  /** Four tabs of the bottom bar, below 768 px. */
  tabs: readonly NavItem[];
  /** Mobile title of a page that no item covers. */
  fallbackTitle: string;
  account: Omit<AccountMenuProps, "variant" | "className">;
  /** The NotificationBell of the sidebar (beside the logo) and of the mobile header. */
  notifications?: { sidebar: ReactNode; header: ReactNode };
  /** Under the content, beside the sidebar (SiteFooter). */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Back office frame (docs/DESIGN.md 10.6, template G7). From 768 px: sticky
 * 240 px sidebar and content on --lk-bg, padding 28 × 32. Below: the
 * AdminMobileHeader, the content with 20 px gutters and the admin BottomNav.
 * The footer slot ends the content column, at the bottom of a short page.
 */
export function AdminShell({
  label,
  homeHref,
  items,
  tabs,
  fallbackTitle,
  account,
  notifications,
  footer,
  children,
  className,
}: AdminShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-lk-bg md:grid md:grid-cols-[15rem_minmax(0,1fr)]",
        BOTTOM_NAV_OFFSET,
        className,
      )}
    >
      <AdminSidebar
        label={label}
        homeHref={homeHref}
        items={items}
        account={account}
        notifications={notifications?.sidebar}
        className="hidden md:sticky md:top-0 md:flex md:h-dvh"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileHeader
          items={items}
          fallbackTitle={fallbackTitle}
          account={account}
          notifications={notifications?.header}
        />
        <main className="flex-1 px-5 pt-5 pb-8 md:px-8 md:py-7">{children}</main>
        {footer}
      </div>
      <BottomNav label={label} items={tabs} />
    </div>
  );
}
