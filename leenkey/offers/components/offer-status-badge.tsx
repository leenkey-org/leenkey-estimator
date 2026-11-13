import { Eye } from "lucide-react";
import { pillClassName } from "@/components/shared/status-badge";
import { frOffer } from "@/lib/i18n/sections/offer";
import { cn } from "@/lib/utils";
import type { OfferStatus } from "../content";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

// docs/DESIGN.md 13.3, « États de l'offre côté acquéreur ».
const tones: Record<OfferStatus, string> = {
  draft: "bg-lk-stone-2 text-lk-ink-2",
  submitted: "bg-lk-blue-tint text-lk-blue-dark",
  viewed: "bg-lk-blue-tint text-lk-blue-dark",
  accepted: "bg-lk-success text-white",
  declined: "bg-lk-danger-bg text-lk-danger-fg",
  expired: "bg-lk-stone-2 text-lk-ink-2",
  withdrawn: "bg-lk-stone-2 text-lk-ink-2",
  superseded: "bg-lk-stone-2 text-lk-ink-2",
};

export function OfferStatusBadge({
  status,
  className,
}: {
  status: OfferStatus;
  className?: string;
}) {
  return (
    <span className={cn(pillClassName, tones[status], className)}>
      {status === "viewed" ? <Eye aria-hidden="true" className="size-3" /> : null}
      {fr.offer.status[status]}
    </span>
  );
}
