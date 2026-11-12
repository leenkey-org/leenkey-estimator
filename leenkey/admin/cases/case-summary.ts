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
import { asData, cleanSuggestion } from "@/leenkey/ai/suggestions";
import type { SuggestionResult } from "@/leenkey/ai/types";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { adminAdvisorConversations } from "../messages/queries";
import { adminCase, type AdminCaseDetail } from "./queries";

// « Synthèse avant appel » of a case (SPEC-V2 17, outil admin_case_summary
// de la section 12, L1-30d): the assistant sums a case up for the team
// before a call, from the case, its notes, the tasks of the sale, the last
// messages with the adviser and the summary of the assistant. One call of
// MODELS.fast, not streamed, logged under its own kind (ai_conversations.kind
// 'case_summary', context 'admin'). Shown to the team only, never stored on
// the case: a note is written by a person.

/** The summary as the team reads it (the prompt asks 900). */
export const CASE_SUMMARY_MAX = 1_200;
const NOTES_MAX = 10;
const MESSAGES_MAX = 10;
const TEXT_CHARS = 1_000;

const when = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "short",
});

export type CaseMessage = { fromSeller: boolean; body: string; createdAt: string };

/** What the model writes the summary from. */
export function caseSummaryPrompt(item: AdminCaseDetail, messages: readonly CaseMessage[]): string {
  const listing = item.property?.listing ?? null;
  const parts = [
    "<dossier>",
    `Sujet : ${asData(item.subject, 200)}`,
    `Origine : ${fr.adminCases.sources[item.source]}`,
    `Statut : ${fr.adminCases.status[item.status]}`,
    `Ouvert le : ${when.format(new Date(item.createdAt))}`,
    `Client : ${item.account.deleted ? "compte supprimé" : asData(item.account.name ?? "nom non précisé", 120)}`,
    `Formule : ${item.plan ? fr.plan[item.plan] : "non précisée"}`,
    item.property
      ? `Bien : ${[listing?.reference, asData(listing?.title ?? "", 200), asData(item.property.city, 100)].filter(Boolean).join(" · ")}${listing ? ` (annonce : ${fr.listingStatus[listing.status]})` : ""}`
      : "Bien : aucun",
  ];
  if (item.sale) {
    const current = item.sale.steps.find((step) => step.state === "current");
    parts.push(`Étape de la vente : ${current ? current.title : "non précisée"}`);
    const open = item.sale.tasks.filter((task) => !task.done);
    if (open.length > 0) {
      parts.push(`Tâches de Leenkey à faire : ${open.map((task) => task.title).join(" ; ")}`);
    }
  }
  parts.push("</dossier>");
  if (item.aiSummary) {
    parts.push(
      "",
      "<resume_de_l_assistant>",
      asData(item.aiSummary, TEXT_CHARS),
      "</resume_de_l_assistant>",
    );
  }
  const notes = item.notes.slice(-NOTES_MAX);
  if (notes.length > 0) {
    parts.push("", "<notes_internes>");
    for (const note of notes) {
      parts.push(
        `<note date="${when.format(new Date(note.at))}">`,
        asData(note.body, TEXT_CHARS),
        "</note>",
      );
    }
    parts.push("</notes_internes>");
  }
  if (messages.length > 0) {
    parts.push("", "<messages_avec_le_conseiller>");
    for (const message of messages) {
      parts.push(
        `<message auteur="${message.fromSeller ? "client" : "Leenkey"}" date="${when.format(new Date(message.createdAt))}">`,
        asData(message.body, TEXT_CHARS),
        "</message>",
      );
    }
    parts.push("</messages_avec_le_conseiller>");
  }
  parts.push("", "Rédige la synthèse de ce dossier avant l'appel.");
  return parts.join("\n");
}

/** The last messages of the conversation with the adviser of the property of the case. */
async function adviserMessages(item: AdminCaseDetail): Promise<CaseMessage[]> {
  if (!item.property) return [];
  const advisors = await adminAdvisorConversations();
  const conversation = advisors.ok
    ? advisors.data.find((row) => row.propertyId === item.property?.id)
    : undefined;
  if (!conversation) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("sender_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_MAX);
  if (error) {
    console.error("[admin] case summary messages failed", { entity_id: item.id, code: error.code });
    return [];
  }
  return data.reverse().map((row) => ({
    fromSeller: row.sender_id === conversation.sellerId,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function summarizeCase(
  profile: SessionProfile,
  caseId: string,
): Promise<SuggestionResult> {
  if (!isAiConfigured()) return { ok: false, error: "unavailable" };
  const found = await adminCase(caseId);
  if (!found.ok) return { ok: false, error: "unavailable" };
  if (!found.data) return { ok: false, error: "not_found" };

  let system: string;
  try {
    system = promptFile("case-summary");
  } catch (error) {
    console.error("[admin] case summary prompt unreadable", {
      user_id: profile.id,
      error: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, error: "unavailable" };
  }

  const supabase = await createClient();
  const quota = await consumeQuota(supabase, profile, false);
  if (!quota.ok) return { ok: false, error: quota.error === "quota" ? "quota" : "unavailable" };

  const prompt = caseSummaryPrompt(found.data, await adviserMessages(found.data));
  const conversationId = await openConversation(
    supabase,
    profile.id,
    "admin",
    null,
    "case_summary",
  );
  if (!conversationId) return { ok: false, error: "unavailable" };
  // The case in the log: the policy keeps the property of the log to its owner.
  if ((await logRequest(supabase, conversationId, `dossier ${caseId}\n\n${prompt}`)) !== "ok") {
    return { ok: false, error: "unavailable" };
  }
  const generation = await generateText(
    isAiMock()
      ? mockText("case_summary")
      : (request) =>
          createModelMessage(request, {
            timeout: SUGGESTION_SETTINGS.timeoutMs,
            maxRetries: SUGGESTION_SETTINGS.maxRetries,
          }),
    textRequest(MODELS.fast, system, prompt),
    { userId: profile.id, kind: "case_summary" },
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
  const text = cleanSuggestion(generation.text, CASE_SUMMARY_MAX);
  return text ? { ok: true, data: { text } } : { ok: false, error: "unavailable" };
}
