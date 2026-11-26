// Named lists of favourites (DECISIONS.md 2026-11-26): the filter of the
// favourites page, read from its address (`?liste=<id>`, `?liste=aucune`).
// Pure: used by the page (server), its client components and their tests.

/** A list of the account, with the number of its favourites still online. */
export type FavoriteList = { id: string; name: string; count: number };

export const LIST_PARAM = "liste";
/** `?liste=aucune`: the favourites that are in no list. */
export const NO_LIST = "aucune";

export type ListFilter =
  | { kind: "all" }
  | { kind: "none" }
  | { kind: "list"; list: Pick<FavoriteList, "id" | "name"> };

/**
 * The filter asked by the address. A list that is not the account's (deleted
 * since, mistyped) shows every favourite, and « Sans liste » only exists
 * with lists.
 */
export function parseListFilter(
  value: string | string[] | undefined,
  lists: readonly Pick<FavoriteList, "id" | "name">[],
): ListFilter {
  const asked = Array.isArray(value) ? value[0] : value;
  if (!asked || lists.length === 0) return { kind: "all" };
  if (asked === NO_LIST) return { kind: "none" };
  const list = lists.find((candidate) => candidate.id === asked);
  return list ? { kind: "list", list: { id: list.id, name: list.name } } : { kind: "all" };
}

/** Whether a favourite filed in `listId` shows under the filter of this key. */
export function inListFilter(listId: string | null, key: string): boolean {
  if (key === "all") return true;
  if (key === "none") return listId === null;
  return listId === key;
}

/** The key of a filter: "all", "none" or the id of its list. */
export function listFilterKey(filter: ListFilter): string {
  return filter.kind === "list" ? filter.list.id : filter.kind;
}

/** The address of the favourites page under the filter of this key. */
export function listFilterHref(base: string, key: string): string {
  if (key === "all") return base;
  return `${base}?${LIST_PARAM}=${key === "none" ? NO_LIST : encodeURIComponent(key)}`;
}

/** The lists with their counts, by name, from the favourites shown. */
export function countFavoriteLists(
  lists: readonly Pick<FavoriteList, "id" | "name">[],
  items: readonly { listId: string | null }[],
): FavoriteList[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.listId) counts.set(item.listId, (counts.get(item.listId) ?? 0) + 1);
  }
  return lists
    .map((list) => ({ id: list.id, name: list.name, count: counts.get(list.id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }));
}
