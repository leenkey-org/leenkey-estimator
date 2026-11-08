import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Limits of requests per address (L1-38): the same numbers in the code and in
// SQL, the keys derived as the base derives its own, an address known by a
// keyed hash, the security headers of every response.

vi.mock("server-only", () => ({}));

// The base, through the public client only: never the client of the session.
const rpc = vi.fn();
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ rpc }) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    throw new Error("the limits never read the session of the visitor");
  },
}));

const migration = readFileSync("supabase/migrations/20261108160000_rate_limits.sql", "utf8");

describe("limits of requests", () => {
  it("are the same in the code and in SQL", async () => {
    const { RATE_LIMITS } = await import("@/lib/rate-limit");
    for (const [bucket, { limit, windowSeconds }] of Object.entries(RATE_LIMITS)) {
      expect(migration).toContain(
        `when '${bucket}' then v_limit := ${limit}; v_seconds := ${windowSeconds};`,
      );
    }
  });

  it("the key of the server, derived from the secret of the jobs as the SQL derives its own", async () => {
    const { rateLimitKeys } = await import("@/lib/rate-limit");
    expect(rateLimitKeys("")).toBeNull();
    const keys = rateLimitKeys("a-secret");
    expect(keys?.serverKey).toBe(
      createHmac("sha256", "a-secret").update("leenkey:rate-limit:server").digest("hex"),
    );
    expect(migration).toContain(
      "extensions.hmac('leenkey:rate-limit:server', s.decrypted_secret, 'sha256')",
    );
    expect(keys?.hashKey).not.toBe(keys?.serverKey);
  });

  it("an address by a keyed hash, per bucket, an IPv6 one by its /64", async () => {
    const { rateKey } = await import("@/lib/rate-limit");
    const key = "k".repeat(64);
    const one = rateKey(key, "signup", "203.0.113.7");
    expect(one).toMatch(/^[0-9a-f]{64}$/);
    expect(one).not.toBe(rateKey(key, "contact", "203.0.113.7"));
    expect(one).not.toBe(rateKey("o".repeat(64), "signup", "203.0.113.7"));
    expect(rateKey(key, "signup", "2001:db8:0:1::1")).toBe(
      rateKey(key, "signup", "2001:db8:0:1:ffff::2"),
    );
  });

  it("lets a request through without an address (local, tests)", async () => {
    const { allowRequest } = await import("@/lib/rate-limit");
    await expect(allowRequest("signin", new Headers())).resolves.toBe(true);
  });

  describe("with an address and the secret", () => {
    const from = new Headers({ "x-real-ip": "203.0.113.7" });
    beforeEach(() => {
      vi.stubEnv("CRON_SECRET", "a-secret");
      rpc.mockReset();
    });
    afterEach(() => vi.unstubAllEnvs());

    it("counts through the public client, a cookie of session never in the way", async () => {
      const { allowRequest, rateKey, rateLimitKeys } = await import("@/lib/rate-limit");
      rpc.mockResolvedValueOnce({ data: true, error: null });
      await expect(allowRequest("contact", from)).resolves.toBe(true);
      const keys = rateLimitKeys("a-secret");
      expect(rpc).toHaveBeenCalledWith("rate_limit_hit", {
        p_server: keys?.serverKey,
        p_bucket: "contact",
        p_key: rateKey(keys?.hashKey ?? "", "contact", "203.0.113.7"),
        p_count: true,
      });
      rpc.mockResolvedValueOnce({ data: false, error: null });
      await expect(allowRequest("contact", from)).resolves.toBe(false);
    });

    it("a sign-in is checked without counting", async () => {
      const { allowRequest } = await import("@/lib/rate-limit");
      rpc.mockResolvedValueOnce({ data: true, error: null });
      await allowRequest("signin", from, { count: false });
      expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_bucket: "signin", p_count: false });
    });

    it("lets the request through when the base does not answer", async () => {
      const { allowRequest } = await import("@/lib/rate-limit");
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST301", message: "x" } });
      await expect(allowRequest("signup", from)).resolves.toBe(true);
      expect(log).toHaveBeenCalledWith("[rate-limit] count failed", {
        bucket: "signup",
        code: "PGRST301",
      });
      log.mockRestore();
    });
  });
});

describe("security headers", () => {
  it("are sent with every response", async () => {
    const { default: config, SECURITY_HEADERS } = await import("@/next.config");
    const rules = await config.headers?.();
    expect(rules).toEqual([{ source: "/:path*", headers: [...SECURITY_HEADERS] }]);
    const byKey = Object.fromEntries(SECURITY_HEADERS.map((header) => [header.key, header.value]));
    expect(byKey["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(byKey["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(byKey["Strict-Transport-Security"]).toMatch(/^max-age=\d+$/);
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });
});
