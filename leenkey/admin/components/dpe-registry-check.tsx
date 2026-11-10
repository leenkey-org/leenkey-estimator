import { InlineAlert } from "@/components/shared/inline-alert";
import type { PublicListing } from "@/leenkey/listings/queries";
import { lookupDpe } from "@/leenkey/properties/dpe-registry";
import { formatDay } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.adminListings.dpe;

const REGISTER = "https://observatoire-dpe-audit.ademe.fr";

type Row = { label: string; entered: string | null; registered: string | null };

/**
 * The DPE of a listing against the register of ADEME (L1-66), on its sheet
 * in the back office: what the seller entered beside what the register holds
 * for the number, read when the sheet opens. A difference is shown, never
 * decided here: a DPE updated in 2024 or 2026 has a new label, and its
 * certificate. Rendered in a Suspense: the register may be slow.
 */
export async function DpeRegistryCheck({
  number,
  date,
  listing,
}: {
  number: string;
  date: string | null;
  listing: Pick<PublicListing, "dpe" | "ges" | "postalCode" | "energy">;
}) {
  const found = await lookupDpe(number);
  const link = (
    <a
      href={REGISTER}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 hover:no-underline"
    >
      {t.register}
    </a>
  );
  if (!found.ok) {
    return (
      <InlineAlert tone="info" live={false} action={link}>
        {t.unavailable(number)}
      </InlineAlert>
    );
  }
  if (!found.data) {
    return (
      <InlineAlert tone="warning" live={false} action={link}>
        {t.unknown(number)}
      </InlineAlert>
    );
  }
  const record = found.data;
  const figure = (value: number | null, unit: string) =>
    value === null ? null : `${value} ${unit}`;
  const rows: Row[] = [
    { label: t.energyClass, entered: listing.dpe, registered: record.dpe },
    { label: t.climateClass, entered: listing.ges, registered: record.ges },
    {
      label: t.date,
      entered: date ? formatDay(date) : null,
      registered: record.date ? formatDay(record.date) : null,
    },
    {
      label: t.energyUse,
      entered: figure(listing.energy.kwhM2Year, t.kwh),
      registered: figure(record.energyKwhM2Year, t.kwh),
    },
    {
      label: t.emissions,
      entered: figure(listing.energy.gesKgM2Year, t.kg),
      registered: figure(record.gesKgM2Year, t.kg),
    },
    { label: t.postalCode, entered: listing.postalCode, registered: record.postalCode },
  ];
  // Only what both sides give is compared: a figure the seller left empty is not a difference.
  const differs = (row: Row) =>
    row.entered !== null && row.registered !== null && row.entered !== row.registered;
  const different = rows.some(differs) || record.kind !== listing.energy.kind;
  return (
    <div className="flex flex-col gap-3 rounded-lk-md border border-lk-line px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-lk-label font-semibold text-lk-ink">{t.title(number)}</p>
        <p className="text-lk-caption text-lk-ink-3">
          {record.validUntil ? t.validUntil(formatDay(record.validUntil)) : null} {link}
        </p>
      </div>
      <table className="w-full text-lk-secondary">
        <thead>
          <tr className="text-left text-lk-caption text-lk-ink-3">
            <th scope="col" className="py-1 pr-3 font-medium">
              <span className="sr-only">{t.field}</span>
            </th>
            <th scope="col" className="py-1 pr-3 font-medium">
              {t.entered}
            </th>
            <th scope="col" className="py-1 font-medium">
              {t.registered}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-lk-line">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal text-lk-ink-2">
                {row.label}
              </th>
              <td className="py-1.5 pr-3 text-lk-ink">{row.entered ?? t.none}</td>
              <td
                className={
                  differs(row) ? "py-1.5 font-semibold text-lk-danger" : "py-1.5 text-lk-ink"
                }
              >
                {row.registered ?? t.none}
                {differs(row) ? <span className="sr-only"> {t.differs}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {different ? (
        <InlineAlert tone="warning" live={false}>
          {record.kind !== listing.energy.kind ? t.kindDiffers[record.kind] : t.different}
        </InlineAlert>
      ) : (
        <p className="text-lk-caption text-lk-success-fg">{t.same}</p>
      )}
    </div>
  );
}

/** While the register answers. */
export function DpeRegistryPending({ number }: { number: string }) {
  return (
    <p className="rounded-lk-md border border-lk-line px-4 py-3 text-lk-secondary text-lk-ink-3">
      {t.pending(number)}
    </p>
  );
}
