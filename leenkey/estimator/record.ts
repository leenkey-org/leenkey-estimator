import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { estimationPayloadSchema, estimationRecordArgs } from "@/lib/validations/estimation";

export type RecordedEstimation = {
  id: string;
  /** Anonymous caller: the token that attaches it to the account created next. */
  claimToken: string | null;
};

/**
 * Keeps an analysis of value with the session of the caller (L1-13b):
 * signed in, it is theirs at once; anonymous, it waits for estimation_claim.
 * null when it cannot be kept: the analysis is shown all the same.
 */
export async function recordEstimation(payload: unknown): Promise<RecordedEstimation | null> {
  const parsed = estimationPayloadSchema.safeParse(payload);
  if (!parsed.success || !isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("estimation_record", estimationRecordArgs(parsed.data))
      .single();
    if (error || !data) {
      console.error("[estimator] estimation not recorded", { code: error?.code });
      return null;
    }
    return { id: data.id, claimToken: data.claim_token || null };
  } catch (error) {
    console.error("[estimator] estimation not recorded", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
