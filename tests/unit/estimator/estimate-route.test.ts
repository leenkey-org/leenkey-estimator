import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-13b: /api/estimate keeps its V1 answer and adds the analysis it kept.

const mocks = vi.hoisted(() => ({
  received: [] as unknown[],
  recorded: null as { id: string; claimToken: string | null } | null,
}));

vi.mock("@/lib/legacy-api/estimate", () => ({
  default: (
    req: { body: unknown },
    res: {
      setHeader(name: string, value: string): unknown;
      status(code: number): { json(body: unknown): unknown };
    },
  ) => {
    mocks.received.push(req.body);
    // As the V1 handler: CORS open to any origin (L1-01).
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ ref: "EST-2026-12345", analyse: "Analyse rédigée." });
  },
}));
vi.mock("@/leenkey/estimator/record", () => ({
  recordEstimation: async (payload: unknown) => {
    mocks.received.push(payload);
    return mocks.recorded;
  },
}));

const { POST } = await import("@/app/api/estimate/route");

const request = () =>
  new Request("http://localhost/api/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bien: { type: "maison" }, estimation: { prix_estime: 300000 } }),
  });

beforeEach(() => {
  mocks.received.length = 0;
  mocks.recorded = null;
});

describe("/api/estimate", () => {
  it("answers as the V1, with the analysis kept and the token of a visitor", async () => {
    mocks.recorded = { id: "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27", claimToken: "f".repeat(48) };
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.json()).toEqual({
      ref: "EST-2026-12345",
      analyse: "Analyse rédigée.",
      estimationId: "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27",
      claimToken: "f".repeat(48),
    });
    // The V1 handler and the record read the same body.
    expect(mocks.received).toHaveLength(2);
    expect(mocks.received[0]).toEqual(mocks.received[1]);
  });

  it("answers as the V1 alone when the analysis cannot be kept", async () => {
    const response = await POST(request());
    expect(await response.json()).toEqual({ ref: "EST-2026-12345", analyse: "Analyse rédigée." });
  });
});
