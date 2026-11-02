import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// L1-28: the assistant. The history sent back to the model from the log,
// one turn (tools that read run, a tool that writes waits for the person),
// the request (cached prompt and tools, adaptive thinking), the daily limits,
// the prompts, the events of the stream, the tools of the seller and the
// texts. The route and the actions are checked end to end
// (tests/e2e/assistant*.spec.ts), the SQL in supabase/tests/rls_assistant.sql.

vi.mock("server-only", () => ({}));

const { buildHistory, displayItems, hasThinking } = await import("@/core/ai/conversation");
const { chatRequest, runTurn, toolDefinitions } = await import("@/core/ai/chat");
const { AI_DAILY_LIMITS, dailyLimit } = await import("@/core/ai/quotas");
const { faqSection, promptFile, systemPrompt } = await import("@/core/ai/prompts");
const { readEvents } = await import("@/leenkey/ai/stream-events");
const { gapPercent, actionPreview } = await import("@/leenkey/ai/previews");
const { sellerContextText } = await import("@/leenkey/ai/context");
const { ALL_TOOLS, toolsFor } = await import("@/leenkey/ai/tools");
const { chatRequestSchema } = await import("@/lib/validations/assistant");
const { fr } = await import("@/lib/i18n/fr");

type ChatEvent = Parameters<Parameters<typeof runTurn>[0]["emit"]>[0];
type AnyTool = Parameters<typeof runTurn>[0]["tools"][number];

const user = (text: string, context: string | null = "Dossier.") => ({
  role: "user",
  content: { type: "user", text, context },
});
const answer = (blocks: unknown[], stopReason = "end_turn") => ({
  role: "assistant",
  content: { type: "assistant", blocks, stopReason },
});
const result = (id: string, name: string, status = "done", value: unknown = { ok: 1 }) => ({
  role: "tool",
  content: { type: "tool_result", tool_use_id: id, name, status, result: value },
});
const text = (value: string) => ({ type: "text", text: value, citations: null });
const thinking = { type: "thinking", thinking: "", signature: "sig" };
const call = (id: string, name: string, input: Record<string, unknown> = {}) => ({
  type: "tool_use",
  id,
  name,
  input,
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildHistory", () => {
  it("sends each message with the file after it, then the answer", () => {
    const { messages, pending } = buildHistory([user("Bonjour"), answer([text("Bonjour Alice.")])]);
    expect(messages).toEqual([
      { role: "user", content: "Bonjour" },
      { role: "system", content: "Dossier." },
      { role: "assistant", content: [text("Bonjour Alice.")] },
    ]);
    expect(pending).toEqual([]);
  });

  it("answers every call of an answer in the next message, all together", () => {
    const { messages } = buildHistory([
      user("Mes biens ?"),
      answer([call("a", "get_my_properties"), call("b", "get_listing_stats")], "tool_use"),
      result("b", "get_listing_stats"),
      result("a", "get_my_properties"),
      answer([text("Deux biens.")]),
    ]);
    expect(messages[3]).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "a", content: '{"ok":1}', is_error: undefined },
        { type: "tool_result", tool_use_id: "b", content: '{"ok":1}', is_error: undefined },
      ],
    });
    expect(messages.at(-1)).toEqual({ role: "assistant", content: [text("Deux biens.")] });
  });

  it("keeps the calls of the last answer waiting for the person, with the results already given", () => {
    const history = buildHistory([
      user("Change la description"),
      answer([call("a", "get_my_properties"), call("b", "update_listing_description")], "tool_use"),
      result("a", "get_my_properties"),
    ]);
    expect(history.pending.map((item) => item.id)).toEqual(["b"]);
    expect(history.messages.at(-1)?.role).toBe("assistant");
  });

  it("reads « not run » for a call left without a result in a former turn", () => {
    const { messages } = buildHistory([
      user("Change le prix"),
      answer([call("a", "update_listing_price")], "max_tokens"),
      user("Laisse tomber"),
    ]);
    expect(messages[3]).toMatchObject({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "a", is_error: true }],
    });
    expect(messages.slice(4)).toEqual([
      { role: "user", content: "Laisse tomber" },
      { role: "system", content: "Dossier." },
    ]);
  });

  it("leaves out a former turn without an answer (an error the person saw)", () => {
    const { messages } = buildHistory([user("Premier"), user("Second"), answer([text("Oui.")])]);
    expect(messages.map((message) => message.content)).toEqual([
      "Second",
      "Dossier.",
      [text("Oui.")],
    ]);
  });

  it("sends the thinking back as written, but not the one of turns before a window that moved", () => {
    const rows = [
      user("Un"),
      answer([thinking, text("1")]),
      user("Deux"),
      answer([thinking, text("2")]),
      user("Trois"),
      answer([thinking, call("a", "get_my_properties")], "tool_use"),
      result("a", "get_my_properties"),
    ];
    const whole = buildHistory(rows, { maxTurns: 3 });
    expect(whole.truncated).toBe(false);
    expect(hasThinking(whole.messages.slice(0, 3))).toBe(true);

    const moved = buildHistory(rows, { maxTurns: 2 });
    expect(moved.truncated).toBe(true);
    expect(moved.messages[0]).toEqual({ role: "user", content: "Deux" });
    expect(moved.messages[2]).toEqual({ role: "assistant", content: [text("2")] });
    // The current turn keeps its own thinking: the history before it does not change within it.
    expect(moved.messages[5]).toEqual({
      role: "assistant",
      content: [thinking, call("a", "get_my_properties")],
    });

    const none = buildHistory(rows, { withoutThinking: true });
    expect(hasThinking(none.messages)).toBe(false);
  });

  it("ignores rows it cannot read (the log is the person's to write)", () => {
    const { messages } = buildHistory([
      {
        role: "assistant",
        content: { type: "assistant", blocks: [text("orphan")], stopReason: null },
      },
      user("Bonjour"),
      { role: "user", content: { text: 3 } },
      { role: "tool", content: "nope" },
      answer([{ type: "server_tool_use", id: "x" }, text("Oui.")]),
    ]);
    expect(messages).toEqual([
      { role: "user", content: "Bonjour" },
      { role: "system", content: "Dossier." },
    ]);
  });
});

describe("displayItems", () => {
  const confirmable = (name: string) => name.startsWith("update_");

  it("shows the messages, the answers, and the actions with what became of them", () => {
    const items = displayItems(
      [
        user("Change le prix"),
        answer([text("Voici."), call("a", "get_my_properties")], "tool_use"),
        result("a", "get_my_properties"),
        answer([call("b", "update_listing_price", { priceEuros: 1 })], "tool_use"),
        result("b", "update_listing_price", "declined", "cancelled"),
        user("Et la description ?"),
        answer([call("c", "update_listing_description")], "tool_use"),
      ],
      confirmable,
    );
    expect(items).toEqual([
      { kind: "user", text: "Change le prix" },
      { kind: "assistant", text: "Voici." },
      {
        kind: "action",
        toolCallId: "b",
        name: "update_listing_price",
        input: { priceEuros: 1 },
        state: "declined",
        result: "cancelled",
      },
      { kind: "user", text: "Et la description ?" },
      {
        kind: "action",
        toolCallId: "c",
        name: "update_listing_description",
        input: {},
        state: "pending",
        result: null,
      },
    ]);
  });

  it("an action of a former answer never answered no longer waits", () => {
    const items = displayItems(
      [user("Prix"), answer([call("b", "update_listing_price")], "tool_use"), user("Autre chose")],
      confirmable,
    );
    expect(items[1]).toMatchObject({ kind: "action", state: "superseded" });
  });
});

/** A tool of the tests: reads (`seen`), or writes and waits for the person. */
function tool(name: string, requiresConfirmation: boolean, seen: unknown[] = []): AnyTool {
  return {
    name,
    description: `The tool ${name}.`,
    input: z.object({ id: z.string().min(1) }),
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    requiresConfirmation,
    contexts: ["seller"],
    async preview(input) {
      return { ok: true, data: { kind: "test", input } };
    },
    async execute(input) {
      seen.push(input);
      return { read: input };
    },
  };
}

function message(content: unknown[], stop: Anthropic.StopReason): Anthropic.Message {
  return {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "test-model",
    container: null,
    diagnostics: null,
    stop_details: null,
    stop_reason: stop,
    stop_sequence: null,
    content: content as Anthropic.ContentBlock[],
    usage: {
      cache_creation: null,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      inference_geo: null,
      input_tokens: 1,
      output_tokens: 1,
      output_tokens_details: null,
      server_tool_use: null,
      service_tier: null,
      speed: null,
    },
  };
}

function turn(replies: (Anthropic.Message | Error)[], tools: AnyTool[], logged = true) {
  const events: ChatEvent[] = [];
  const answers: unknown[] = [];
  const results: { tool_use_id: string; status: string; result?: unknown }[] = [];
  const requests: Anthropic.MessageParam[][] = [];
  const callModel = vi.fn(async (request: { messages: Anthropic.MessageParam[] }, handlers) => {
    requests.push(request.messages);
    const reply = replies.shift();
    if (!reply || reply instanceof Error) throw reply ?? new Error("no reply");
    for (const block of reply.content) if (block.type === "text") handlers.onText(block.text);
    return reply;
  });
  const run = runTurn({
    model: "test-model",
    callModel,
    system: "Prompt.",
    tools,
    messages: [{ role: "user", content: "Bonjour" }],
    ctx: { profileId: "p", context: "seller", stepCode: null },
    emit: (event) => events.push(event),
    log: {
      answer: async (value) => {
        answers.push(value);
        return logged;
      },
      result: async (value) => {
        results.push(value);
        return logged;
      },
    },
  });
  return { run, events, answers, results, requests, callModel };
}

describe("runTurn", () => {
  it("streams the text, runs a tool that reads, then answers with its result", async () => {
    const seen: unknown[] = [];
    const t = turn(
      [
        message([text("Je regarde."), call("a", "read", { id: "1" })], "tool_use"),
        message([text("Voilà.")], "end_turn"),
      ],
      [tool("read", false, seen)],
    );
    await t.run;
    expect(seen).toEqual([{ id: "1" }]);
    expect(t.events).toEqual([
      { type: "text", delta: "Je regarde." },
      { type: "tool", name: "read" },
      { type: "text", delta: "Voilà." },
      { type: "done", reason: "end" },
    ]);
    expect(t.results).toEqual([
      {
        type: "tool_result",
        tool_use_id: "a",
        name: "read",
        status: "done",
        result: { read: { id: "1" } },
      },
    ]);
    expect(t.requests[1].slice(-1)).toEqual([
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "a",
            content: '{"read":{"id":"1"}}',
            is_error: undefined,
          },
        ],
      },
    ]);
    expect(t.answers).toHaveLength(2);
  });

  it("stops on a tool that writes: its change shown, nothing run, the other results logged", async () => {
    const written: unknown[] = [];
    const t = turn(
      [message([call("a", "read", { id: "1" }), call("b", "write", { id: "2" })], "tool_use")],
      [tool("read", false), tool("write", true, written)],
    );
    await t.run;
    expect(written).toEqual([]);
    expect(t.results.map((row) => row.tool_use_id)).toEqual(["a"]);
    expect(t.events.slice(-2)).toEqual([
      {
        type: "confirm",
        toolCallId: "b",
        name: "write",
        preview: { kind: "test", input: { id: "2" } },
      },
      { type: "done", reason: "confirm" },
    ]);
    expect(t.callModel).toHaveBeenCalledTimes(1);
  });

  it("gives the model an error for an unknown tool or an input its schema refuses", async () => {
    const t = turn(
      [
        message([call("a", "nope"), call("b", "read", { id: "" })], "tool_use"),
        message([text("Désolé.")], "end_turn"),
      ],
      [tool("read", false)],
    );
    await t.run;
    expect(t.results.map((row) => [row.tool_use_id, row.status])).toEqual([
      ["a", "error"],
      ["b", "error"],
    ]);
  });

  it("never runs a call cut off by the length, says a refusal, stops when the log fails", async () => {
    const seen: unknown[] = [];
    const cut = turn(
      [message([call("a", "read", { id: "1" })], "max_tokens")],
      [tool("read", false, seen)],
    );
    await cut.run;
    expect(seen).toEqual([]);
    expect(cut.events.at(-1)).toEqual({ type: "done", reason: "length" });

    const refused = turn([message([text("Non.")], "refusal")], []);
    await refused.run;
    expect(refused.events.at(-1)).toEqual({ type: "error", error: "refused" });

    const lost = turn([message([text("Oui.")], "end_turn")], [], false);
    await lost.run;
    expect(lost.events.at(-1)).toEqual({ type: "error", error: "unavailable" });
  });

  it("asks again without the thinking blocks when the API refuses the history, once", async () => {
    const refused = new Anthropic.BadRequestError(400, undefined, "thinking", new Headers());
    const requests: Anthropic.MessageParam[][] = [];
    const replies: (Anthropic.Message | Error)[] = [
      refused,
      refused,
      message([text("Oui.")], "end_turn"),
    ];
    const events: ChatEvent[] = [];
    const callModel = vi.fn(async (request: { messages: Anthropic.MessageParam[] }) => {
      requests.push(request.messages);
      const reply = replies.shift();
      if (!reply || reply instanceof Error) throw reply ?? new Error("no reply");
      return reply;
    });
    const history: Anthropic.MessageParam[] = [
      { role: "user", content: "Un" },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "", signature: "s" },
          { type: "text", text: "1" },
        ],
      },
      { role: "user", content: "Deux" },
    ];
    const run = (messages: Anthropic.MessageParam[]) =>
      runTurn({
        model: "m",
        callModel,
        system: "Prompt.",
        tools: [],
        messages,
        ctx: { profileId: "p", context: "seller", stepCode: null },
        emit: (event) => events.push(event),
        log: { answer: async () => true, result: async () => true },
      });

    await run(history);
    expect(hasThinking(requests[0])).toBe(true);
    expect(hasThinking(requests[1])).toBe(false);
    // Refused again without them: an error, no third try.
    expect(callModel).toHaveBeenCalledTimes(2);
    expect(events.at(-1)).toEqual({ type: "error", error: "unavailable" });

    // A history without thinking refused: no second try.
    events.length = 0;
    replies.unshift(refused);
    await run([{ role: "user", content: "Trois" }]);
    expect(callModel).toHaveBeenCalledTimes(3);
    expect(events.at(-1)).toEqual({ type: "error", error: "unavailable" });
  });

  it("stops after six calls of the model in one turn", async () => {
    const replies = Array.from({ length: 8 }, (_, index) =>
      message([call(`c${index}`, "read", { id: "1" })], "tool_use"),
    );
    const t = turn(replies, [tool("read", false)]);
    await t.run;
    expect(t.callModel).toHaveBeenCalledTimes(6);
    expect(t.events.at(-1)).toEqual({ type: "done", reason: "limit" });
  });
});

describe("chatRequest", () => {
  it("caches the prompt (the tools before it) and the conversation, thinks as needed, at low effort", () => {
    const request = chatRequest(
      "claude-sonnet-5-5",
      "Prompt.",
      [tool("b", false), tool("a", true)],
      [{ role: "user", content: "Bonjour" }],
    );
    expect(request.system).toEqual([
      { type: "text", text: "Prompt.", cache_control: { type: "ephemeral" } },
    ]);
    expect(request.cache_control).toEqual({ type: "ephemeral" });
    expect(request.thinking).toEqual({ type: "adaptive" });
    expect(request.output_config).toEqual({ effort: "low" });
    expect(request.max_tokens).toBe(16_000);
    expect(request.tools?.map((item) => ("name" in item ? item.name : ""))).toEqual(["a", "b"]);
    expect(request.tools?.every((item) => "strict" in item && item.strict === true)).toBe(true);
  });

  it("offers no tool without a schema for the model (search_knowledge, Q69)", () => {
    expect(toolDefinitions([{ ...tool("x", false), inputSchema: undefined }])).toEqual([]);
  });
});

describe("dailyLimit", () => {
  it("per role, the highest of several, the admin without limit (SPEC-V2 12)", () => {
    expect(dailyLimit(["buyer"], { hasPaidProperty: false })).toBe(20);
    expect(dailyLimit(["seller"], { hasPaidProperty: false })).toBe(30);
    expect(dailyLimit(["seller"], { hasPaidProperty: true })).toBe(100);
    expect(dailyLimit(["buyer", "seller"], { hasPaidProperty: false })).toBe(30);
    expect(dailyLimit(["admin", "seller"], { hasPaidProperty: false })).toBeNull();
    expect(dailyLimit([], { hasPaidProperty: false })).toBe(0);
    expect(AI_DAILY_LIMITS.sellerPaid).toBe(100);
  });
});

describe("prompts", () => {
  it("base.md says who the assistant is and holds the rules of Leenkey (SPEC-V2 12)", () => {
    const base = promptFile("base");
    expect(base).toContain(
      "Tu es l'assistant de Leenkey, une plateforme de vente immobilière entre particuliers accompagnée par des conseillers.",
    );
    for (const rule of [
      "Ne jamais inventer une information manquante.",
      "ne jamais dire s'il faut accepter une offre",
      "Ne jamais se présenter comme notaire, avocat, diagnostiqueur, courtier ou expert immobilier.",
      "Ne jamais bloquer ni décourager une étape indispensable de la vente pour pousser à une formule payante.",
      "Ne jamais qualifier juridiquement l'activité de Leenkey",
      "N'annonce jamais qu'une modification est faite avant la confirmation",
      "Vouvoiement",
      "Pas d'emoji",
    ]) {
      expect(base).toContain(rule);
    }
  });

  it("the system prompt: the rules, the seller, then the FAQ in the order of the database", () => {
    const cards = [
      { id: "1", category: "prix", stepCode: "S2", question: " Q1 ", answer: "R1" },
      { id: "2", category: "visites", stepCode: null, question: "Q2", answer: "R2" },
    ];
    const prompt = systemPrompt("seller", cards);
    expect(prompt.startsWith(promptFile("base"))).toBe(true);
    expect(prompt).toContain(promptFile("seller"));
    expect(prompt.endsWith(faqSection(cards))).toBe(true);
    expect(faqSection(cards)).toContain(
      '<fiche categorie="prix" etape="S2">\nQuestion : Q1\nRéponse : R1\n</fiche>',
    );
    expect(faqSection(cards)).toContain('<fiche categorie="visites">');
    expect(systemPrompt("seller", cards)).toBe(prompt);
  });

  it("the seller prompt names every tool offered to the model", () => {
    const seller = promptFile("seller");
    for (const item of toolsFor("seller")) expect(seller).toContain(`\`${item.name}\``);
  });
});

describe("the tools of the seller", () => {
  it("one name each, the names of SPEC-V2 12, a schema for the model with the fields of Zod", () => {
    const names = ALL_TOOLS.map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.sort()).toEqual([
      "get_listing_stats",
      "get_my_properties",
      "get_property_details",
      "get_sale_progress",
      "get_upgrade_context",
      "summarize_contacts",
      "update_listing_description",
      "update_listing_price",
    ]);
    for (const item of ALL_TOOLS) {
      const schema = item.inputSchema;
      expect(schema, item.name).toBeDefined();
      expect(Object.keys(schema?.properties ?? {}).sort()).toEqual(
        [...(schema?.required ?? [])].sort(),
      );
      const shape = item.input instanceof z.ZodObject ? Object.keys(item.input.shape).sort() : [];
      expect(shape, item.name).toEqual(Object.keys(schema?.properties ?? {}).sort());
    }
  });

  it("every tool that writes is confirmed first and shows its change (CLAUDE.md 8)", () => {
    for (const item of ALL_TOOLS) {
      const writes = item.name.startsWith("update_");
      expect(item.requiresConfirmation, item.name).toBe(writes);
      if (writes) expect(item.preview, item.name).toBeTypeOf("function");
    }
  });

  it("a description of 1 200 characters at most, a price in whole euros", () => {
    const description = ALL_TOOLS.find((item) => item.name === "update_listing_description");
    const price = ALL_TOOLS.find((item) => item.name === "update_listing_price");
    const id = "5eed1000-0000-4000-8000-000000000001";
    expect(
      description?.input.safeParse({ propertyId: id, description: "x".repeat(1_200) }).success,
    ).toBe(true);
    expect(
      description?.input.safeParse({ propertyId: id, description: "x".repeat(1_201) }).success,
    ).toBe(false);
    expect(description?.input.safeParse({ propertyId: id, description: "  " }).success).toBe(false);
    expect(price?.input.safeParse({ propertyId: id, priceEuros: 239_000 }).success).toBe(true);
    expect(price?.input.safeParse({ propertyId: id, priceEuros: 239_000.5 }).success).toBe(false);
    expect(price?.input.safeParse({ propertyId: id, priceEuros: 0 }).success).toBe(false);
    expect(price?.input.safeParse({ propertyId: "1", priceEuros: 1 }).success).toBe(false);
  });

  it("the gap of a price to the analysis of value, one decimal", () => {
    expect(gapPercent(210_000, 200_000)).toBe(5);
    expect(gapPercent(190_000, 200_000)).toBe(-5);
    expect(gapPercent(200_333, 200_000)).toBe(0.2);
    expect(gapPercent(200_000, null)).toBeNull();
    expect(
      actionPreview.safeParse({
        kind: "listing_price",
        propertyName: "Maison",
        beforeEuros: 1,
        afterEuros: 2,
        valuationEuros: null,
        gapPercent: null,
      }).success,
    ).toBe(true);
  });
});

describe("the file of the seller given to the model", () => {
  it("the day in Paris, the first name, each property, the property of the conversation", () => {
    const text = sellerContextText({
      firstName: "Alice",
      now: new Date("2026-11-02T23:30:00Z"),
      total: 1,
      propertyId: "p1",
      overview: [
        {
          propertyId: "p1",
          name: "Maison 5 pièces",
          city: "Savigny-sur-Orge",
          postalCode: "91600",
          listingStatus: "En ligne",
          priceEuros: 239_000,
          plan: { code: "accompagne", name: "Accompagné", priceEuros: 990, paid: true },
          step: { position: 3, total: 6, title: "Gérer mes contacts" },
          tasksToDo: ["Répondre aux acquéreurs"],
        },
      ],
    });
    expect(text).toContain("- Date : mardi 3 novembre 2026.");
    expect(text).toContain("- Prénom : Alice.");
    expect(text).toContain("« Maison 5 pièces », Savigny-sur-Orge (91600).");
    expect(text).toContain("Annonce : En ligne, 239 000 €.");
    expect(text).toContain("Formule : Accompagné (payante).");
    expect(text).toContain("Étape 3 sur 6 : Gérer mes contacts.");
    expect(text).toContain("Tâches restantes de l'étape : Répondre aux acquéreurs.");
    expect(text).toContain("- La conversation porte sur le bien p1 (« Maison 5 pièces »).");
  });
});

describe("the stream and the request of the browser", () => {
  it("reads whole events, keeps a cut one for the next chunk, skips what it cannot read", () => {
    const first = readEvents(
      'data: {"type":"text","delta":"Bon"}\n\ndata: {"type":"nope"}\n\ndata: not json\n\ndata: {"type":"done"',
    );
    expect(first.events).toEqual([{ type: "text", delta: "Bon" }]);
    const second = readEvents(`${first.rest},"reason":"end"}\n\n`);
    expect(second.events).toEqual([{ type: "done", reason: "end" }]);
    expect(second.rest).toBe("");
  });

  it("a message of the seller, or going on after confirmations; the buyer with lot 2", () => {
    const id = "5eed1000-0000-4000-8000-000000000001";
    expect(chatRequestSchema.safeParse({ context: "seller", message: " Bonjour " }).success).toBe(
      true,
    );
    expect(
      chatRequestSchema.safeParse({ context: "seller", message: "x".repeat(2_001) }).success,
    ).toBe(false);
    expect(chatRequestSchema.safeParse({ context: "seller", message: "   " }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ context: "buyer", message: "Bonjour" }).success).toBe(
      false,
    );
    expect(chatRequestSchema.safeParse({ context: "seller", resume: true }).success).toBe(false);
    expect(
      chatRequestSchema.safeParse({ context: "seller", conversationId: id, resume: true }).success,
    ).toBe(true);
    expect(
      chatRequestSchema.safeParse({ context: "seller", message: "a", resume: true }).success,
    ).toBe(false);
  });
});

describe("the texts of the assistant (CLAUDE.md section 16)", () => {
  function texts(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (typeof value === "function") return texts((value as (arg: string) => unknown)("3"));
    if (Array.isArray(value)) return value.flatMap(texts);
    if (value && typeof value === "object") return Object.values(value).flatMap(texts);
    return [];
  }

  it("« nous », never « on », « estimation » alone nor an emoji", () => {
    for (const value of texts(fr.assistant)) {
      expect(value).not.toMatch(/(^|[\s'’])on(\s|$)/i);
      expect(value).not.toMatch(/\bestimation\b/i);
      expect(value).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it("the message at the limit of the day, word for word (SPEC-V2 12)", () => {
    expect(fr.assistant.errors.quota).toBe(
      "Vous avez atteint la limite de messages de l'assistant pour aujourd'hui. Elle se renouvelle à minuit. Besoin d'aide maintenant ? Écrivez à un conseiller.",
    );
  });
});
