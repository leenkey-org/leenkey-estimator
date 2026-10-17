import { describe, expect, it } from "vitest";
import {
  CONSENT_MAX_AGE,
  consentDay,
  cookieValue,
  isAnalyticsCookie,
  parseConsent,
  serializeConsent,
} from "@/lib/consent";
import { FOOTER_LINKS } from "@/leenkey/legal/footer-links";

describe("consent cookie", () => {
  it("round-trips the choice and its day", () => {
    for (const analytics of [true, false]) {
      const consent = { analytics, date: "2026-10-17" };
      expect(parseConsent(serializeConsent(consent))).toEqual(consent);
    }
    expect(serializeConsent({ analytics: true, date: "2026-10-17" })).toBe("v1.1.2026-10-17");
  });

  it("ignores anything else (asked again)", () => {
    for (const value of [
      undefined,
      null,
      "",
      "yes",
      "v1.2.2026-10-17",
      "v2.1.2026-10-17",
      "v1.1",
    ]) {
      expect(parseConsent(value)).toBeNull();
    }
  });

  it("lasts six months", () => {
    expect(CONSENT_MAX_AGE / 86_400).toBeGreaterThanOrEqual(180);
    expect(CONSENT_MAX_AGE / 86_400).toBeLessThanOrEqual(183);
  });

  it("reads one cookie among others", () => {
    const cookies = "sb-x-auth-token=abc; lk_consent=v1.0.2026-10-17; lk_vues=2026-10-17_x";
    expect(cookieValue(cookies, "lk_consent")).toBe("v1.0.2026-10-17");
    expect(cookieValue(cookies, "lk_consentement")).toBeUndefined();
    expect(cookieValue("", "lk_consent")).toBeUndefined();
  });

  it("dates the choice in Paris", () => {
    expect(consentDay(new Date("2026-10-16T22:30:00Z"))).toBe("2026-10-17");
  });

  it("knows the Google Analytics cookies to clear on withdrawal", () => {
    for (const name of ["_ga", "_ga_27N3E3WP2D", "_gid", "_gat"]) {
      expect(isAnalyticsCookie(name)).toBe(true);
    }
    for (const name of ["lk_consent", "sb-x-auth-token", "_gab", "ga"]) {
      expect(isAnalyticsCookie(name)).toBe(false);
    }
  });
});

describe("footer links", () => {
  it("cover every legal text of the legal file and the SPEC", () => {
    expect(FOOTER_LINKS.map((link) => link.href)).toEqual([
      "/mentions-legales",
      "/cgu",
      "/cgv",
      "/confidentialite",
      "/cookies",
      "/signalement",
      "/intelligence-artificielle",
      "mailto:contact.leenkey@gmail.com",
    ]);
  });
});
