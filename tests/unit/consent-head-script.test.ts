import { afterEach, describe, expect, it, vi } from "vitest";
import { consentHeadScript } from "@/lib/consent";

// P-06: the script of the <head> marks <html> as the cookie banner sent by
// the server must hide, by the same rule as parseConsent.

function attributesAfter(cookie: string, fonts?: { ready: Promise<unknown> }) {
  const attributes: Record<string, string> = {};
  const document = {
    cookie,
    fonts,
    documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) },
  };
  new Function("document", consentHeadScript())(document);
  return attributes;
}

const run = (cookie: string) => attributesAfter(cookie)["data-consent"] ?? null;

describe("consentHeadScript", () => {
  afterEach(() => vi.useRealTimers());

  it("a choice of less than six months hides the banner; none, an old or a malformed one shows it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T10:00:00Z"));
    expect(run("a=1; lk_consent=v1.0.2026-11-01; b=2")).toBe("set");
    expect(run("lk_consent=v1.1.2026-06-01")).toBe("set");
    expect(run("lk_consent=v1.1.2025-11-01")).toBeNull();
    expect(run("lk_consent=v2.1.2026-11-01")).toBeNull();
    expect(run("xlk_consent=v1.1.2026-11-01")).toBeNull();
    expect(run("")).toBeNull();
  });

  it("the banner waits for the font, 2.5 s at most; without the API, nothing waits", async () => {
    vi.useFakeTimers();
    let loaded: (value?: unknown) => void = () => {};
    const attributes = attributesAfter("", { ready: new Promise((resolve) => (loaded = resolve)) });
    expect(attributes["data-fonts"]).toBe("pending");
    loaded();
    await vi.runAllTimersAsync();
    expect(attributes["data-fonts"]).toBe("ready");

    const slow = attributesAfter("", { ready: new Promise(() => {}) });
    vi.advanceTimersByTime(2_500);
    expect(slow["data-fonts"]).toBe("ready");

    expect(attributesAfter("")["data-fonts"]).toBeUndefined();
  });
});
