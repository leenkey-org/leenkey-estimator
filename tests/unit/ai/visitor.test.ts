import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { AI_VISITOR_LIMITS } from "@/core/ai/quotas";
import { VISITOR_MESSAGE_MAX, visitorChatSchema } from "@/lib/validations/assistant";

// The assistant of the public site (DECISIONS.md 2026-11-07). The SQL (the
// limits of the day, one answer per question, nothing open but its
// functions) is tested in supabase/tests/rls_ai_visitor.sql, the screens in
// tests/e2e/visitor-assistant.spec.ts.

vi.mock("server-only", () => ({}));

const migration = readFileSync("supabase/migrations/20261107100000_ai_visitor.sql", "utf8");

describe("limits of the assistant of the site", () => {
  it("are the same in the code and in SQL", () => {
    expect(migration).toContain(`public.ai_visitor_questions() >= ${AI_VISITOR_LIMITS.site}`);
    expect(migration).toContain(
      `public.ai_visitor_questions(p_visitor, null) >= ${AI_VISITOR_LIMITS.perVisitor}`,
    );
    expect(migration).toContain(
      `public.ai_visitor_questions(null, p_ip) >= ${AI_VISITOR_LIMITS.perAddress}`,
    );
    expect(migration).toContain(`char_length(v_text) > ${VISITOR_MESSAGE_MAX}`);
  });

  it("take a question of 1 to 500 characters, nothing else", () => {
    expect(visitorChatSchema.safeParse({ message: " Bonjour " }).data).toEqual({
      message: "Bonjour",
    });
    expect(visitorChatSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(visitorChatSchema.safeParse({ message: "a".repeat(501) }).success).toBe(false);
    expect(visitorChatSchema.safeParse({ message: "Bonjour", context: "admin" }).success).toBe(
      false,
    );
    expect(
      visitorChatSchema.safeParse({ message: "Bonjour", conversationId: "not-an-id" }).success,
    ).toBe(false);
  });
});

describe("a visitor as the database knows it", () => {
  it("a random cookie of 64 hex characters, kept when valid", async () => {
    const { visitorCookie } = await import("@/leenkey/ai/visitor");
    const fresh = visitorCookie(undefined);
    expect(fresh.isNew).toBe(true);
    expect(fresh.value).toMatch(/^[0-9a-f]{64}$/);
    expect(visitorCookie(fresh.value)).toEqual({ value: fresh.value, isNew: false });
    expect(visitorCookie("forged").isNew).toBe(true);
  });

  it("hashes of the cookie and of the address with the day, never the address", async () => {
    const { visitorKeys } = await import("@/leenkey/ai/visitor");
    const cookie = "a".repeat(64);
    const morning = visitorKeys(cookie, "203.0.113.7", new Date("2026-11-07T08:00:00Z"));
    const evening = visitorKeys(cookie, "203.0.113.7", new Date("2026-11-07T21:00:00Z"));
    const tomorrow = visitorKeys(cookie, "203.0.113.7", new Date("2026-11-08T08:00:00Z"));
    expect(morning.visitorKey).toMatch(/^[0-9a-f]{64}$/);
    expect(morning.ipKey).toMatch(/^[0-9a-f]{64}$/);
    expect(morning.ipKey).not.toContain("203");
    expect(evening).toEqual(morning);
    // The day in Europe/Paris: 23:30 UTC on the 7th is already the 8th.
    expect(visitorKeys(cookie, "203.0.113.7", new Date("2026-11-07T23:30:00Z")).ipKey).toBe(
      tomorrow.ipKey,
    );
    expect(tomorrow.ipKey).not.toBe(morning.ipKey);
    expect(tomorrow.visitorKey).toBe(morning.visitorKey);
    // Without an address (local, tests), the visitor stands for it.
    expect(visitorKeys(cookie, null).ipKey).not.toBe(visitorKeys("b".repeat(64), null).ipKey);
  });

  it("the address given by the platform", async () => {
    const { clientAddress } = await import("@/leenkey/ai/visitor");
    expect(clientAddress(new Headers({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientAddress(new Headers({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe(
      "198.51.100.2",
    );
    expect(clientAddress(new Headers())).toBeNull();
  });
});

describe("the prompt of the assistant of the site", () => {
  it("gives the plans of the table, their prices and their lists", async () => {
    const { plansSection } = await import("@/leenkey/ai/visitor");
    const text = plansSection([
      {
        name: "Autonomie",
        priceCents: 0,
        tagline: "Tous les outils pour gérer votre vente vous-même.",
        intro: null,
        outro: "Gratuit, sans carte bancaire.",
        features: ["Rapport de valeur de votre bien"],
      },
      {
        name: "Accompagné",
        priceCents: 99000,
        tagline: null,
        intro: "Tout Autonomie, plus :",
        outro: null,
        features: ["Un conseiller Leenkey dédié"],
      },
    ]);
    expect(text).toContain('<formule nom="Autonomie" prix="gratuit">');
    expect(text).toMatch(/<formule nom="Accompagné" prix="990\s€ TTC">/);
    expect(text).toContain("- Un conseiller Leenkey dédié");
    expect(text).toContain("Gratuit, sans carte bancaire.");
  });

  it("keeps the rules of Leenkey: « nous », no value, no legal advice, no pressure", () => {
    const prompt = readFileSync("core/ai/prompts/visitor.md", "utf8");
    expect(prompt).toContain("jamais « on »");
    expect(prompt).toContain("Ne jamais donner une valeur ou un prix pour un bien");
    expect(prompt).toContain("Pas d'avis juridique");
    expect(prompt).toContain("Ne jamais pousser une formule payante");
    expect(prompt).toContain("12 mois, renouvelables à l'échéance, jamais automatiquement");
    expect(prompt).toContain("120 mots au plus");
    // Its own words follow the rules it gives (voice « nous »).
    expect(prompt.replace(/« on »/g, "")).not.toMatch(/\bon\b/);
  });
});
