import "server-only";
import { createModelMessage, isAiConfigured, isAiMock } from "@/core/ai/client";
import { toStoredBlocks } from "@/core/ai/conversation";
import { generateText, textRequest } from "@/core/ai/generate";
import { logAnswer, logRequest, openConversation } from "@/core/ai/log";
import { MODELS, SUGGESTION_SETTINGS } from "@/core/ai/models";
import { promptFile } from "@/core/ai/prompts";
import type { SessionProfile } from "@/core/auth/session";
import { consumeQuota } from "@/leenkey/ai/assistant";
import { mockText } from "@/leenkey/ai/mock";
import { breaksRules } from "@/leenkey/ai/suggestions";
import { createClient } from "@/lib/supabase/server";
import { adminInterventionsOpen } from "../interventions/queries";
import { adminOfferCounts } from "../offers/queries";
import {
  briefDecision,
  briefPrompt,
  briefText,
  type DailyBrief,
  type DailyBriefFacts,
} from "./daily-brief-facts";
import {
  adminActivity,
  adminBriefCounts,
  adminCounts,
  latestDailyBrief,
  type QueryResult,
} from "./queries";

// « Résumé du jour » of the dashboard of the back office (SPEC-V2 17, outil
// admin_daily_brief of section 12, L1-30b). The facts are read in code with
// the admin's session (the reads of the dashboard), then phrased by
// MODELS.smart in five lines at most (prompt core/ai/prompts/
// admin-daily-brief.md): the model never reads the base. One call, not
// streamed, logged under its own kind (ai_conversations.kind 'daily_brief',
// context 'admin'), like « Synthèse avant appel » (L1-30d). The brief is kept
// an hour for the whole team (admin_daily_briefs); « Régénérer » writes a new
// one, 5 minutes at least after the last (checked here and by the base).

export type DailyBriefError = "auth" | "invalid" | "quota" | "refused" | "unavailable";

export type DailyBriefResult =
  | { ok: true; data: DailyBrief }
  | { ok: false; error: DailyBriefError };

/** The last 24 hours (SPEC 17, « offres du jour »; inscriptions and plans of the day). */
const DAY_MS = 24 * 60 * 60 * 1000;

/** The facts of the brief, all of them or none: a brief never says « rien » for a count it could not read. */
export async function gatherBriefFacts(now: Date): Promise<QueryResult<DailyBriefFacts>> {
  const [counts, activity, extra, interventions, offers] = await Promise.all([
    adminCounts(),
    adminActivity(1),
    adminBriefCounts(new Date(now.getTime() - DAY_MS)),
    adminInterventionsOpen(),
    adminOfferCounts(),
  ]);
  if (!counts.ok || !activity.ok || !extra.ok || interventions === null || !offers.ok) {
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: {
      listingsPending: counts.data.listingsPending,
      listingsOldestSubmittedAt: counts.data.listingsOldestSubmittedAt,
      casesOpen: counts.data.casesOpen,
      reportsOpen: counts.data.reportsOpen,
      advisorUnread: counts.data.advisorUnread,
      interventionsOpen: interventions,
      financingToCheck: extra.data.financingToCheck,
      identityToCheck: extra.data.identityToCheck,
      identityFilesToDelete: extra.data.identityFilesToDelete,
      offersWaiting: offers.data.waiting,
      offersSent: extra.data.offersSent,
      signupsSellers: activity.data.signupsSellers,
      signupsBuyers: activity.data.signupsBuyers,
      plansSold: activity.data.plansSold,
      plansAmountCents: activity.data.plansAmountCents,
    },
  };
}

/** The brief shown on the dashboard: the one of the last hour, or a new one. */
export async function dailyBrief(
  profile: SessionProfile,
  regenerate: boolean,
): Promise<DailyBriefResult> {
  if (!isAiConfigured()) return { ok: false, error: "unavailable" };
  const now = new Date();
  const latest = await latestDailyBrief();
  if (!latest.ok) return { ok: false, error: "unavailable" };
  const decision = briefDecision(latest.data, now, regenerate);
  if (latest.data && decision === "cached") return { ok: true, data: latest.data };
  if (latest.data && decision === "too_soon") {
    return { ok: true, data: { ...latest.data, tooSoon: true } };
  }

  const facts = await gatherBriefFacts(now);
  if (!facts.ok) return { ok: false, error: "unavailable" };

  let system: string;
  try {
    system = promptFile("admin-daily-brief");
  } catch (error) {
    console.error("[admin] daily brief prompt unreadable", {
      user_id: profile.id,
      error: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, error: "unavailable" };
  }

  const supabase = await createClient();
  const quota = await consumeQuota(supabase, profile, false);
  if (!quota.ok) return { ok: false, error: quota.error === "quota" ? "quota" : "unavailable" };

  const prompt = briefPrompt(facts.data, now);
  const conversationId = await openConversation(supabase, profile.id, "admin", null, "daily_brief");
  if (!conversationId) return { ok: false, error: "unavailable" };
  if ((await logRequest(supabase, conversationId, `résumé du jour\n\n${prompt}`)) !== "ok") {
    return { ok: false, error: "unavailable" };
  }
  const generation = await generateText(
    isAiMock()
      ? mockText("daily_brief")
      : (request) =>
          createModelMessage(request, {
            timeout: SUGGESTION_SETTINGS.timeoutMs,
            maxRetries: SUGGESTION_SETTINGS.maxRetries,
          }),
    textRequest(MODELS.smart, system, prompt),
    { userId: profile.id, kind: "daily_brief" },
  );
  if (generation.message) {
    const { message } = generation;
    const logged = await logAnswer(supabase, conversationId, {
      blocks: toStoredBlocks(message.content),
      stopReason: message.stop_reason,
      model: message.model,
      usage: message.usage,
    });
    if (logged !== "ok") return { ok: false, error: "unavailable" };
  }
  if (!generation.ok) return { ok: false, error: generation.error };
  const text = briefText(generation.text);
  if (!text || breaksRules(text)) return { ok: false, error: "unavailable" };

  // Kept an hour for the team. Refused when another brief was written in
  // the last 5 minutes (two members at the same moment): this one is still
  // shown, the other is the one kept.
  const { data: kept, error } = await supabase
    .from("admin_daily_briefs")
    .insert({ body: text, conversation_id: conversationId })
    .select("created_at")
    .single();
  if (error) {
    console.error("[admin] daily brief not kept", { user_id: profile.id, code: error.code });
  }
  return { ok: true, data: { text, createdAt: kept?.created_at ?? now.toISOString() } };
}
