import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorized, isExemptPath, safeEqual } from "@/core/auth/basic-auth";
import { middleware } from "@/middleware";

const basic = (user: string, password: string) => `Basic ${btoa(`${user}:${password}`)}`;
const request = (path: string, authorization?: string) =>
  new NextRequest(`https://leenkey-v2.vercel.app${path}`, {
    headers: authorization ? { authorization } : {},
  });

describe("basic auth helpers", () => {
  it("compares strings exactly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });

  it("accepts only the right user and password", () => {
    expect(
      isAuthorized(basic("leenkey", "s3cret:with:colons"), "leenkey", "s3cret:with:colons"),
    ).toBe(true);
    expect(isAuthorized(basic("leenkey", "wrong"), "leenkey", "s3cret")).toBe(false);
    expect(isAuthorized(basic("other", "s3cret"), "leenkey", "s3cret")).toBe(false);
    expect(isAuthorized("Bearer token", "leenkey", "s3cret")).toBe(false);
    expect(isAuthorized("Basic %%%", "leenkey", "s3cret")).toBe(false);
    expect(isAuthorized(null, "leenkey", "s3cret")).toBe(false);
  });

  it("exempts only webhooks and crons", () => {
    expect(isExemptPath("/api/webhooks/stripe")).toBe(true);
    expect(isExemptPath("/api/cron/ping-db")).toBe(true);
    expect(isExemptPath("/api/estimate")).toBe(false);
    expect(isExemptPath("/api/cronjob")).toBe(false);
  });
});

describe("middleware", () => {
  afterEach(() => vi.unstubAllEnvs());

  const staging = () => {
    vi.stubEnv("NEXT_PUBLIC_ENV", "staging");
    vi.stubEnv("PREPROD_USER", "leenkey");
    vi.stubEnv("PREPROD_PASSWORD", "s3cret");
  };

  it("asks for credentials on the preprod", () => {
    staging();
    const res = middleware(request("/estimer"));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Basic");
  });

  it("lets the right credentials through, with noindex", () => {
    staging();
    const res = middleware(request("/estimer", basic("leenkey", "s3cret")));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("never blocks webhooks and crons", () => {
    staging();
    expect(middleware(request("/api/webhooks/stripe")).status).toBe(200);
    expect(middleware(request("/api/cron/ping-db")).status).toBe(200);
  });

  it("stays open on the preprod while the credentials are not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_ENV", "staging");
    vi.stubEnv("PREPROD_USER", "");
    vi.stubEnv("PREPROD_PASSWORD", "");
    expect(middleware(request("/")).status).toBe(200);
  });

  it("is open and indexable in production", () => {
    vi.stubEnv("NEXT_PUBLIC_ENV", "production");
    vi.stubEnv("PREPROD_USER", "leenkey");
    vi.stubEnv("PREPROD_PASSWORD", "s3cret");
    const res = middleware(request("/"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toBeNull();
  });
});
