import { z } from "zod";

// L1-18: a favourite added or removed from a listing or the favourites page.
export const favoriteSchema = z.object({
  listingId: z.string().uuid(),
  favorite: z.boolean(),
});

export type FavoriteInput = z.infer<typeof favoriteSchema>;
