import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// L1-30b: « Résumé du jour » of the dashboard. The facts given to the model
// (figures only, none invented), the text kept from its answer (five lines),
// the cache of an hour and « Régénérer » five minutes at least after the
// last brief; the action refused to an account without the admin role.

const profile = {
  id: "5eed0000-0000-4000-8000-0000000000ad",
  firstName: "Cédric" as string | null,
  roles: ["admin"] as string[],
};
const getProfile = vi.fn(async () => profile);
vi.mock("@/core/auth/session", () => ({ getProfile: () => getProfile() }));

const latestDailyBrief = vi.fn();
const adminCounts = vi.fn();
const adminActivity = vi.fn();
const adminBriefCounts = vi.fn();
vi.mock("@/leenkey/admin/dashboard/queries", () => ({
  latestDailyBrief: () => latestDailyBrief(),
  adminCounts: () => adminCounts(),
  adminActivity: (days: number) => adminActivity(days),
  adminBriefCounts: (since: Date) => adminBriefCounts(since),
}));
const adminInterventionsOpen = vi.fn();
vi.mock("@/leenkey/admin/interventions/queries", () => ({
  adminInterventionsOpen: () => adminInterventionsOpen(),
}));
const adminOfferCounts = vi.fn();
vi.mock("@/leenkey/admin/offers/queries", () => ({
  adminOfferCounts: () => adminOfferCounts(),
}));

const insert = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      insert: (row: unknown) => {
        insert(table, row);
        return {
          select: () => ({
            single: async () => ({ data: { created_at: "2026-11-24T08:00:00Z" }, error: null }),
          }),
        };
      },
    }),
  }),
}));
const consumeQuota = vi.fn();
vi.mock("@/leenkey/ai/assistant", () => ({ consumeQuota: () => consumeQuota() }));
const logRequest = vi.fn();
vi.mock("@/core/ai/log", () => ({
  openConversation: async () => "c0nv0000-0000-4000-8000-000000000001",
  logRequest: (_supabase: unknown, _id: string, text: string) => logRequest(text),
  logAnswer: async () => "ok",
}));
const createModelMessage = vi.fn();
vi.mock("@/core/ai/client", () => ({
  isAiConfigured: () => true,
  isAiMock: () => true,
  createModelMessage: () => createModelMessage(),
  describeError: () => "error",
}));

const { briefDecision, briefPrompt, briefText, isQuietDay, DAILY_BRIEF_MAX } =
  await import("@/leenkey/admin/dashboard/daily-brief-facts");
const { dailyBrief } = await import("@/leenkey/admin/dashboard/daily-brief");
const { dailyBriefAction } = await import("@/leenkey/admin/dashboard/actions");
const { MOCK_DAILY_BRIEF } = await import("@/leenkey/ai/mock");

const quiet = {
  listingsPending: 0,
  listingsOldestSubmittedAt: null,
  casesOpen: 0,
  reportsOpen: 0,
  advisorUnread: 0,
  interventionsOpen: 0,
  financingToCheck: 0,
  identityToCheck: 0,
  identityFilesToDelete: 0,
  offersWaiting: 0,
  offersSent: 0,
  signupsSellers: 0,
  signupsBuyers: 0,
  plansSold: 0,
  plansAmountCents: 0,
};
const now = new Date("2026-11-24T09:00:00Z");
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

describe("briefDecision", () => {
  it("writes a brief when there is none", () => {
    expect(briefDecision(null, now, false)).toBe("generate");
    expect(briefDecision(null, now, true)).toBe("generate");
  });

  it("keeps a brief an hour, then writes a new one", () => {
    expect(briefDecision({ createdAt: minutesAgo(59) }, now, false)).toBe("cached");
    expect(briefDecision({ createdAt: minutesAgo(60) }, now, false)).toBe("generate");
  });

  it("« Régénérer » writes a new one, 5 minutes at least after the last", () => {
    expect(briefDecision({ createdAt: minutesAgo(4) }, now, true)).toBe("too_soon");
    expect(briefDecision({ createdAt: minutesAgo(5) }, now, true)).toBe("generate");
    expect(briefDecision({ createdAt: minutesAgo(30) }, now, true)).toBe("generate");
  });
});

describe("briefPrompt", () => {
  it("the figures of the dashboard, the oldest listing against the 24 h target", () => {
    const prompt = briefPrompt(
      {
        ...quiet,
        listingsPending: 3,
        listingsOldestSubmittedAt: minutesAgo(30 * 60),
        casesOpen: 2,
        financingToCheck: 1,
        identityToCheck: 4,
        offersWaiting: 5,
        offersSent: 2,
        signupsSellers: 6,
        signupsBuyers: 7,
        plansSold: 1,
        plansAmountCents: 990_00,
      },
      now,
    );
    expect(prompt).toContain("Annonces à valider : 3 (la plus ancienne attend depuis 30");
    expect(prompt).toContain("au-delà de l'objectif de 24 h");
    expect(prompt).toContain("Dossiers ouverts : 2");
    expect(prompt).toContain("Justificatifs de financement à contrôler : 1");
    expect(prompt).toContain("Pièces d'identité à contrôler : 4");
    expect(prompt).toContain("Offres en attente de la réponse du vendeur : 5");
    expect(prompt).toContain("Inscriptions : 6 vendeur(s), 7 acquéreur(s)");
    expect(prompt).toMatch(/Formules vendues : 1 \(990\s€ TTC\)/);
    expect(prompt).toContain("Offres envoyées : 2");
    expect(prompt).not.toContain("Rien n'attend l'équipe");
    expect(prompt).not.toMatch(/validé/);
    expect(prompt.endsWith("Rédige le résumé du jour à partir de ces chiffres seulement.")).toBe(
      true,
    );
  });

  it("within the target when the oldest listing waits less than 24 h", () => {
    const prompt = briefPrompt(
      { ...quiet, listingsPending: 1, listingsOldestSubmittedAt: minutesAgo(120) },
      now,
    );
    expect(prompt).toContain("dans l'objectif de 24 h");
  });

  it("says so when nothing waits and nothing happened", () => {
    expect(isQuietDay(quiet)).toBe(true);
    expect(isQuietDay({ ...quiet, signupsBuyers: 1 })).toBe(false);
    const prompt = briefPrompt(quiet, now);
    expect(prompt).toContain("Annonces à valider : 0");
    expect(prompt).toContain("Formules vendues : 0\n");
    expect(prompt).toContain(
      "Rien n'attend l'équipe et il n'y a eu aucune activité ces dernières 24 heures.",
    );
  });
});

describe("briefText", () => {
  it("plain lines, five at most", () => {
    const text = briefText(
      "**Résumé**\n- Une annonce attend.\n\n• Deux dossiers.\n1. Un signalement.\nLigne 4.\nLigne 5.\nLigne 6.",
    );
    expect(text).toBe("Résumé\nUne annonce attend.\nDeux dossiers.\nUn signalement.\nLigne 4.");
  });

  it("cut at the end of a line within the limit, nothing when empty", () => {
    const long = `${"Une phrase assez longue pour remplir la ligne. ".repeat(10).trim()}`;
    const text = briefText(`${long}\n${long}\n${long}`);
    expect(Array.from(text).length).toBeLessThanOrEqual(DAILY_BRIEF_MAX);
    expect(text.split("\n")).toHaveLength(1);
    expect(briefText("  \n - \n")).toBe("");
    const single = briefText("Mot ".repeat(400));
    expect(Array.from(single).length).toBeLessThanOrEqual(DAILY_BRIEF_MAX);
  });
});

describe("dailyBrief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminCounts.mockResolvedValue({
      ok: true,
      data: {
        listingsPending: 2,
        listingsOldestSubmittedAt: minutesAgo(90),
        casesOpen: 1,
        reportsOpen: 0,
        advisorUnread: 0,
      },
    });
    adminActivity.mockResolvedValue({
      ok: true,
      data: {
        days: 1,
        plansSold: 0,
        plansAmountCents: 0,
        signups: 1,
        signupsSellers: 1,
        signupsBuyers: 0,
      },
    });
    adminBriefCounts.mockResolvedValue({
      ok: true,
      data: { financingToCheck: 0, identityToCheck: 1, identityFilesToDelete: 0, offersSent: 0 },
    });
    adminInterventionsOpen.mockResolvedValue(0);
    adminOfferCounts.mockResolvedValue({
      ok: true,
      data: { total: 0, waiting: 0, accepted: 0, declined: 0, ended: 0 },
    });
    consumeQuota.mockResolvedValue({ ok: true });
    logRequest.mockResolvedValue("ok");
  });

  it("the brief of the last hour, without calling the model", async () => {
    const createdAt = new Date(Date.now() - 10 * 60_000).toISOString();
    latestDailyBrief.mockResolvedValue({ ok: true, data: { text: "Résumé gardé.", createdAt } });
    await expect(dailyBrief(profile, false)).resolves.toEqual({
      ok: true,
      data: { text: "Résumé gardé.", createdAt },
    });
    expect(consumeQuota).not.toHaveBeenCalled();
    expect(adminCounts).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("« Régénérer » too soon: the last brief, said too soon", async () => {
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    latestDailyBrief.mockResolvedValue({ ok: true, data: { text: "Résumé gardé.", createdAt } });
    await expect(dailyBrief(profile, true)).resolves.toEqual({
      ok: true,
      data: { text: "Résumé gardé.", createdAt, tooSoon: true },
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("a new brief from the facts (model of the tests), kept an hour", async () => {
    const createdAt = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    latestDailyBrief.mockResolvedValue({ ok: true, data: { text: "Ancien.", createdAt } });
    const result = await dailyBrief(profile, false);
    expect(result).toEqual({
      ok: true,
      data: { text: MOCK_DAILY_BRIEF, createdAt: "2026-11-24T08:00:00Z" },
    });
    expect(adminActivity).toHaveBeenCalledWith(1);
    expect(logRequest.mock.calls[0]?.[0]).toContain("Annonces à valider : 2");
    expect(logRequest.mock.calls[0]?.[0]).toContain("Pièces d'identité à contrôler : 1");
    expect(insert).toHaveBeenCalledWith("admin_daily_briefs", {
      body: MOCK_DAILY_BRIEF,
      conversation_id: "c0nv0000-0000-4000-8000-000000000001",
    });
    expect(createModelMessage).not.toHaveBeenCalled();
  });

  it("no brief from facts read in part: nothing called, nothing kept", async () => {
    latestDailyBrief.mockResolvedValue({ ok: true, data: null });
    adminOfferCounts.mockResolvedValue({ ok: false, error: "unavailable" });
    await expect(dailyBrief(profile, false)).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(consumeQuota).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("the quota reached: said, nothing kept", async () => {
    latestDailyBrief.mockResolvedValue({ ok: true, data: null });
    consumeQuota.mockResolvedValue({ ok: false, error: "quota", limit: 0 });
    await expect(dailyBrief(profile, false)).resolves.toEqual({ ok: false, error: "quota" });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("dailyBriefAction", () => {
  it("refused to an account without the admin role, before anything is read", async () => {
    vi.clearAllMocks();
    getProfile.mockResolvedValueOnce({ ...profile, roles: ["seller", "buyer"] });
    await expect(dailyBriefAction({ regenerate: false })).resolves.toEqual({
      ok: false,
      error: "auth",
    });
    expect(latestDailyBrief).not.toHaveBeenCalled();
  });

  it("an input not understood is refused", async () => {
    await expect(dailyBriefAction({ regenerate: "oui" })).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
    await expect(dailyBriefAction({ regenerate: true, more: 1 })).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
  });
});
