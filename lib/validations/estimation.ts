import { z } from "zod";
import type { Json } from "@/types/database";

// An analysis of value as /api/estimate keeps it (L1-13b, SPEC-V2 section 4
// « estimations », DECISIONS 2026-10-08): the answers of the wizard as input,
// the figures of the engine as result. The engine runs in the browser: the
// figures are the ones it sends, shown to their author only.

const json: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(json), z.record(json)]),
);
const euros = z.number().finite().nonnegative();

export const estimationPayloadSchema = z
  .object({
    bien: z.record(json),
    estimation: z
      .object({ prix_estime: euros, prix_bas: euros.nullish(), prix_haut: euros.nullish() })
      .catchall(json),
    comparables_dvf: json.optional(),
    contact: z
      .object({ email: z.string().trim().max(254).nullish() })
      .catchall(json)
      .optional(),
  })
  .catchall(json);

export type EstimationPayload = z.infer<typeof estimationPayloadSchema>;

/** Never kept with the answers: who asked (the email apart) and the session. */
const NOT_KEPT = new Set(["meta", "contact", "estimation", "comparables_dvf"]);

/** Arguments of estimation_record: amounts in cents, the email on its own. */
export function estimationRecordArgs(payload: EstimationPayload) {
  const cents = (euros: number | null | undefined) =>
    euros === null || euros === undefined ? undefined : Math.round(euros * 100);
  const input: { [key: string]: Json | undefined } = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !NOT_KEPT.has(key)),
  );
  return {
    p_input: input,
    p_result: { estimation: payload.estimation, comparables_dvf: payload.comparables_dvf ?? null },
    p_value_cents: cents(payload.estimation.prix_estime),
    p_low_cents: cents(payload.estimation.prix_bas),
    p_high_cents: cents(payload.estimation.prix_haut),
    p_email: payload.contact?.email || undefined,
  };
}

/** The token of an anonymous analysis (estimation_record: 24 random bytes in hex). */
export const claimEstimationSchema = z.object({
  estimationId: z.string().uuid(),
  token: z.string().regex(/^[0-9a-f]{48}$/),
});
