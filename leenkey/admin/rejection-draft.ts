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
import { asData, breaksRules, cleanSuggestion } from "@/leenkey/ai/suggestions";
import type { SuggestionResult } from "@/leenkey/ai/types";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { REJECTION_DRAFT_MAX } from "@/lib/validations/admin";
import { adminListing } from "./queries";
import { reviewIssueText } from "./review-text";

// « Rédiger avec l'assistant » in the refusal of a listing (SPEC-V2 17,
// L1-30d): the assistant writes the motive the seller will read, from the
// listing as the team reviews it, its pre-analysis and what the team already
// wrote in the field. One call of MODELS.fast, not streamed, logged under
// its own kind (ai_conversations.kind 'rejection_reason', context 'admin').
// Nothing is decided: the team reads it, changes it and refuses or not.

/** The description of the listing as the model reads it. */
const DESCRIPTION_CHARS = 1_200;
/** The note of the team as the model reads it (the field holds 1 000). */
const NOTES_CHARS = 1_000;

const euros = (cents: number) => `${new Intl.NumberFormat("fr-FR").format(cents / 100)} €`;

/** What the model writes the motive from. */
export function rejectionPrompt({
  listing,
  issues,
  valueCents,
  notes,
}: {
  listing: {
    title: string;
    type: string;
    city: string;
    priceCents: number;
    surfaceM2: number;
    rooms: number;
    description: string;
    photosCount: number;
  };
  issues: readonly string[];
  valueCents: number | null;
  notes: string;
}): string {
  return [
    "<annonce>",
    `Titre : ${asData(listing.title, 200)}`,
    `Type : ${listing.type}`,
    `Commune : ${asData(listing.city, 100)}`,
    `Prix : ${euros(listing.priceCents)}`,
    valueCents !== null ? `Analyse de valeur : ${euros(valueCents)}` : "Analyse de valeur : aucune",
    `Surface : ${listing.surfaceM2} m²`,
    `Pièces : ${listing.rooms}`,
    `Photos : ${listing.photosCount}`,
    "Description :",
    asData(listing.description, DESCRIPTION_CHARS) || "Aucune.",
    "</annonce>",
    "",
    "<pre_analyse>",
    issues.length > 0 ? issues.map((issue) => `- ${issue}`).join("\n") : "Aucun point relevé.",
    "</pre_analyse>",
    "",
    "<note_de_l_equipe>",
    asData(notes, NOTES_CHARS) || "Aucune.",
    "</note_de_l_equipe>",
    "",
    "Rédige le motif du refus de cette annonce.",
  ].join("\n");
}

export async function draftRejectionReason(
  profile: SessionProfile,
  listingId: string,
  notes: string,
): Promise<SuggestionResult> {
  if (!isAiConfigured()) return { ok: false, error: "unavailable" };
  const found = await adminListing(listingId);
  if (!found.ok) return { ok: false, error: "unavailable" };
  if (!found.data) return { ok: false, error: "not_found" };
  const { listing, review, valueCents, status } = found.data;
  // A refusal is for a listing waiting for the team; « nothing »: reload the page.
  if (status !== "pending") return { ok: false, error: "nothing" };

  let system: string;
  try {
    system = promptFile("rejection-reason");
  } catch (error) {
    console.error("[admin] rejection prompt unreadable", {
      user_id: profile.id,
      error: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, error: "unavailable" };
  }

  const supabase = await createClient();
  // The team has no limit, but each call is counted like the others.
  const quota = await consumeQuota(supabase, profile, false);
  if (!quota.ok) return { ok: false, error: quota.error === "quota" ? "quota" : "unavailable" };

  const prompt = rejectionPrompt({
    listing: {
      title: listing.title,
      type: fr.propertyType[listing.type],
      city: listing.city,
      priceCents: listing.priceCents,
      surfaceM2: listing.surfaceM2,
      rooms: listing.rooms,
      description: listing.description,
      photosCount: listing.photos.length,
    },
    issues: review ? review.issues.map(reviewIssueText) : [],
    valueCents,
    notes,
  });
  // The reference in the log: the policy keeps the property of the log to its owner.
  const conversationId = await openConversation(
    supabase,
    profile.id,
    "admin",
    null,
    "rejection_reason",
  );
  if (!conversationId) return { ok: false, error: "unavailable" };
  if ((await logRequest(supabase, conversationId, `${listing.reference}\n\n${prompt}`)) !== "ok") {
    return { ok: false, error: "unavailable" };
  }
  const generation = await generateText(
    isAiMock()
      ? mockText("rejection_reason")
      : (request) =>
          createModelMessage(request, {
            timeout: SUGGESTION_SETTINGS.timeoutMs,
            maxRetries: SUGGESTION_SETTINGS.maxRetries,
          }),
    textRequest(MODELS.fast, system, prompt),
    { userId: profile.id, kind: "rejection_reason" },
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
  const text = cleanSuggestion(generation.text, REJECTION_DRAFT_MAX);
  if (breaksRules(text)) {
    console.error("[admin] rejection draft left out", {
      user_id: profile.id,
      entity_id: listingId,
    });
    return { ok: false, error: "unavailable" };
  }
  return text ? { ok: true, data: { text } } : { ok: false, error: "unavailable" };
}
