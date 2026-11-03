import { pillClassName } from "@/components/shared/status-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

// The roles of an account and its suspension (L1-30a), as the badges of
// DESIGN.md 10.2: a pill whose label carries the meaning, not the colour alone.

type Role = Database["public"]["Enums"]["user_role"];

const ORDER: readonly Role[] = ["seller", "buyer", "admin"];
const badge = cn(pillClassName, "px-2.5 py-1.25 text-lk-micro font-semibold");

export function RoleBadges({ roles, className }: { roles: readonly Role[]; className?: string }) {
  const sorted = ORDER.filter((role) => roles.includes(role));
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {sorted.map((role) => (
        <span
          key={role}
          className={cn(
            badge,
            role === "admin" ? "bg-lk-navy text-white" : "bg-lk-stone-2 text-lk-ink-2",
          )}
        >
          {fr.adminUsers.roles[role]}
        </span>
      ))}
    </span>
  );
}

/** « Suspendu » (danger) or « Actif » (success). */
export function AccountStatusBadge({
  suspended,
  className,
}: {
  suspended: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        badge,
        suspended ? "bg-lk-danger-bg text-lk-danger-fg" : "bg-lk-success-bg text-lk-success-fg",
        className,
      )}
    >
      {suspended ? fr.adminUsers.suspendedBadge : fr.adminUsers.active}
    </span>
  );
}
