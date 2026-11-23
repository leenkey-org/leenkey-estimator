import { IdCard, ShieldCheck } from "lucide-react";
import { frIdentityDocument } from "@/lib/i18n/sections/identityDocument";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { identityDocument: frIdentityDocument } as const;

export type IdentityStatus = Database["public"]["Enums"]["identity_status"];

// What a seller reads of the identity of a buyer (DECISIONS.md 2026-11-23,
// docs/DESIGN.md 10.2): a label only, never the document nor its type. A
// line of text with its icon rather than a pill: its longest label wraps on
// a phone. Never « validé »: « déposée », « vérifiée par Leenkey ».
const tone: Record<IdentityStatus, string> = {
  not_provided: "text-lk-ink-3",
  provided: "text-lk-ink-2",
  checked: "text-lk-success-fg",
};

/** Where the identity of a buyer stands, for a seller: the label carries the meaning. */
export function IdentityLabel({
  status,
  className,
}: {
  status: IdentityStatus;
  className?: string;
}) {
  const Icon = status === "checked" ? ShieldCheck : IdCard;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-lk-caption font-semibold",
        tone[status],
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{fr.identityDocument.seller[status]}</span>
    </p>
  );
}

/** The mention due where a seller sees these labels: what they see, who reads the document. */
export function IdentityMention({ className }: { className?: string }) {
  return (
    <p className={cn("text-lk-caption text-lk-ink-3", className)}>
      {fr.identityDocument.seller.mention}
    </p>
  );
}
