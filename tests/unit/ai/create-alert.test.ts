import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_SEARCH_REQUEST } from "../../fixtures/search-requests";

// L3-06: create_alert (SPEC-V2 sections 12 and 16). What the buyer reads
// before confirming (the name, the criteria as the search shows them), what
// is refused before anything is shown, what is written once confirmed, and
// that nothing is ever written without the confirmation.

const mocks = vi.hoisted(() => ({
  count: 0,
  countError: null as { code: string } | null,
  insertError: null as { code: string } | null,
  logError: null as { code: string } | null,
  writes: [] as { name: string; args: unknown }[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: async () => ({ count: mocks.count, error: mocks.countError }),
      }),
      insert: (row: unknown) => {
        mocks.writes.push({ name: `insert:${table}`, args: row });
        if (table === "ai_messages") return Promise.resolve({ error: mocks.logError });
        return {
          select: () => ({
            single: async () =>
              mocks.insertError
                ? { data: null, error: mocks.insertError }
                : { data: { id: "alert-1", name: (row as { name: string }).name }, error: null },
          }),
        };
      },
      delete: () => ({
        eq: async (_column: string, id: string) => {
          mocks.writes.push({ name: `delete:${table}`, args: id });
          return { error: null };
        },
      }),
    }),
  }),
}));

const {
  createAlertTool: tool,
  ALERT_LIMIT,
  ALERT_NO_CRITERION,
} = await import("@/leenkey/ai/tools/create-alert");
const { actionPreview } = await import("@/leenkey/ai/previews");
const { actionHref, isFailure } = await import("@/leenkey/ai/queries");
const { searchRequestSchema } = await import("@/leenkey/ai/search-request");

const BUYER = "00000000-0000-4000-a000-00000000000c";
const ctx = { profileId: BUYER, roles: ["buyer"], context: "buyer" as const, stepCode: null };
const call = { conversationId: "conv-1", toolUseId: "toolu_1", name: "create_alert" };
const { sort: _sort, ...empty } = EMPTY_SEARCH_REQUEST;
void _sort;
const input = {
  ...empty,
  name: "Maison à Savigny",
  location: "Savigny-sur-Orge",
  radiusKm: 5,
  propertyType: "maison" as const,
  budgetMaxEuros: 400_000,
};

beforeEach(() => {
  mocks.count = 0;
  mocks.countError = null;
  mocks.insertError = null;
  mocks.logError = null;
  mocks.writes = [];
});

describe("create_alert", () => {
  it("is a tool of the buyer, confirmed first, in the words of search_listings and a name", () => {
    expect(tool.contexts).toEqual(["buyer"]);
    expect(tool.requiresConfirmation).toBe(true);
    expect(Object.keys(tool.inputSchema?.properties ?? {}).sort()).toEqual(
      [
        "name",
        ...Object.keys(searchRequestSchema.properties).filter((key) => key !== "sort"),
      ].sort(),
    );
    expect(tool.input.safeParse(input).success).toBe(true);
    expect(tool.input.safeParse({ ...input, name: " " }).success).toBe(false);
    expect(tool.input.safeParse({ ...input, name: "x".repeat(81) }).success).toBe(false);
  });

  it("shows the name and the criteria as the search shows them, and writes nothing", async () => {
    const preview = await tool.preview?.(input, ctx);
    expect(preview).toEqual({
      ok: true,
      data: {
        kind: "alert_creation",
        name: "Maison à Savigny",
        criteria: ["Savigny-sur-Orge", "5\u00A0km", "Maisons", "≤ 400\u202Fk€"],
      },
    });
    expect(actionPreview.safeParse(preview?.ok ? preview.data : null).success).toBe(true);
    expect(mocks.writes).toEqual([]);
  });

  it("refuses an alert without a criterion, the sixth alert, and alerts it cannot read", async () => {
    expect(await tool.preview?.({ ...empty, name: "Tout" }, ctx)).toEqual({
      ok: false,
      error: ALERT_NO_CRITERION,
    });
    // A department is no place the search knows: no criterion left.
    expect(await tool.preview?.({ ...empty, name: "Essonne", location: "91" }, ctx)).toEqual({
      ok: false,
      error: ALERT_NO_CRITERION,
    });
    mocks.count = 5;
    expect(await tool.preview?.(input, ctx)).toEqual({ ok: false, error: ALERT_LIMIT });
    mocks.count = 0;
    mocks.countError = { code: "PGRST000" };
    expect((await tool.preview?.(input, ctx))?.ok).toBe(false);
  });

  it("creates nothing without the confirmation of the buyer", async () => {
    const result = await tool.execute(input, ctx);
    expect(result).toMatchObject({ created: false });
    expect(isFailure(result)).toBe(true);
    expect(mocks.writes).toEqual([]);
  });

  it("once confirmed, keeps the search in its stored form and logs the result", async () => {
    expect(await tool.execute(input, { ...ctx, call })).toEqual({
      created: true,
      alertId: "alert-1",
      name: "Maison à Savigny",
    });
    expect(mocks.writes[0]).toEqual({
      name: "insert:alerts",
      args: {
        buyer_id: BUYER,
        name: "Maison à Savigny",
        criteria: {
          location: "savigny-sur-orge",
          radiusKm: 5,
          type: "maison",
          priceMaxCents: 40_000_000,
        },
      },
    });
    expect(mocks.writes[1]).toMatchObject({
      name: "insert:ai_messages",
      args: {
        conversation_id: "conv-1",
        role: "tool",
        content: { tool_use_id: "toolu_1", name: "create_alert", status: "confirmed" },
      },
    });
    expect(actionHref("create_alert", {})).toBe("/acquereur/alertes");
  });

  it("says the limit when the database refuses the sixth, and any other failure", async () => {
    mocks.insertError = { code: "23514" };
    expect(await tool.execute(input, { ...ctx, call })).toEqual({
      created: false,
      error: ALERT_LIMIT,
    });
    mocks.insertError = { code: "42501" };
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const refused = await tool.execute(input, { ...ctx, call });
    expect(isFailure(refused)).toBe(true);
    expect(mocks.writes.some((write) => write.name === "insert:ai_messages")).toBe(false);
    expect(logged).toHaveBeenCalledOnce();
    logged.mockRestore();
  });

  it("a call answered meanwhile takes its alert back: one alert per confirmation", async () => {
    mocks.logError = { code: "23505" };
    expect(await tool.execute(input, { ...ctx, call })).toEqual({ created: false, answered: true });
    expect(mocks.writes.at(-1)).toEqual({ name: "delete:alerts", args: "alert-1" });
  });
});
