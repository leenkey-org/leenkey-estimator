import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-31: the handoff to a human. The tool create_case (what the seller reads
// before confirming, what the model reads of a refusal), the request written
// by the person at the daily limit (sendCaseRequest), the subject made of
// its first words, and the rule of CLAUDE.md section 8: the assistant never
// holds the service role. The SQL is tested in
// supabase/tests/rls_create_case.sql, the screens in tests/e2e/assistant*.

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
      return mocks.rpcResult;
    },
  }),
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
const { CASE_SUBJECT_MAX, CASE_SUMMARY_MAX, caseRequestSchema } =
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
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("create_case, the tool", () => {
  it("for the seller only, confirmed first, about a property or none", () => {
    expect(createCaseTool.contexts).toEqual(["seller"]);
    expect(createCaseTool.requiresConfirmation).toBe(true);
    const { input } = createCaseTool;
    expect(input.safeParse(request).success).toBe(true);
    expect(input.safeParse({ ...request, propertyId: null }).success).toBe(true);
    expect(input.safeParse({ ...request, propertyId: "1" }).success).toBe(false);
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
    // The model may say « no property »: null, in a strict schema.
    expect(createCaseTool.inputSchema?.properties.propertyId).toMatchObject({
      type: ["string", "null"],
    });
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
    const general = await createCaseTool.preview?.({ ...request, propertyId: null }, ctx);
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
    await createCaseTool.execute({ ...request, propertyId: null }, { ...ctx, call });
    expect(mocks.rpc[1]?.args.p_property).toBeUndefined();
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
});

describe("sendCaseRequest, the request written at the daily limit", () => {
  const message = "Je ne reçois plus les emails de Leenkey depuis hier.";

  it("a case of the person, written by them, about the property of the conversation", async () => {
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

  it("signed in, the conditions accepted, a request of 10 to 1 500 characters", async () => {
    expect(caseRequestSchema.safeParse({ message: "x".repeat(CASE_SUMMARY_MAX) }).success).toBe(
      true,
    );
    expect(await sendCaseRequest({ message: "court" })).toEqual({ ok: false, error: "invalid" });
    expect(await sendCaseRequest({ message: "x".repeat(CASE_SUMMARY_MAX + 1) })).toEqual({
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

  it("says the limit of 5 requests, a refusal of the base, a failure", async () => {
    mocks.rpcResult = { data: null, error: { code: "54000" } };
    expect(await sendCaseRequest({ message })).toEqual({ ok: false, error: "limit" });
    mocks.rpcResult = { data: null, error: { code: "42501" } };
    expect(await sendCaseRequest({ message })).toEqual({ ok: false, error: "invalid" });
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
