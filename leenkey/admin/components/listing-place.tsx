import { isInLaunchZone } from "@/lib/config/launch-zone";
import { fr } from "@/lib/i18n/fr";

/**
 * « Juvisy-sur-Orge · LK-0005 », and « Hors zone » outside the launch zone:
 * accepted, flagged to the admin (SPEC-V2 section 20).
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
    <p className={className}>
      {city} · {reference}
      {isInLaunchZone(postalCode) ? null : (
        <>
          {" · "}
          <span className="font-semibold text-lk-warning-fg">{fr.adminListings.outOfZone}</span>
        </>
      )}
    </p>
  );
}
