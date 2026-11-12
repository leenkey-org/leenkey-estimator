import "server-only";
import { createModelMessage, isAiConfigured, isAiMock } from "@/core/ai/client";
import { toStoredBlocks } from "@/core/ai/conversation";
import { generateText, textRequest } from "@/core/ai/generate";
import { KNOWLEDGE_QUERY_MAX, searchKnowledge } from "@/core/ai/knowledge";
import { logAnswer, logRequest, openConversation } from "@/core/ai/log";
import { MODELS, SUGGESTION_SETTINGS } from "@/core/ai/models";
import { promptFile } from "@/core/ai/prompts";
import type { SessionProfile } from "@/core/auth/session";
import { getConversation } from "@/leenkey/messaging/queries";
import type { SellerProperty } from "@/leenkey/properties/queries";
import { frProperties } from "@/lib/i18n/sections/properties";
import { frPropertyType } from "@/lib/i18n/sections/propertyType";
import { LISTING_DESCRIPTION_MAX, textLength } from "@/lib/validations/listing";
import { createClient } from "@/lib/supabase/server";
import { consumeQuota } from "./assistant";
import { mockText } from "./mock";
import { sellerHasPaidPlan, sellerPropertyById } from "./seller-data";
import type { SuggestionError, SuggestionResult } from "./types";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { properties: frProperties, propertyType: frPropertyType } as const;

// The suggestions of the assistant (L1-29, SPEC-V2 sections 8.3, 8.6 and 12):
// a reply to a buyer in the messaging, a description of a listing at the
// price step. One call of MODELS.fast each, not streamed, with its prompt
// (core/ai/prompts/reply-suggestion.md, listing-description.md), written from
// what the seller may read with their session (RLS). Nothing is written but
// the log: the seller reads the text in an AssistantSuggestion and decides.
// Each suggestion counts as a message of the assistant for the day (it calls
// the model), once the access is checked and before anything costly, and is
// logged with its tokens, under its own kind.

type Supabase = Awaited<ReturnType<typeof createClient>>;
/** The kinds of log of the suggestions (ai_conversations.kind). */
export type SuggestionKind = "reply_suggestion" | "listing_description";

export type { SuggestionError, SuggestionResult };

/** The messages of the conversation the model reads (SPEC 12: the last 10). */
export const REPLY_MESSAGES = 10;
/** The cards of the FAQ given with a reply, closest to the last message first. */
export const REPLY_CARDS = 3;
/** 80 words at most (SPEC 12), a few more characters kept for safety. */
export const REPLY_MAX = 800;
/** A message as the model reads it. */
const MESSAGE_CHARS = 1_500;
/** The text the seller typed in the description field, as the model reads it. */
const NOTES_CHARS = LISTING_DESCRIPTION_MAX;

/** A text written by someone, given as data: no tag, bounded. */
export function asData(value: string, max: number): string {
  return Array.from(value.replace(/[<>]/g, "").trim()).slice(0, max).join("");
}

/** A value given in an attribute of a tag: no tag, no quote, one line. */
export function asAttribute(value: string, max: number): string {
  return asData(value.replace(/["\s]+/g, " "), max);
}

const number = (value: number) => new Intl.NumberFormat("fr-FR").format(value);
const euros = (value: number) => `${number(value)} €`;

/**
 * The property as its public listing shows it: never its street address, a
 * line per fact given, nothing for a fact not given.
 */
export function propertyFacts(property: SellerProperty, { withPrice }: { withPrice: boolean }) {
  const c = property.characteristics;
  const labels = fr.properties.characteristics;
  const land = c.type === "terrain";
  const lines = [
    `Type : ${fr.propertyType[c.type ?? "autre"]}`,
    `Commune : ${asData(property.address.city, 100)} (${asData(property.address.postalCode, 10)})`,
  ];
  const add = (label: string, value: string | null) => {
    if (value !== null) lines.push(`${label} : ${value}`);
  };
  add(
    land ? labels.landSurface : labels.surface,
    c.surfaceM2 === null ? null : `${number(c.surfaceM2)} m²`,
  );
  add(labels.carrez, c.carrezM2 === null ? null : `${number(c.carrezM2)} m²`);
  if (!land) {
    add(labels.rooms, c.rooms === null ? null : String(c.rooms));
    add(labels.bedrooms, c.bedrooms === null ? null : String(c.bedrooms));
    add(
      labels.floor,
      c.floor === null
        ? null
        : c.floor === 0
          ? "rez-de-chaussée"
          : c.floorsTotal === null
            ? String(c.floor)
            : `${c.floor} sur ${c.floorsTotal}`,
    );
    add(labels.buildYear, c.buildYear === null ? null : String(c.buildYear));
    if (c.isNewBuild) lines.push("Construction neuve");
    add(labels.heating, c.heating);
    add(labels.dpe, c.dpe === null ? null : `classe ${c.dpe}`);
    add(labels.ges, c.ges === null ? null : `classe ${c.ges}`);
    add("Exposition", property.orientation === null ? null : asData(property.orientation, 60));
  }
  add(
    labels.features,
    c.features.length === 0 ? null : c.features.map((f) => labels.featureLabels[f]).join(", "),
  );
  add(
    labels.charges,
    c.chargesMonthlyEuros === null ? null : `${euros(c.chargesMonthlyEuros)} par mois`,
  );
  add(
    labels.tax,
    c.propertyTaxYearlyEuros === null ? null : `${euros(c.propertyTaxYearlyEuros)} par an`,
  );
  add(labels.lots, c.coproLots === null ? null : String(c.coproLots));
  const listing = property.listing;
  if (withPrice && listing) {
    add("Titre de l'annonce", asData(listing.title, 120));
    add("Prix affiché", euros(listing.priceCents / 100));
    add("Description de l'annonce", asData(listing.description, LISTING_DESCRIPTION_MAX) || null);
  }
  return lines.join("\n");
}

const when = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export type ReplyMessage = {
  /** Who wrote it, for the seller: themselves, the buyer, or Leenkey (a system message). */
  author: "seller" | "buyer" | "leenkey";
  body: string;
  createdAt: string;
};

/**
 * What the model writes a reply from: the property, the FAQ, the
 * conversation. Each message in its tag, its author and date in attributes
 * the text cannot hold: a message that claims to be the seller's stays the
 * buyer's (core/ai/prompts/reply-suggestion.md).
 */
export function replyPrompt({
  facts,
  cards,
  messages,
  buyerFirstName,
}: {
  facts: string;
  cards: readonly { question: string; answer: string }[];
  messages: readonly ReplyMessage[];
  buyerFirstName: string | null;
}): string {
  const buyer = buyerFirstName ? `acquéreur (${asAttribute(buyerFirstName, 60)})` : "acquéreur";
  const author = { seller: "vendeur", buyer, leenkey: "Leenkey" } as const;
  const parts = ["<bien>", facts, "</bien>"];
  if (cards.length > 0) {
    parts.push("", "<faq>");
    for (const card of cards) {
      parts.push(
        "<fiche>",
        `Question : ${card.question.trim()}`,
        `Réponse : ${card.answer.trim()}`,
        "</fiche>",
      );
    }
    parts.push("</faq>");
  }
  parts.push("", "<conversation>");
  for (const message of messages) {
    parts.push(
      `<message auteur="${author[message.author]}" date="${when.format(new Date(message.createdAt))}">`,
      asData(message.body, MESSAGE_CHARS),
      "</message>",
    );
  }
  parts.push(
    "</conversation>",
    "",
    "Rédige la réponse du vendeur au dernier message de l'acquéreur.",
  );
  return parts.join("\n");
}

/** What the model writes a description from: the property and the notes of the seller. */
export function descriptionPrompt({ facts, notes }: { facts: string; notes: string }): string {
  return [
    "<bien>",
    facts,
    "</bien>",
    "",
    "<notes_du_vendeur>",
    asData(notes, NOTES_CHARS) || "Aucune.",
    "</notes_du_vendeur>",
    "",
    "Rédige la description de l'annonce de ce bien.",
  ].join("\n");
}

const QUOTES: Record<string, string> = { "«": "»", "“": "”", '"': '"' };

/**
 * The text as the seller reads it: without the quotes or the bold the model
 * may add, two line breaks at most, and within its field: cut after the last
 * sentence that fits.
 */
export function cleanSuggestion(text: string, max: number): string {
  let value = text
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*|__/g, "")
    .trim();
  const close = QUOTES[value[0] ?? ""];
  if (close && value.length > 1 && value.endsWith(close)) value = value.slice(1, -1).trim();
  value = value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  if (textLength(value) <= max) return value;
  const kept = Array.from(value).slice(0, max).join("");
  const end = Math.max(...[". ", ".\n", "! ", "? "].map((mark) => kept.lastIndexOf(mark)));
  return (end > max / 2 ? kept.slice(0, end + 1) : kept).trim();
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE = /(?:\+33\s*|\b0)[1-9](?:[\s.-]*\d{2}){4}\b/;

/**
 * A text the prompt forbids, checked again in code: a phone number or an
 * email (the exchange stays in the messaging), « Prix ferme » (CLAUDE.md 16).
 * Such a text is never shown.
 */
export function breaksRules(text: string): boolean {
  return EMAIL.test(text) || PHONE.test(text) || /prix\s+ferme/i.test(text);
}

/** The first characters of a text within `max` units of JavaScript (a search takes 500). */
export function firstUnits(text: string, max: number): string {
  let kept = "";
  for (const char of text) {
    if (kept.length + char.length > max) break;
    kept += char;
  }
  return kept;
}

/** The rules of a kind of suggestion; null when the file cannot be read (logged). */
function systemOf(kind: SuggestionKind, userId: string): string | null {
  try {
    return promptFile(kind === "reply_suggestion" ? "reply-suggestion" : "listing-description");
  } catch (error) {
    console.error("[ai] prompt unreadable", {
      user_id: userId,
      kind,
      error: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

/**
 * One suggestion counted against the limit of the day of the person (each
 * calls the model), once its access is checked and before any costly read.
 */
async function count(
  supabase: Supabase,
  profile: SessionProfile,
): Promise<{ ok: true } | { ok: false; error: SuggestionError }> {
  if (!isAiConfigured()) return { ok: false, error: "unavailable" };
  const paid = await sellerHasPaidPlan(profile.id);
  if (paid === null) return { ok: false, error: "unavailable" };
  const quota = await consumeQuota(supabase, profile, paid);
  if (!quota.ok) return { ok: false, error: quota.error === "quota" ? "quota" : "unavailable" };
  return { ok: true };
}

/** One call of the model, for a suggestion (not the 60 s and 2 retries of the chat). */
const callModel = (request: Parameters<typeof createModelMessage>[0]) =>
  createModelMessage(request, {
    timeout: SUGGESTION_SETTINGS.timeoutMs,
    maxRetries: SUGGESTION_SETTINGS.maxRetries,
  });

/** A suggestion already counted: written by the model from its prompt, logged. */
async function write({
  supabase,
  profileId,
  kind,
  propertyId,
  system,
  prompt,
  max,
}: {
  supabase: Supabase;
  profileId: string;
  kind: SuggestionKind;
  propertyId: string;
  system: string;
  prompt: string;
  max: number;
}): Promise<SuggestionResult> {
  const conversationId = await openConversation(supabase, profileId, "seller", propertyId, kind);
  if (!conversationId) return { ok: false, error: "unavailable" };
  if ((await logRequest(supabase, conversationId, prompt)) !== "ok") {
    return { ok: false, error: "unavailable" };
  }
  const generation = await generateText(
    isAiMock() ? mockText(kind) : callModel,
    textRequest(MODELS.fast, system, prompt),
    { userId: profileId, kind },
  );
  if (generation.message) {
    const { message } = generation;
    const logged = await logAnswer(supabase, conversationId, {
      blocks: toStoredBlocks(message.content),
      stopReason: message.stop_reason,
      model: message.model,
      usage: message.usage,
    });
    // Every call of the model is kept for the admin (CLAUDE.md section 8).
    if (logged !== "ok") return { ok: false, error: "unavailable" };
  }
  if (!generation.ok) return { ok: false, error: generation.error };
  const text = cleanSuggestion(generation.text, max);
  if (breaksRules(text)) {
    console.error("[ai] suggestion left out", { user_id: profileId, kind });
    return { ok: false, error: "unavailable" };
  }
  return text ? { ok: true, data: { text } } : { ok: false, error: "unavailable" };
}

/**
 * A reply to the buyer of a conversation (SPEC 8.6), for its seller only:
 * the last 10 messages, the property as its listing shows it, the cards of
 * the FAQ closest to the last message of the buyer.
 */
export async function suggestReply(
  profile: SessionProfile,
  conversationId: string,
): Promise<SuggestionResult> {
  const found = await getConversation(conversationId);
  if (!found.ok) return { ok: false, error: "unavailable" };
  const conversation = found.data;
  // A buyer's conversation only: never the one with the adviser (L1-34).
  if (!conversation || conversation.role !== "seller" || conversation.kind !== "listing") {
    return { ok: false, error: "not_found" };
  }
  if (conversation.closed) return { ok: false, error: "nothing" };
  const system = systemOf("reply_suggestion", profile.id);
  if (!system) return { ok: false, error: "unavailable" };

  const supabase = await createClient();
  const counted = await count(supabase, profile);
  if (!counted.ok) return counted;

  const [rows, property] = await Promise.all([
    supabase
      .from("messages")
      .select("sender_id, body, kind, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(REPLY_MESSAGES),
    sellerPropertyById(profile.id, conversation.propertyId),
  ]);
  if (rows.error || !property.ok) {
    if (rows.error) {
      console.error("[ai] messages read failed", {
        user_id: profile.id,
        entity_id: conversationId,
        code: rows.error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  if (!property.data) return { ok: false, error: "not_found" };
  const messages: ReplyMessage[] = rows.data.reverse().map((row) => ({
    author: row.kind !== "text" ? "leenkey" : row.sender_id === profile.id ? "seller" : "buyer",
    body: row.body,
    createdAt: row.created_at,
  }));
  const lastFromBuyer = [...messages].reverse().find((message) => message.author === "buyer");
  if (!lastFromBuyer) return { ok: false, error: "nothing" };

  // The FAQ helps on a step of the sale; without it, the reply still comes.
  const cards = await searchKnowledge({
    query: firstUnits(lastFromBuyer.body.trim(), KNOWLEDGE_QUERY_MAX),
    audience: "seller",
    limit: REPLY_CARDS,
  });
  if (!cards.ok) {
    console.error("[ai] reply cards unavailable", { user_id: profile.id, error: cards.error });
  }
  return write({
    supabase,
    profileId: profile.id,
    kind: "reply_suggestion",
    propertyId: property.data.id,
    system,
    prompt: replyPrompt({
      facts: propertyFacts(property.data, { withPrice: true }),
      cards: cards.ok ? cards.data : [],
      messages,
      buyerFirstName: conversation.counterpartFirstName,
    }),
    max: REPLY_MAX,
  });
}

/**
 * A description of the listing of a property of the seller (SPEC 8.3, 12):
 * its characteristics, its features and notes (what the seller already wrote
 * in the field, or asked the assistant to stress). Nothing written: the price
 * step keeps the text until « Enregistrer »; the assistant proposes it with
 * update_listing_description. Counted against the limit of the day each
 * time, from the price step as from a turn of the assistant (each calls the
 * model once more).
 */
export async function draftListingDescription({
  profile,
  propertyId,
  notes,
}: {
  profile: SessionProfile;
  propertyId: string;
  notes: string;
}): Promise<SuggestionResult> {
  const system = systemOf("listing_description", profile.id);
  if (!system) return { ok: false, error: "unavailable" };
  const property = await sellerPropertyById(profile.id, propertyId);
  if (!property.ok) return { ok: false, error: "unavailable" };
  if (!property.data) return { ok: false, error: "not_found" };
  const supabase = await createClient();
  const counted = await count(supabase, profile);
  if (!counted.ok) return counted;
  return write({
    supabase,
    profileId: profile.id,
    kind: "listing_description",
    propertyId: property.data.id,
    system,
    prompt: descriptionPrompt({
      facts: propertyFacts(property.data, { withPrice: false }),
      notes,
    }),
    max: LISTING_DESCRIPTION_MAX,
  });
}
