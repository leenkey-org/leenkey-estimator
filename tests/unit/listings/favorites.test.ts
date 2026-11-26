import { describe, expect, it } from "vitest";
import { chunk } from "@/lib/utils";
import {
  countFavoriteLists,
  inListFilter,
  listFilterHref,
  listFilterKey,
  parseListFilter,
} from "@/leenkey/favorites/lists";
import {
  FAVORITE_LIST_NAME_MAX,
  favoriteListCreateSchema,
  favoriteListDeleteSchema,
  favoriteListRenameSchema,
  favoriteMoveSchema,
  favoriteSchema,
  isReservedListName,
  RESERVED_LIST_NAME_ISSUE,
} from "@/lib/validations/favorites";

// L1-18: input of the setFavorite action, ids split for the `.in()` filters.
// Named lists (DECISIONS.md 2026-11-26): their inputs, the filter of the page.

describe("named lists of favourites: inputs", () => {
  const listId = "0b0f4f0e-5c0a-4a53-9d0c-3f3f1f6f7a10";
  const listingId = "623efc8b-97d4-4902-ac43-406417498893";

  it("keeps a name without the spaces around it, one space between its words", () => {
    expect(favoriteListCreateSchema.parse({ name: "  Lyon   3e \n" })).toEqual({ name: "Lyon 3e" });
    expect(favoriteListRenameSchema.parse({ listId, name: " À visiter " })).toEqual({
      listId,
      name: "À visiter",
    });
  });

  it("takes a name of 1 to 40 characters, counted once trimmed", () => {
    const longest = "a".repeat(FAVORITE_LIST_NAME_MAX);
    expect(favoriteListCreateSchema.parse({ name: ` ${longest} ` }).name).toBe(longest);
    for (const name of ["", "   ", `${longest}a`, null, 12, undefined]) {
      expect(favoriteListCreateSchema.safeParse({ name }).success, JSON.stringify(name)).toBe(
        false,
      );
      expect(favoriteListRenameSchema.safeParse({ listId, name }).success).toBe(false);
    }
  });

  it("refuses the names of the two filters of the page, whatever their case and spaces", () => {
    for (const name of ["Tous", " tous ", "TOUS", "Sans liste", "sans   LISTE", "\tSans liste\n"]) {
      expect(isReservedListName(name), JSON.stringify(name)).toBe(true);
      const created = favoriteListCreateSchema.safeParse({ name });
      expect(created.success, JSON.stringify(name)).toBe(false);
      expect(created.error?.issues.map((issue) => issue.message)).toEqual([
        RESERVED_LIST_NAME_ISSUE,
      ]);
      expect(favoriteListRenameSchema.safeParse({ listId, name }).success).toBe(false);
    }
    for (const name of ["Tous les biens", "Toussus-le-Noble", "Sans liste d'attente", "Tout"]) {
      expect(isReservedListName(name), name).toBe(false);
      expect(favoriteListCreateSchema.parse({ name }).name).toBe(name);
    }
    // An empty or too long name is not told as a reserved one.
    const empty = favoriteListCreateSchema.safeParse({ name: " " });
    expect(empty.error?.issues.some((issue) => issue.message === RESERVED_LIST_NAME_ISSUE)).toBe(
      false,
    );
  });

  it("asks the id of the list to rename or delete", () => {
    expect(favoriteListDeleteSchema.parse({ listId })).toEqual({ listId });
    for (const input of [{}, { listId: "aucune" }, { listId: null }]) {
      expect(favoriteListDeleteSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
      expect(favoriteListRenameSchema.safeParse({ ...input, name: "Lyon" }).success).toBe(false);
    }
  });

  it("files a favourite into a list, or into none", () => {
    expect(favoriteMoveSchema.parse({ listingId, listId })).toEqual({ listingId, listId });
    expect(favoriteMoveSchema.parse({ listingId, listId: null }).listId).toBeNull();
    for (const input of [
      { listingId },
      { listingId, listId: "" },
      { listingId, listId: "aucune" },
      { listingId: "lk0005", listId },
      { listId },
    ]) {
      expect(favoriteMoveSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
    }
  });
});

describe("named lists of favourites: the filter of the page", () => {
  const lyon = { id: "0b0f4f0e-5c0a-4a53-9d0c-3f3f1f6f7a10", name: "Lyon" };
  const visit = { id: "7c9e6679-7425-40de-944b-e07fc1f90ae7", name: "à visiter" };
  const lists = [lyon, visit];

  it("reads the filter from the address", () => {
    expect(parseListFilter(undefined, lists)).toEqual({ kind: "all" });
    expect(parseListFilter("", lists)).toEqual({ kind: "all" });
    expect(parseListFilter("aucune", lists)).toEqual({ kind: "none" });
    expect(parseListFilter(lyon.id, lists)).toEqual({ kind: "list", list: lyon });
    expect(parseListFilter([visit.id, lyon.id], lists)).toEqual({ kind: "list", list: visit });
  });

  it("shows every favourite for a list that is not the account's, or without lists", () => {
    expect(parseListFilter("4d2f3c1a-9b7e-4c55-8a10-1f2e3d4c5b6a", lists)).toEqual({ kind: "all" });
    expect(parseListFilter("Lyon", lists)).toEqual({ kind: "all" });
    expect(parseListFilter("aucune", [])).toEqual({ kind: "all" });
    expect(parseListFilter(lyon.id, [])).toEqual({ kind: "all" });
  });

  it("gives each filter its key and its address", () => {
    expect(listFilterKey({ kind: "all" })).toBe("all");
    expect(listFilterKey({ kind: "none" })).toBe("none");
    expect(listFilterKey({ kind: "list", list: lyon })).toBe(lyon.id);
    expect(listFilterHref("/acquereur/favoris", "all")).toBe("/acquereur/favoris");
    expect(listFilterHref("/acquereur/favoris", "none")).toBe("/acquereur/favoris?liste=aucune");
    expect(listFilterHref("/acquereur/favoris", lyon.id)).toBe(
      `/acquereur/favoris?liste=${lyon.id}`,
    );
  });

  it("keeps the favourites of the filter", () => {
    expect(inListFilter(null, "all")).toBe(true);
    expect(inListFilter(lyon.id, "all")).toBe(true);
    expect(inListFilter(null, "none")).toBe(true);
    expect(inListFilter(lyon.id, "none")).toBe(false);
    expect(inListFilter(lyon.id, lyon.id)).toBe(true);
    expect(inListFilter(visit.id, lyon.id)).toBe(false);
    expect(inListFilter(null, lyon.id)).toBe(false);
  });

  it("counts the favourites of each list, the lists by name", () => {
    const items = [
      { listId: lyon.id },
      { listId: null },
      { listId: lyon.id },
      // A list that is gone: counted nowhere.
      { listId: "4d2f3c1a-9b7e-4c55-8a10-1f2e3d4c5b6a" },
    ];
    expect(countFavoriteLists(lists, items)).toEqual([
      { ...visit, count: 0 },
      { ...lyon, count: 2 },
    ]);
    expect(countFavoriteLists([], items)).toEqual([]);
  });
});

describe("favoriteSchema", () => {
  const listingId = "623efc8b-97d4-4902-ac43-406417498893";

  it("accepts a listing id and the wanted state", () => {
    expect(favoriteSchema.parse({ listingId, favorite: true })).toEqual({
      listingId,
      favorite: true,
    });
    expect(favoriteSchema.parse({ listingId, favorite: false }).favorite).toBe(false);
  });

  it("refuses anything else", () => {
    for (const input of [
      null,
      {},
      { listingId, favorite: "true" },
      { listingId: "lk0005", favorite: true },
      { listingId: `${listingId} `, favorite: true },
      { favorite: true },
    ]) {
      expect(favoriteSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
    }
  });
});

describe("chunk", () => {
  it("splits in parts of the given size, in order, the last one shorter", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(
      chunk(
        Array.from({ length: 250 }, (_, i) => i),
        100,
      ).map((part) => part.length),
    ).toEqual([100, 100, 50]);
  });

  it("gives no part for an empty list", () => {
    expect(chunk([], 100)).toEqual([]);
  });
});
