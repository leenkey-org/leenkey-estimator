// « Les derniers biens » of the home page (SPEC-V2 8.1): the three published
// listings most recently put online, or nothing when fewer are online (the
// block is hidden rather than half empty). Pure, for the tests.

export const LATEST_COUNT = 3;

export function latestOf<T>(items: readonly T[], count: number = LATEST_COUNT): T[] {
  return items.length >= count ? items.slice(0, count) : [];
}
