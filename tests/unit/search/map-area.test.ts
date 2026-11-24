import { describe, expect, it } from "vitest";
import { clusterPoints, type PixelPoint } from "@/core/maps/cluster";
import { toSqlBbox, toSqlFilters } from "@/leenkey/search/sql-filters";
import {
  formatBbox,
  parseBbox,
  parseSearchParams,
  SearchBbox,
  searchHref,
} from "@/lib/validations/search";

// L1-16b: grouping of the pills and « Rechercher dans cette zone ».

const point = (id: string, x: number, y: number): PixelPoint => ({ id, x, y });
const options = { radius: 40, minSize: 4 };

describe("grouping of the pills that pile up", () => {
  it("groups four points within the radius, in the middle of them", () => {
    const { clusters, singles } = clusterPoints(
      [point("a", 100, 100), point("b", 120, 100), point("c", 100, 120), point("d", 120, 120)],
      options,
    );
    expect(clusters).toEqual([{ ids: ["a", "b", "c", "d"], x: 110, y: 110 }]);
    expect(singles).toEqual([]);
  });

  it("leaves three piled up points alone (beyond 3, DESIGN.md 8)", () => {
    const { clusters, singles } = clusterPoints(
      [point("a", 0, 0), point("b", 10, 0), point("c", 0, 10)],
      options,
    );
    expect(clusters).toEqual([]);
    expect(singles).toEqual(["a", "b", "c"]);
  });

  it("keeps the points far apart, in the order given", () => {
    const { clusters, singles } = clusterPoints(
      [point("a", 0, 0), point("b", 100, 0), point("c", 0, 100), point("d", 100, 100)],
      options,
    );
    expect(clusters).toEqual([]);
    expect(singles).toEqual(["a", "b", "c", "d"]);
  });

  it("counts the radius from the first point of a group, the edge included", () => {
    const { clusters } = clusterPoints(
      [
        point("a", 0, 0),
        point("b", 40, 0),
        point("c", 0, 40),
        point("d", 0, -40),
        point("e", 41, 0),
      ],
      options,
    );
    expect(clusters.map((cluster) => cluster.ids)).toEqual([["a", "b", "c", "d"]]);
  });

  it("lets the neighbours of a lone point gather around another one", () => {
    // « a » has three neighbours only; « b » has four around it.
    const { clusters, singles } = clusterPoints(
      [
        point("a", 0, 0),
        point("b", 35, 0),
        point("c", 60, 0),
        point("d", 35, 30),
        point("e", 35, -30),
      ],
      options,
    );
    expect(singles).toEqual(["a"]);
    expect(clusters.map((cluster) => cluster.ids)).toEqual([["b", "c", "d", "e"]]);
  });

  it("makes several groups, each point in one only", () => {
    const left = [0, 1, 2, 3, 4].map((index) => point(`l${index}`, index * 5, 0));
    const right = [0, 1, 2, 3].map((index) => point(`r${index}`, 500 + index * 5, 0));
    const { clusters, singles } = clusterPoints([...left, ...right], options);
    expect(clusters.map((cluster) => cluster.ids.length)).toEqual([5, 4]);
    expect(singles).toEqual([]);
    const ids = clusters.flatMap((cluster) => cluster.ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never groups fewer than two points, nor anything without points", () => {
    expect(clusterPoints([point("a", 0, 0)], { radius: 40, minSize: 1 })).toEqual({
      clusters: [],
      singles: ["a"],
    });
    expect(clusterPoints([], options)).toEqual({ clusters: [], singles: [] });
  });
});

describe("the area of the map", () => {
  const area = { south: 48.62, west: 2.25, north: 48.73, east: 2.42 };

  it("accepts an area in order, within the world", () => {
    expect(SearchBbox.safeParse(area).success).toBe(true);
    const invalid: unknown[] = [
      { ...area, south: 48.8 },
      { ...area, west: 2.5 },
      { ...area, north: 91 },
      { ...area, east: 181 },
      { ...area, south: Number.NaN },
      { south: 48.62, west: 2.25, north: 48.73 },
      { ...area, zoom: 12 },
      "48.62,2.25,48.73,2.42",
    ];
    for (const value of invalid) {
      expect(SearchBbox.safeParse(value).success, JSON.stringify(value)).toBe(false);
    }
  });

  it("is written south, west, north, east, to five decimals", () => {
    expect(formatBbox({ south: 48.6212345, west: 2.25, north: 48.7300001, east: 2.4199999 })).toBe(
      "48.62123,2.25,48.73,2.42",
    );
    expect(parseBbox("48.62,2.25,48.73,2.42")).toEqual(area);
    expect(parseBbox("-33.9,-70.7,-33.3,-70.5")).toEqual({
      south: -33.9,
      west: -70.7,
      north: -33.3,
      east: -70.5,
    });
  });

  it("ignores an area it cannot read", () => {
    for (const value of [
      undefined,
      "",
      "48.62,2.25,48.73",
      "48.62,2.25,48.73,2.42,1",
      "48.73,2.25,48.62,2.42",
      "48.62,2.42,48.73,2.25",
      "48.62,2.25,48.73,abc",
      "48.62,2.25,48.73,1e2",
      "48.62, 2.25,48.73,2.42",
      "1000,2.25,48.73,2.42",
    ]) {
      expect(parseBbox(value), String(value)).toBeUndefined();
    }
  });

  it("is read from the URL with the filters, and written back", () => {
    const query = parseSearchParams(
      new URLSearchParams("ville=savigny-sur-orge&budget_max=400000&bbox=48.62,2.25,48.73,2.42"),
    );
    expect(query).toEqual({
      filters: { location: "savigny-sur-orge", priceMaxCents: 40_000_000 },
      sort: "recent",
      page: 1,
      bbox: area,
    });
    const href = searchHref(query);
    expect(href).toBe(
      "/acheter?ville=savigny-sur-orge&budget_max=400000&bbox=48.62%2C2.25%2C48.73%2C2.42",
    );
    expect(parseSearchParams(new URL(href, "https://leenkey.fr").searchParams)).toEqual(query);
  });

  it("is left out of the query when it is invalid, the filters kept", () => {
    expect(parseSearchParams({ bbox: "48.73,2.25,48.62,2.42", type: "maison" })).toEqual({
      filters: { type: "maison" },
      sort: "recent",
      page: 1,
    });
  });

  it("goes to search_listings as [west, south, east, north], apart from the filters", () => {
    expect(toSqlBbox(area)).toEqual([2.25, 48.62, 2.42, 48.73]);
    expect(toSqlBbox(undefined)).toBeUndefined();
    // The filters of the SQL function know nothing of the area.
    expect(toSqlFilters(parseSearchParams({ bbox: "48.62,2.25,48.73,2.42" }).filters)).toEqual({});
  });
});
