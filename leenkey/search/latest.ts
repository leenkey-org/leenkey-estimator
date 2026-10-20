// « Les derniers biens » of the home page (SPEC-V2 8.1): the three published
// listings most recently put online, those with a photo first (L1-46: the
// home page shows homes rather than drawings whenever it can), or nothing
// when fewer are online (the block is hidden rather than half empty). Pure,
// for the tests.

export const LATEST_COUNT = 3;

/** `items` from the most recent; their order is kept within each group. */
export function latestOf<T>(
  items: readonly T[],
  hasPhoto: (item: T) => boolean = () => true,
  count: number = LATEST_COUNT,
): T[] {
  if (items.length < count) return [];
  const withPhoto = items.filter(hasPhoto);
  return [...withPhoto, ...items.filter((item) => !hasPhoto(item))].slice(0, count);
}
