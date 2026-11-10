import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-31: the handoff to a human. The tool create_case (what the seller reads
// before confirming, what the model reads of a refusal), the request written
// by the person at the daily limit (sendCaseRequest), the subject made of
// its first words, and the rule of CLAUDE.md section 8: the assistant never
// holds the service role. The SQL is tested in
// supabase/tests/rls_create_case.sql, the screens in
// tests/e2e/case-request-live.spec.ts.

const mocks = vi.hoisted(() => ({
  profile: null as { id: string; roles: string[] } | null,
  missing: [] as string[],
  property: null as Record<string, unknown> | null,
  propertyRead: true,
  advisor: false,
  rpc: [] as { name: string; args: Record<string, unknown> }[],
  rpcResult: { data: "case-1", error: null } as {
    data: string | null;
    error: { code: string } | null;
  },
  /** Answers given first, one per call, before rpcResult. */
  rpcQueue: [] as { data: string | null; error: { code: string } | null }[],
  /** The assistant conversation of the request: found, missing (null data) or unreadable. */
  conversation: { ok: true, data: null } as
    | { ok: true; data: { id: string; context: "seller"; entityId: string | null } | null }
    | { ok: false },
  conversations: [] as { id: string; kind: string; propertyId: string }[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/core/auth/session", () => ({
  getProfile: async () => mocks.profile,
  missingAcceptances: async () => mocks.missing,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      mocks.rpc.push({ name, args });
      return mocks.rpcQueue.shift() ?? mocks.rpcResult;
    },
  }),
}));
vi.mock("@/core/ai/log", () => ({
  findConversation: async () => mocks.conversation,
  logResult: async () => "ok",
  readLog: async () => ({ ok: true, data: [] }),
}));
vi.mock("@/leenkey/messaging/queries", () => ({
  listConversations: async () => ({ ok: true, data: mocks.conversations }),
}));
vi.mock("@/leenkey/ai/seller-data", () => ({
  sellerPropertyById: async () =>
    mocks.propertyRead ? { ok: true, data: mocks.property } : { ok: false },
  PROPERTY_NOT_FOUND: "No property of this seller has this id. Call get_my_properties.",
}));
vi.mock("@/leenkey/billing/entitlements", () => ({ hasEntitlement: async () => mocks.advisor }));
vi.mock("@/leenkey/properties/sheet", () => ({ propertyName: () => "Maison · Athis-Mons" }));

const { caseSubject, CASE_SUBJECT_FROM_TEXT_MAX } = await import("@/leenkey/ai/case-request");
const { createCaseTool, TOO_MANY_REQUESTS } = await import("@/leenkey/ai/tools/create-case");
const { sendCaseRequest } = await import("@/leenkey/ai/actions");
const { actionPreview } = await import("@/leenkey/ai/previews");
const { isFailure } = await import("@/leenkey/ai/queries");
const { ASSISTANT_MESSAGE_MAX, CASE_SUBJECT_MAX, CASE_SUMMARY_MAX, caseRequestSchema } =
  await import("@/lib/validations/assistant");

const PROPERTY = "5eed1000-0000-4000-8000-000000000003";
const ctx = {
  profileId: "seller-a",
  roles: ["seller"],
  context: "seller" as const,
  stepCode: null,
};
const call = { conversationId: "conv-1", toolUseId: "toolu_1", name: "create_case" };
const request = {
  propertyId: PROPERTY,
  subject: "Litige avec un acquéreur",
  summary: "Un acquéreur conteste la surface annoncée.",
};

beforeEach(() => {
  mocks.profile = { id: "seller-a", roles: ["seller"] };
  mocks.missing = [];
  mocks.property = { id: PROPERTY };
  mocks.propertyRead = true;
  mocks.advisor = false;
  mocks.rpc = [];
  mocks.rpcResult = { data: "case-1", error: null };
  mocks.rpcQueue = [];
  mocks.conversation = { ok: true, data: null };
  mocks.conversations = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("create_case, the tool", () => {
  it("for the seller only, confirmed first, about a property or none", () => {
    expect(createCaseTool.contexts).toEqual(["seller"]);
    expect(createCaseTool.requiresConfirmation).toBe(true);
    const { input } = createCaseTool;
    expect(input.safeParse(request).success).toBe(true);
    expect(input.safeParse({ ...request, propertyId: "" }).success).toBe(true);
    expect(input.safeParse({ ...request, propertyId: "1" }).success).toBe(false);
    expect(input.safeParse({ ...request, propertyId: null }).success).toBe(false);
    expect(input.safeParse({ ...request, subject: "x".repeat(CASE_SUBJECT_MAX) }).success).toBe(
      true,
    );
    expect(input.safeParse({ ...request, subject: "x".repeat(CASE_SUBJECT_MAX + 1) }).success).toBe(
      false,
    );
    expect(input.safeParse({ ...request, subject: " a " }).success).toBe(false);
    expect(input.safeParse({ ...request, summary: "x".repeat(CASE_SUMMARY_MAX) }).success).toBe(
      true,
    );
    expect(input.safeParse({ ...request, summary: "x".repeat(CASE_SUMMARY_MAX + 1) }).success).toBe(
      false,
    );
    expect(input.safeParse({ ...request, summary: "court" }).success).toBe(false);
    // « No property » is an empty string: nothing a strict schema could refuse.
    expect(createCaseTool.inputSchema?.properties.propertyId).toMatchObject({ type: "string" });
  });

  it("shows the request before it leaves: the property, the subject, the summary", async () => {
    const shown = await createCaseTool.preview?.(request, ctx);
    expect(shown).toEqual({
      ok: true,
      data: {
        kind: "case_request",
        propertyName: "Maison · Athis-Mons",
        subject: request.subject,
        summary: request.summary,
      },
    });
    expect(actionPreview.safeParse(shown?.ok ? shown.data : null).success).toBe(true);
    const general = await createCaseTool.preview?.({ ...request, propertyId: "" }, ctx);
    expect(general).toMatchObject({ ok: true, data: { propertyName: null } });
    expect(actionPreview.safeParse(general?.ok ? general.data : null).success).toBe(true);
  });

  it("refuses the property of someone else, and one whose plan has an adviser", async () => {
    mocks.property = null;
    expect(await createCaseTool.preview?.(request, ctx)).toMatchObject({
      ok: false,
      error: expect.stringContaining("get_my_properties"),
    });
    mocks.property = { id: PROPERTY };
    mocks.advisor = true;
    expect(await createCaseTool.preview?.(request, ctx)).toMatchObject({
      ok: false,
      error: expect.stringContaining("contact_advisor"),
    });
    mocks.propertyRead = false;
    expect(await createCaseTool.preview?.(request, ctx)).toMatchObject({ ok: false });
  });

  it("writes nothing without the confirmation of the seller", async () => {
    expect(await createCaseTool.execute(request, ctx)).toMatchObject({ sent: false });
    expect(mocks.rpc).toEqual([]);
  });

  it("once confirmed, the case and the result of the tool through ai_create_case", async () => {
    expect(await createCaseTool.execute(request, { ...ctx, call })).toEqual({
      sent: true,
      caseId: "case-1",
    });
    expect(mocks.rpc).toEqual([
      {
        name: "ai_create_case",
        args: {
          p_conversation_id: "conv-1",
          p_tool_use_id: "toolu_1",
          p_tool_name: "create_case",
          p_subject: request.subject,
          p_summary: request.summary,
          p_property: PROPERTY,
        },
      },
    ]);
    await createCaseTool.execute({ ...request, propertyId: "" }, { ...ctx, call });
    expect(mocks.rpc[1]?.args.p_property).toBeUndefined();
  });

  it("checked again when confirmed: a plan bought since has an adviser to write to", async () => {
    mocks.advisor = true;
    expect(await createCaseTool.execute(request, { ...ctx, call })).toEqual({
      sent: false,
      error: expect.stringContaining("contact_advisor"),
    });
    expect(mocks.rpc).toEqual([]);
    // About no property, there is no adviser to send the seller to.
    expect(await createCaseTool.execute({ ...request, propertyId: "" }, { ...ctx, call })).toEqual({
      sent: true,
      caseId: "case-1",
    });
  });

  it("a call already answered, the limit of 5 requests, a failure: nothing sent, said", async () => {
    mocks.rpcResult = { data: null, error: { code: "23505" } };
    expect(await createCaseTool.execute(request, { ...ctx, call })).toEqual({
      sent: false,
      answered: true,
    });
    mocks.rpcResult = { data: null, error: { code: "54000" } };
    const limited = await createCaseTool.execute(request, { ...ctx, call });
    expect(limited).toEqual({ sent: false, error: TOO_MANY_REQUESTS });
    expect(isFailure(limited)).toBe(true);
    mocks.rpcResult = { data: null, error: { code: "XX000" } };
    expect(await createCaseTool.execute(request, { ...ctx, call })).toMatchObject({ sent: false });
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

describe("caseSubject", () => {
  it("the first sentence of a request, its first words when it says nothing", () => {
    expect(caseSubject("Un acquéreur conteste la surface. Que dois-je faire ?")).toBe(
      "Un acquéreur conteste la surface.",
    );
    expect(caseSubject("Bonjour. Je ne reçois plus vos emails.")).toBe(
      "Bonjour. Je ne reçois plus vos emails.",
    );
    expect(caseSubject("  Mon   annonce\nn'apparaît plus  ")).toBe("Mon annonce n'apparaît plus");
  });

  it("cut at 80 characters, with « … »", () => {
    const long = caseSubject("mot ".repeat(60));
    expect(long).toHaveLength(CASE_SUBJECT_FROM_TEXT_MAX);
    expect(long.endsWith("…")).toBe(true);
    expect(long).not.toContain(" …");
  });

  it("never cuts an emoji in two (the database would refuse the text)", () => {
    const cut = caseSubject(`${"x".repeat(78)}😀😀 la suite de la demande`);
    // A lone half of an emoji cannot be encoded.
    expect(() => encodeURIComponent(cut)).not.toThrow();
    expect(Array.from(cut)).toHaveLength(CASE_SUBJECT_FROM_TEXT_MAX);
    expect(cut).toBe(`${"x".repeat(78)}😀…`);
  });
});

describe("sendCaseRequest, the request written at the daily limit", () => {
  const message = "Je ne reçois plus les emails de Leenkey depuis hier.";
  const CONVERSATION = "5eed4000-0000-4000-8000-000000000001";
  const OTHER = "5eed1000-0000-4000-8000-000000000005";

  it("before any conversation: a case of the person, about the property of the page", async () => {
    expect(await sendCaseRequest({ propertyId: PROPERTY, message })).toEqual({
      ok: true,
      data: { caseId: "case-1" },
    });
    expect(mocks.rpc).toEqual([
      {
        name: "create_case",
        args: {
          p_subject: message,
          p_summary: message,
          p_source: "manual",
          p_property_id: PROPERTY,
        },
      },
    ]);
    await sendCaseRequest({ propertyId: null, message });
    expect(mocks.rpc[1]?.args.p_property_id).toBeUndefined();
  });

  it("in a conversation: about its property, whatever the page it is opened from", async () => {
    mocks.conversation = {
      ok: true,
      data: { id: CONVERSATION, context: "seller", entityId: OTHER },
    };
    await sendCaseRequest({ conversationId: CONVERSATION, propertyId: PROPERTY, message });
    expect(mocks.rpc[0]?.args.p_property_id).toBe(OTHER);
    // A conversation about no property: none, even from the page of one.
    mocks.conversation = {
      ok: true,
      data: { id: CONVERSATION, context: "seller", entityId: null },
    };
    await sendCaseRequest({ conversationId: CONVERSATION, propertyId: PROPERTY, message });
    expect(mocks.rpc[1]?.args.p_property_id).toBeUndefined();
    // Not theirs, or unknown: nothing is taken from the browser instead.
    mocks.conversation = { ok: true, data: null };
    await sendCaseRequest({ conversationId: CONVERSATION, propertyId: PROPERTY, message });
    expect(mocks.rpc[2]?.args.p_property_id).toBeUndefined();
    mocks.conversation = { ok: false };
    expect(await sendCaseRequest({ conversationId: CONVERSATION, message })).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(mocks.rpc).toHaveLength(3);
  });

  it("a property whose plan has an adviser: sent to them, no case written", async () => {
    mocks.advisor = true;
    mocks.conversations = [
      { id: "conv-listing", kind: "listing", propertyId: PROPERTY },
      { id: "conv-advisor", kind: "advisor", propertyId: PROPERTY },
    ];
    expect(await sendCaseRequest({ propertyId: PROPERTY, message })).toEqual({
      ok: false,
      error: "advisor",
      href: "/messages/conv-advisor",
    });
    mocks.conversations = [];
    expect(await sendCaseRequest({ propertyId: PROPERTY, message })).toEqual({
      ok: false,
      error: "advisor",
      href: "/messages",
    });
    expect(mocks.rpc).toEqual([]);
    // About no property, the request goes to the team.
    expect(await sendCaseRequest({ message })).toMatchObject({ ok: true });
  });

  it("signed in, the conditions accepted, a request of 10 to 2 000 characters", async () => {
    expect(
      caseRequestSchema.safeParse({ message: "x".repeat(ASSISTANT_MESSAGE_MAX) }).success,
    ).toBe(true);
    expect(CASE_SUMMARY_MAX).toBeLessThan(ASSISTANT_MESSAGE_MAX);
    expect(await sendCaseRequest({ message: "court" })).toEqual({ ok: false, error: "invalid" });
    expect(await sendCaseRequest({ message: "x".repeat(ASSISTANT_MESSAGE_MAX + 1) })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await sendCaseRequest({ message, source: "plan_purchase" })).toEqual({
      ok: false,
      error: "invalid",
    });
    mocks.missing = ["cgu"];
    expect(await sendCaseRequest({ message })).toEqual({ ok: false, error: "conditions" });
    mocks.profile = null;
    expect(await sendCaseRequest({ message })).toEqual({ ok: false, error: "auth" });
    expect(mocks.rpc).toEqual([]);
  });

  it("a property removed since: the request still leaves, about no property", async () => {
    mocks.rpcQueue = [{ data: null, error: { code: "42501" } }];
    expect(await sendCaseRequest({ propertyId: PROPERTY, message })).toEqual({
      ok: true,
      data: { caseId: "case-1" },
    });
    expect(mocks.rpc.map((call) => call.args.p_property_id)).toEqual([PROPERTY, undefined]);
  });

  it("says the limit of 5 requests, a text the base refuses, a failure", async () => {
    mocks.rpcResult = { data: null, error: { code: "54000" } };
    expect(await sendCaseRequest({ message })).toEqual({ ok: false, error: "limit" });
    mocks.rpcResult = { data: null, error: { code: "22023" } };
    expect(await sendCaseRequest({ message })).toEqual({ ok: false, error: "invalid" });
    // An account suspended meanwhile: a failure, never « 10 caractères au moins ».
    mocks.rpcResult = { data: null, error: { code: "42501" } };
    expect(await sendCaseRequest({ message })).toEqual({ ok: false, error: "unavailable" });
    expect(console.error).not.toHaveBeenCalled();
    mocks.rpcResult = { data: null, error: { code: "XX000" } };
    expect(await sendCaseRequest({ message })).toEqual({ ok: false, error: "unavailable" });
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

describe("the assistant never holds the service role (CLAUDE.md section 8, SPEC-V2 23 L1-31)", () => {
  function sources(directory: string): string[] {
    return readdirSync(directory).flatMap((name) => {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  it("no file of core/ai nor of leenkey/ai imports the admin client or reads its key", () => {
    const files = [...sources("core/ai"), ...sources("leenkey/ai")];
    expect(files.length).toBeGreaterThan(20);
    const guilty = files.filter((path) =>
      /supabase\/admin|createAdminClient|SERVICE_ROLE/.test(readFileSync(path, "utf8")),
    );
    expect(guilty).toEqual([]);
  });
});
