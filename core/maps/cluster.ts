// Grouping of the labels of a map that pile up at a low zoom (L1-16b), in
// pixels of the current projection, without a library (the clusterer of
// Google is a dependency that is not pre-approved). Generic: points with an
// id, nothing of the listings. Few points (a page of results, 1 000 at
// most): a plain pass over them is enough.

export type PixelPoint = { id: string; x: number; y: number };

export type PixelCluster = {
  /** The points of the group, in the order they were given. */
  ids: string[];
  /** Where the group is drawn: the middle of its points. */
  x: number;
  y: number;
};

export type ClusterOptions = {
  /** Distance in pixels from the first point of a group within which the others join it. */
  radius: number;
  /** Fewest points that make a group (DESIGN.md 8: beyond 3). */
  minSize: number;
};

/**
 * Groups the points in the order given (the earlier ones first, as the
 * order of the list): each point not yet grouped gathers the points not yet
 * grouped within `radius` of it; with `minSize` points or more they become
 * a group, otherwise it stays alone and its neighbours may still gather
 * around another point. The points left alone are in `singles`, in order.
 */
export function clusterPoints(
  points: readonly PixelPoint[],
  { radius, minSize }: ClusterOptions,
): { clusters: PixelCluster[]; singles: string[] } {
  const grouped = new Set<string>();
  const clusters: PixelCluster[] = [];
  const singles: string[] = [];
  const limit = radius * radius;
  for (const seed of points) {
    if (grouped.has(seed.id)) continue;
    const members = points.filter(
      (point) =>
        !grouped.has(point.id) && (point.x - seed.x) ** 2 + (point.y - seed.y) ** 2 <= limit,
    );
    if (members.length >= Math.max(2, minSize)) {
      for (const member of members) grouped.add(member.id);
      clusters.push({
        ids: members.map((member) => member.id),
        x: members.reduce((sum, member) => sum + member.x, 0) / members.length,
        y: members.reduce((sum, member) => sum + member.y, 0) / members.length,
      });
    } else {
      grouped.add(seed.id);
      singles.push(seed.id);
    }
  }
  return { clusters, singles };
}
