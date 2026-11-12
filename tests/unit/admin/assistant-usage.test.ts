import { describe, expect, it } from "vitest";
import { entryText } from "@/leenkey/admin/assistant/queries-text";
import { rowCost, usageSummary } from "@/leenkey/admin/assistant/usage";

describe("usageSummary", () => {
  const rows = [
    {
      day: "2026-11-11",
      context: "seller",
      model: "claude-sonnet-5-5",
      answers: 4,
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    {
      day: "2026-11-12",
      context: "visitor",
      model: "claude-sonnet-5-5-20261001",
      answers: 2,
      inputTokens: 500_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    {
      day: "2026-11-12",
      context: "admin",
      model: "claude-opus-5-5",
      answers: 1,
      inputTokens: 0,
      outputTokens: 50_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
  ];

  it("sums by day (latest first) and by context (largest first), with a cost from the prices", () => {
    const summary = usageSummary(rows);
    expect(summary.total).toEqual({
      answers: 7,
      inputTokens: 1_500_000,
      outputTokens: 150_000,
      cost: 5,
    });
    expect(summary.days.map((day) => [day.day, day.cost])).toEqual([
      ["2026-11-12", 2],
      ["2026-11-11", 3],
    ]);
    expect(summary.contexts.map((context) => context.context)).toEqual([
      "seller",
      "visitor",
      "admin",
    ]);
  });

  it("a model without a known price: tokens, no cost", () => {
    expect(rowCost({ model: "autre-modele", inputTokens: 10, outputTokens: 10 })).toBeNull();
    expect(usageSummary([{ ...rows[0], model: "" }]).total.cost).toBeNull();
    expect(usageSummary([]).total).toEqual({
      answers: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    });
  });
});

describe("rowCost", () => {
  it("the prompt cache: read at a tenth of the price, written at 1.25 times, counted as read", () => {
    expect(
      rowCost({
        model: "claude-sonnet-5-5",
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
        cacheWriteTokens: 1_000_000,
      }),
    ).toBeCloseTo(0.2 + 2.5);
    expect(
      usageSummary([
        {
          day: "2026-11-12",
          context: "seller",
          model: "claude-sonnet-5-5",
          answers: 1,
          inputTokens: 100,
          outputTokens: 10,
          cacheReadTokens: 9_000,
          cacheWriteTokens: 0,
        },
      ]).total.inputTokens,
    ).toBe(9_100);
  });
});

describe("entryText", () => {
  it("the text of each kind of stored message", () => {
    expect(entryText("user", { type: "user", text: "Bonjour", context: null })).toEqual({
      text: "Bonjour",
      request: false,
    });
    expect(entryText("user", { type: "request", text: "<annonce>" })).toEqual({
      text: "<annonce>",
      request: true,
    });
    expect(
      entryText("assistant", {
        type: "assistant",
        blocks: [
          { type: "thinking", thinking: "…" },
          { type: "text", text: "Voici." },
          { type: "tool_use", name: "get_listing", input: {} },
        ],
      }),
    ).toEqual({ text: "Voici.\n\n→ get_listing", request: false });
    expect(entryText("tool", { type: "tool_result", name: "get_listing", status: "ok" })).toEqual({
      text: "get_listing · ok",
      request: false,
    });
    expect(entryText("assistant", null)).toEqual({ text: "", request: false });
  });
});
