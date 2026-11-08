import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { VISITOR_SETTINGS } from "@/core/ai/models";
import { AI_VISITOR_LIMITS } from "@/core/ai/quotas";
import { VISITOR_MESSAGE_MAX, visitorChatSchema } from "@/lib/validations/assistant";

// The assistant of the public site (DECISIONS.md 2026-11-07). The SQL (the
// limits of the day, one answer per question, nothing open but its
// functions) is tested in supabase/tests/rls_ai_visitor.sql, the screens in
// tests/e2e/visitor-assistant.spec.ts.

vi.mock("server-only", () => ({}));

const migration = readFileSync("supabase/migrations/20261107100000_ai_visitor.sql", "utf8");
/** The last migration that writes ai_visitor_ask: the limits in force. */
const askMigration = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(`supabase/migrations/${file}`, "utf8"))
  .filter((sql) => /function public\.ai_visitor_ask\(/.test(sql))
  .at(-1);

describe("limits of the assistant of the site", () => {
  it("are the same in the code and in SQL", () => {
    expect(askMigration).toContain(`public.ai_visitor_questions() >= ${AI_VISITOR_LIMITS.site}`);
    expect(askMigration).toContain(
      `public.ai_visitor_questions(p_visitor, null) >= ${AI_VISITOR_LIMITS.perVisitor}`,
    );
    expect(askMigration).toContain(
      `public.ai_visitor_questions(null, p_ip) >= ${AI_VISITOR_LIMITS.perAddress}`,
    );
    expect(askMigration).toContain(`char_length(v_text) > ${VISITOR_MESSAGE_MAX}`);
    // 100 for the site at launch (DECISIONS.md 2026-11-08).
    expect(AI_VISITOR_LIMITS.site).toBe(100);
    // An answer within the cap of the route, never more.
    expect(migration).toContain(`p_output_tokens > ${VISITOR_SETTINGS.maxTokens}`);
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

  it("the keys of the server, derived from the secret of the jobs, as the SQL derives its own", async () => {
    const { visitorSecrets } = await import("@/leenkey/ai/visitor");
    expect(visitorSecrets("")).toBeNull();
    expect(visitorSecrets(undefined)).toBeNull();
    const secrets = visitorSecrets("a-secret");
    // ai_visitor_server: hmac('leenkey:ai-visitor:server', cron_secret, 'sha256').
    expect(secrets?.serverKey).toBe(
      createHmac("sha256", "a-secret").update("leenkey:ai-visitor:server").digest("hex"),
    );
    expect(migration).toContain(
      "extensions.hmac('leenkey:ai-visitor:server', s.decrypted_secret, 'sha256')",
    );
    expect(secrets?.hashKey).not.toBe(secrets?.serverKey);
    expect(visitorSecrets("another")?.serverKey).not.toBe(secrets?.serverKey);
  });

  it("keyed hashes of the cookie and of the address with the day, never the address", async () => {
    const { visitorKeys } = await import("@/leenkey/ai/visitor");
    const key = "k".repeat(64);
    const cookie = "a".repeat(64);
    const morning = visitorKeys(key, cookie, "203.0.113.7", new Date("2026-11-07T08:00:00Z"));
    const evening = visitorKeys(key, cookie, "203.0.113.7", new Date("2026-11-07T21:00:00Z"));
    const tomorrow = visitorKeys(key, cookie, "203.0.113.7", new Date("2026-11-08T08:00:00Z"));
    expect(morning.visitorKey).toMatch(/^[0-9a-f]{64}$/);
    expect(morning.ipKey).toMatch(/^[0-9a-f]{64}$/);
    expect(morning.ipKey).not.toContain("203");
    expect(evening).toEqual(morning);
    // The day in Europe/Paris: 23:30 UTC on the 7th is already the 8th.
    expect(visitorKeys(key, cookie, "203.0.113.7", new Date("2026-11-07T23:30:00Z")).ipKey).toBe(
      tomorrow.ipKey,
    );
    expect(tomorrow.ipKey).not.toBe(morning.ipKey);
    expect(tomorrow.visitorKey).toBe(morning.visitorKey);
    // Without the key, no way back to the address: another key, other hashes.
    const other = visitorKeys(
      "o".repeat(64),
      cookie,
      "203.0.113.7",
      new Date("2026-11-07T08:00:00Z"),
    );
    expect(other.ipKey).not.toBe(morning.ipKey);
    expect(other.visitorKey).not.toBe(morning.visitorKey);
    // Without an address (local, tests), the visitor stands for it.
    expect(visitorKeys(key, cookie, null).ipKey).not.toBe(
      visitorKeys(key, "b".repeat(64), null).ipKey,
    );
  });

  it("an IPv6 address counts by its /64, an IPv4 one by itself", async () => {
    const { addressScope, visitorKeys } = await import("@/leenkey/ai/visitor");
    expect(addressScope("203.0.113.7")).toBe("203.0.113.7");
    expect(addressScope("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(addressScope("2001:db8:0:1:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:0:1::/64");
    expect(addressScope("2001:0db8:0000:0001::1")).toBe("2001:db8:0:1::/64");
    expect(addressScope("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(addressScope("not an address")).toBe("not an address");
    // No network in the first 64 bits: the address itself, not a range shared by all.
    expect(addressScope("::1")).toBe("0:0:0:0:0:0:0:1");
    expect(addressScope("::ffff:102:304")).toBe("0:0:0:0:0:ffff:102:304");
    expect(addressScope("::ffff:102:304")).not.toBe(addressScope("::ffff:102:305"));
    const day = new Date("2026-11-07T08:00:00Z");
    const key = "k".repeat(64);
    expect(visitorKeys(key, "a".repeat(64), "2001:db8:0:1::1", day).ipKey).toBe(
      visitorKeys(key, "b".repeat(64), "2001:db8:0:1:ffff:ffff:ffff:ffff", day).ipKey,
    );
  });

  it("the address given by the platform", async () => {
    const { clientAddress } = await import("@/leenkey/ai/visitor");
    expect(clientAddress(new Headers({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientAddress(new Headers({ "x-vercel-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe(
      "198.51.100.2",
    );
    // Set by Next.js itself in local: not the address of a visitor.
    expect(clientAddress(new Headers({ "x-forwarded-for": "::1" }))).toBeNull();
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

  it("says how a paid plan is ordered today: online, or by writing to us", async () => {
    const { orderingSection, visitorSystemPrompt } = await import("@/leenkey/ai/visitor");
    expect(orderingSection(true)).toContain("Choisir ma formule");
    expect(orderingSection(true)).toContain("Stripe");
    const closed = orderingSection(false);
    expect(closed).toContain("ne se commandent pas encore en ligne");
    expect(closed).toContain("page « Contact »");
    expect(closed).not.toContain("Stripe");
    expect(visitorSystemPrompt([], [], false)).toContain(closed);
  });

  it("keeps the rules of Leenkey: « nous », no value, no legal advice, no pressure", () => {
    const prompt = readFileSync("core/ai/prompts/visitor.md", "utf8");
    expect(prompt).toContain("jamais « on »");
    expect(prompt).toContain("Ne jamais donner une valeur ou un prix pour un bien");
    expect(prompt).toContain("Pas d'avis juridique");
    expect(prompt).toContain("Ne jamais pousser une formule payante");
    expect(prompt).toContain("12 mois, renouvelables à l'échéance, jamais automatiquement");
    expect(prompt).toContain("120 mots au plus");
    // The rules of every prompt of Leenkey (SPEC-V2 section 12, CLAUDE.md section 8).
    expect(prompt).toContain("Ne jamais présenter l'analyse de valeur comme une garantie");
    expect(prompt).toContain("Ne jamais dire à quelqu'un s'il doit accepter ou refuser une offre");
    expect(prompt).toContain("Retrait d'une offre");
    expect(prompt).toContain("Ne jamais inventer une information qui manque");
    // Ordering: never in this file, it depends on the environment (orderingSection).
    expect(prompt).not.toContain("Stripe");
    // Its own words follow the rules it gives (voice « nous »).
    expect(prompt.replace(/« on »/g, "")).not.toMatch(/\bon\b/);
  });
});
