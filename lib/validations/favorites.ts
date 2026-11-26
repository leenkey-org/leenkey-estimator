import { z } from "zod";

// L1-18: a favourite added or removed from a listing or the favourites page.
export const favoriteSchema = z.object({
  listingId: z.string().uuid(),
  favorite: z.boolean(),
});

export type FavoriteInput = z.infer<typeof favoriteSchema>;

// Named lists of favourites (DECISIONS.md 2026-11-26). The same limits as the
// table favorite_lists (supabase/migrations/20261126120000_favorite_lists.sql).
export const FAVORITE_LIST_NAME_MAX = 40;
export const FAVORITE_LISTS_MAX = 20;

/** The name as kept: no space around it, one space between its words. */
function normalizeListName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * The names of the two filters of the favourites page (« Tous », « Sans
 * liste », lib/i18n/sections/favorites.ts): a list of that name would show
 * twice among them.
 */
const RESERVED_LIST_NAMES = ["tous", "sans liste"];

/** Whatever its case and the spaces around and inside it. */
export function isReservedListName(value: string): boolean {
  return RESERVED_LIST_NAMES.includes(normalizeListName(value).toLocaleLowerCase("fr"));
}

/** The message of the issue of a reserved name, told apart by the actions. */
export const RESERVED_LIST_NAME_ISSUE = "reserved";

const listName = z
  .string()
  .transform(normalizeListName)
  .pipe(
    z
      .string()
      .min(1)
      .max(FAVORITE_LIST_NAME_MAX)
      .refine((value) => !isReservedListName(value), { message: RESERVED_LIST_NAME_ISSUE }),
  );

export const favoriteListCreateSchema = z.object({ name: listName });

export const favoriteListRenameSchema = z.object({
  listId: z.string().uuid(),
  name: listName,
});

export const favoriteListDeleteSchema = z.object({ listId: z.string().uuid() });

/** `listId` null: out of every list (« Sans liste »). */
export const favoriteMoveSchema = z.object({
  listingId: z.string().uuid(),
  listId: z.string().uuid().nullable(),
});

export type FavoriteListCreateInput = z.infer<typeof favoriteListCreateSchema>;
export type FavoriteListRenameInput = z.infer<typeof favoriteListRenameSchema>;
export type FavoriteMoveInput = z.infer<typeof favoriteMoveSchema>;
