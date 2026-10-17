import { isInLaunchZone } from "@/lib/config/launch-zone";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/** « · Hors zone » when the town is outside the launch zone (SPEC-V2 section 20). */
export function OutOfZoneFlag({ postalCode, city }: { postalCode: string; city: string }) {
  if (isInLaunchZone(postalCode, city)) return null;
  return (
    <span className="shrink-0 font-semibold text-lk-warning">
      {" · "}
      {fr.adminListings.outOfZone}
    </span>
  );
}

/**
 * « Juvisy-sur-Orge · LK-0005 », and « Hors zone » outside the launch zone:
 * accepted, flagged to the admin. On a narrow card, the town and the
 * reference are cut, never the flag.
 */
export function ListingPlace({
  city,
  reference,
  postalCode,
  className,
}: {
  city: string;
  reference: string;
  postalCode: string;
  className?: string;
}) {
  return (
    <p className={cn("flex min-w-0 whitespace-pre", className)}>
      <span className="truncate">
        {city} · {reference}
      </span>
      <OutOfZoneFlag postalCode={postalCode} city={city} />
    </p>
  );
}
