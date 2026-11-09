import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-29: who gets a suggestion, and in which order its steps run. The
// conversation must be a listing conversation of the seller, open; the
// property theirs; the limit of the day counted once the access is checked
// and before any costly read (the messages, the search of the FAQ, the
// model); nothing shown when the log fails or the text breaks a rule. The
// SQL is tested in supabase/tests/rls_ai_suggestions.sql, the screens in
// tests/e2e/assistant-suggestions.spec.ts.

type Step =
  | "conversation"
  | "quota"
  | "messages"
  | "property"
  | "knowledge"
  | "open"
  | "log"
  | "model";

const mocks = vi.hoisted(() => ({
  steps: [] as string[],
  profile: null as { id: string; firstName: string | null; roles: string[] } | null,
  missing: [] as string[],
  conversation: null as Record<string, unknown> | null,
  property: null as Record<string, unknown> | null,
  quota: { ok: true } as { ok: true } | { ok: false; error: "quota"; limit: number },
  rows: [] as { sender_id: string; body: string; kind: string; created_at: string }[],
  answerLogged: "ok" as "ok" | "failed",
  modelText: "Bonjour, je vérifie ce point et je reviens vers vous.",
}));

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth/session", () => ({
  getProfile: async () => mocks.profile,
  missingAcceptances: async () => mocks.missing,
}));
vi.mock("@/leenkey/messaging/queries", () => ({
  getConversation: async () => {
    mocks.steps.push("conversation");
    return { ok: true, data: mocks.conversation };
  },
}));
vi.mock("@/leenkey/ai/seller-data", () => ({
  sellerHasPaidPlan: async () => false,
  sellerPropertyById: async () => {
    mocks.steps.push("property");
    return { ok: true, data: mocks.property };
  },
  PROPERTY_NOT_FOUND: "No property of this seller has this id. Call get_my_properties.",
}));
vi.mock("@/leenkey/ai/assistant", () => ({
  consumeQuota: async () => {
    mocks.steps.push("quota");
    return mocks.quota;
  },
}));
vi.mock("@/core/ai/knowledge", () => ({
  KNOWLEDGE_QUERY_MAX: 500,
  searchKnowledge: async () => {
    mocks.steps.push("knowledge");
    return { ok: true, data: [] };
  },
}));
vi.mock("@/core/ai/log", () => ({
  openConversation: async () => {
    mocks.steps.push("open");
    return "log-1";
  },
  logRequest: async () => {
    mocks.steps.push("log");
    return "ok";
  },
  logAnswer: async () => mocks.answerLogged,
}));
vi.mock("@/core/ai/client", () => ({
  isAiConfigured: () => true,
  isAiMock: () => true,
  createModelMessage: async () => {
    throw new Error("the API is never called in a test");
  },
}));
vi.mock("@/leenkey/ai/mock", () => ({
  mockText: () => async () => {
    mocks.steps.push("model");
    return {
      id: "msg",
      type: "message",
      role: "assistant",
      model: "mock",
      content: [{ type: "text", text: mocks.modelText, citations: null }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    };
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from() {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: async () => {
          mocks.steps.push("messages");
          return { data: [...mocks.rows], error: null };
        },
      };
      return chain;
    },
  }),
}));

const { suggestReply, draftListingDescription } = await import("@/leenkey/ai/suggestions");
const { suggestReplyAction, draftDescriptionAction } = await import("@/leenkey/ai/actions");
const { draftListingDescriptionTool } =
  await import("@/leenkey/ai/tools/draft-listing-description");

const CONVERSATION = "5eed2000-0000-4000-8000-000000000018";
const PROPERTY = "5eed1000-0000-4000-8000-000000000008";
const seller = {
  id: "5eed0000-0000-4000-8000-00000000000b",
  firstName: "Bruno",
  roles: ["seller"],
};
const buyerId = "5eed0000-0000-4000-8000-00000000000d";

const property = {
  id: PROPERTY,
  address: {
    line: "9 impasse des Vergers",
    postalCode: "91700",
    city: "Sainte-Geneviève-des-Bois",
  },
  characteristics: {
    type: "maison",
    surfaceM2: 135,
    carrezM2: null,
    rooms: 6,
    bedrooms: 4,
    floor: null,
    floorsTotal: null,
    buildYear: 2004,
    isNewBuild: false,
    dpe: "C",
    ges: "B",
    heating: "Pompe à chaleur",
    features: ["garden"],
    chargesMonthlyEuros: null,
    propertyTaxYearlyEuros: null,
    coproLots: null,
  },
  orientation: null,
  listingStatus: "published",
  listing: null,
  estimation: null,
  fromEstimation: null,
  coverPath: null,
  createdAt: "2026-10-01T08:00:00Z",
};

const steps = () => mocks.steps as Step[];

beforeEach(() => {
  mocks.steps.length = 0;
  mocks.profile = seller;
  mocks.missing = [];
  mocks.conversation = {
    id: CONVERSATION,
    kind: "listing",
    role: "seller",
    propertyId: PROPERTY,
    listingId: "5eed1000-0000-4000-8000-0000000000f8",
    closed: false,
    counterpartFirstName: "David",
  };
  mocks.property = property;
  mocks.quota = { ok: true };
  mocks.rows = [
    {
      sender_id: buyerId,
      body: "Serait-il possible de la visiter ?",
      kind: "text",
      created_at: "2026-10-31T14:47:00Z",
    },
  ];
  mocks.answerLogged = "ok";
  mocks.modelText = "Bonjour, je vérifie ce point et je reviens vers vous.";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a reply suggested", () => {
  it("for the seller of the conversation: counted first, then read, then written and logged", async () => {
    expect(await suggestReply(seller, CONVERSATION)).toEqual({
      ok: true,
      data: { text: "Bonjour, je vérifie ce point et je reviens vers vous." },
    });
    expect(steps()).toEqual([
      "conversation",
      "quota",
      "messages",
      "property",
      "knowledge",
      "open",
      "log",
      "model",
    ]);
  });

  it("never for the buyer, a conversation of someone else or the adviser's: nothing counted", async () => {
    mocks.conversation = { ...mocks.conversation, role: "buyer" };
    expect(await suggestReply(seller, CONVERSATION)).toEqual({ ok: false, error: "not_found" });
    mocks.conversation = null;
    expect(await suggestReply(seller, CONVERSATION)).toEqual({ ok: false, error: "not_found" });
    // Nor the conversation with the adviser, though it has a listing (L1-34).
    mocks.conversation = {
      id: CONVERSATION,
      kind: "advisor",
      role: "seller",
      propertyId: PROPERTY,
      listingId: "5eed1000-0000-4000-8000-0000000000f8",
      closed: false,
      counterpartFirstName: null,
    };
    expect(await suggestReply(seller, CONVERSATION)).toEqual({ ok: false, error: "not_found" });
    expect(steps()).toEqual(["conversation", "conversation", "conversation"]);
  });

  it("a closed conversation: nothing to answer, nothing counted", async () => {
    mocks.conversation = { ...mocks.conversation, closed: true };
    expect(await suggestReply(seller, CONVERSATION)).toEqual({ ok: false, error: "nothing" });
    expect(steps()).not.toContain("quota");
  });

  it("the limit of the day reached: no read, no log, no call of the model", async () => {
    mocks.quota = { ok: false, error: "quota", limit: 30 };
    expect(await suggestReply(seller, CONVERSATION)).toEqual({ ok: false, error: "quota" });
    expect(steps()).toEqual(["conversation", "quota"]);
  });

  it("the seller wrote last: nothing to answer", async () => {
    mocks.rows = [{ ...mocks.rows[0], sender_id: seller.id }];
    expect(await suggestReply(seller, CONVERSATION)).toEqual({ ok: false, error: "nothing" });
    expect(steps()).not.toContain("model");
  });

  it("the answer not logged: not shown", async () => {
    mocks.answerLogged = "failed";
    expect(await suggestReply(seller, CONVERSATION)).toEqual({ ok: false, error: "unavailable" });
  });

  it("a text with a phone number, an email or « Prix ferme »: never shown", async () => {
    for (const text of [
      "Appelez-moi au 06 12 34 56 78.",
      "Écrivez-moi : bruno@example.com.",
      "Le prix ferme est de 489 000 €.",
    ]) {
      mocks.modelText = text;
      expect(await suggestReply(seller, CONVERSATION)).toEqual({
        ok: false,
        error: "unavailable",
      });
    }
  });
});

describe("a description drafted", () => {
  it("for a property of the seller: checked, counted, written", async () => {
    mocks.modelText = "Maison de 135 m² avec jardin.";
    expect(
      await draftListingDescription({ profile: seller, propertyId: PROPERTY, notes: "" }),
    ).toEqual({
      ok: true,
      data: { text: "Maison de 135 m² avec jardin." },
    });
    expect(steps()).toEqual(["property", "quota", "open", "log", "model"]);
  });

  it("never for a property of someone else: nothing counted", async () => {
    mocks.property = null;
    expect(
      await draftListingDescription({ profile: seller, propertyId: PROPERTY, notes: "" }),
    ).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(steps()).toEqual(["property"]);
  });

  it("within the assistant: each call counted, what the model reads when it cannot", async () => {
    const ctx = {
      profileId: seller.id,
      roles: ["seller"],
      context: "seller" as const,
      stepCode: null,
    };
    mocks.modelText = "Maison de 135 m² avec jardin.";
    expect(
      await draftListingDescriptionTool.execute({ propertyId: PROPERTY, notes: "" }, ctx),
    ).toEqual({
      description: "Maison de 135 m² avec jardin.",
    });
    expect(steps()).toContain("quota");
    mocks.quota = { ok: false, error: "quota", limit: 30 };
    expect(
      await draftListingDescriptionTool.execute({ propertyId: PROPERTY, notes: "" }, ctx),
    ).toEqual({
      error: "The daily limit of the assistant is reached: no description written.",
    });
    mocks.property = null;
    expect(
      await draftListingDescriptionTool.execute({ propertyId: PROPERTY, notes: "" }, ctx),
    ).toEqual({
      error: "No property of this seller has this id. Call get_my_properties.",
    });
  });
});

describe("the actions", () => {
  it("a session, the conditions accepted, the seller role, an input checked", async () => {
    expect(await suggestReplyAction({ conversationId: "x" })).toEqual({
      ok: false,
      error: "invalid",
    });
    mocks.profile = null;
    expect(await suggestReplyAction({ conversationId: CONVERSATION })).toEqual({
      ok: false,
      error: "auth",
    });
    mocks.profile = seller;
    mocks.missing = ["cgu"];
    expect(await draftDescriptionAction({ propertyId: PROPERTY, notes: "" })).toEqual({
      ok: false,
      error: "conditions",
    });
    mocks.missing = [];
    mocks.profile = { id: buyerId, firstName: "David", roles: ["buyer"] };
    expect(await suggestReplyAction({ conversationId: CONVERSATION })).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(steps()).toEqual([]);
  });
});
