import type { Json } from "@/types/database";

// One line of the history of a listing online (L1-35, SPEC-V2 8.3), as the
// database writes it (listing_revisions): the field, the old and the new
// value. Pure: read by the page of the property and by the back office.

export type RevisionChange =
  | { kind: "price"; oldCents: number | null; newCents: number | null }
  | { kind: "title"; old: string | null; new: string | null }
  | { kind: "description"; old: string | null; new: string | null }
  | { kind: "photoAdded"; caption: string | null }
  | { kind: "photoRemoved"; caption: string | null }
  | { kind: "caption"; old: string | null; new: string | null };

export type ListingRevision = {
  id: string;
  at: string;
  /** Changed by the team (an admin), not by the seller. */
  byTeam: boolean;
  change: RevisionChange;
};

export type RevisionRow = {
  id: string;
  field: string;
  old_value: Json | null;
  new_value: Json | null;
  created_at: string;
  changed_by: string;
};

const cents = (value: Json | null): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const text = (value: Json | null): string | null => (typeof value === "string" ? value : null);

/** The caption of a photo ({id, caption}); an empty caption is none. */
function caption(value: Json | null): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const words = value.caption;
  return typeof words === "string" && words.trim() !== "" ? words.trim() : null;
}

const isPhoto = (value: Json | null): boolean =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** null: a line this version does not know (a field added later). */
export function toRevision(row: RevisionRow, ownerId: string | null): ListingRevision | null {
  const change = toChange(row);
  if (!change) return null;
  return {
    id: row.id,
    at: row.created_at,
    byTeam: ownerId !== null && row.changed_by !== ownerId,
    change,
  };
}

function toChange(row: RevisionRow): RevisionChange | null {
  switch (row.field) {
    case "price":
      return { kind: "price", oldCents: cents(row.old_value), newCents: cents(row.new_value) };
    case "title":
      return { kind: "title", old: text(row.old_value), new: text(row.new_value) };
    case "description":
      return { kind: "description", old: text(row.old_value), new: text(row.new_value) };
    case "photo": {
      const before = isPhoto(row.old_value);
      const after = isPhoto(row.new_value);
      if (after && !before) return { kind: "photoAdded", caption: caption(row.new_value) };
      if (before && !after) return { kind: "photoRemoved", caption: caption(row.old_value) };
      if (before && after) {
        return { kind: "caption", old: caption(row.old_value), new: caption(row.new_value) };
      }
      return null;
    }
    default:
      return null;
  }
}

/** The change of a price in percent of the old one, rounded; null without both. */
export function priceChangePct(oldCents: number | null, newCents: number | null): number | null {
  if (oldCents === null || newCents === null || oldCents <= 0) return null;
  return Math.round(((newCents - oldCents) / oldCents) * 100);
}
