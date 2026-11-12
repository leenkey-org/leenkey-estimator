import { MODEL_PRICES_USD } from "@/core/ai/models";

// The consumption of the assistant (L1-30d, SPEC-V2 17): the rows of
// admin_ai_usage (day, context, model) summed by day and by context, with an
// indicative cost from the public prices of the models. Pure: unit tested.

export type UsageInput = {
  day: string;
  context: string;
  model: string;
  answers: number;
  inputTokens: number;
  outputTokens: number;
};

export type UsageTotal = {
  answers: number;
  inputTokens: number;
  outputTokens: number;
  /** Dollars; null when a model of the total has no known price. */
  cost: number | null;
};

/** The price of a model, by its identifier or a dated version of it (« claude-sonnet-5-5-20261001 »). */
function priceOf(model: string) {
  const key = Object.keys(MODEL_PRICES_USD).find(
    (name) => model === name || model.startsWith(`${name}-`),
  );
  return key ? MODEL_PRICES_USD[key] : null;
}

export function rowCost(row: Pick<UsageInput, "model" | "inputTokens" | "outputTokens">) {
  const price = priceOf(row.model);
  return price
    ? (row.inputTokens * price.input + row.outputTokens * price.output) / 1_000_000
    : null;
}

function add(total: UsageTotal, row: UsageInput): UsageTotal {
  const cost = rowCost(row);
  return {
    answers: total.answers + row.answers,
    inputTokens: total.inputTokens + row.inputTokens,
    outputTokens: total.outputTokens + row.outputTokens,
    cost: total.cost === null || cost === null ? null : total.cost + cost,
  };
}

const EMPTY: UsageTotal = { answers: 0, inputTokens: 0, outputTokens: 0, cost: 0 };

export function usageSummary(rows: readonly UsageInput[]) {
  const days = new Map<string, UsageTotal>();
  const contexts = new Map<string, UsageTotal>();
  let total = EMPTY;
  for (const row of rows) {
    days.set(row.day, add(days.get(row.day) ?? EMPTY, row));
    contexts.set(row.context, add(contexts.get(row.context) ?? EMPTY, row));
    total = add(total, row);
  }
  return {
    total,
    // The most recent day first.
    days: [...days.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([day, sum]) => ({ day, ...sum })),
    // The largest consumer first.
    contexts: [...contexts.entries()]
      .sort(([, a], [, b]) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens))
      .map(([context, sum]) => ({ context, ...sum })),
  };
}
