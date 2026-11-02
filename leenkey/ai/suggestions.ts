import "server-only";
import { createModelMessage, isAiConfigured, isAiMock } from "@/core/ai/client";
import { toStoredBlocks } from "@/core/ai/conversation";
import { generateText, textRequest } from "@/core/ai/generate";
import { searchKnowledge } from "@/core/ai/knowledge";
import { logAnswer, logRequest, openConversation, type LogKind } from "@/core/ai/log";
import { MODELS } from "@/core/ai/models";
import { promptFile } from "@/core/ai/prompts";
import type { SessionProfile } from "@/core/auth/session";
import { getConversation } from "@/leenkey/messaging/queries";
import type { SellerProperty } from "@/leenkey/properties/queries";
import { fr } from "@/lib/i18n/fr";
import { LISTING_DESCRIPTION_MAX, textLength } from "@/lib/validations/listing";
import { createClient } from "@/lib/supabase/server";
import { consumeQuota } from "./assistant";
import { mockText } from "./mock";
import { sellerHasPaidPlan, sellerPropertyById } from "./seller-data";
import type { SuggestionError, SuggestionResult } from "./types";

// The suggestions of the assistant (L1-29, SPEC-V2 sections 8.3, 8.6 and 12):
// a reply to a buyer in the messaging, a description of a listing at the
// price step. One call of MODELS.fast each, not streamed, with its prompt
// (core/ai/prompts/reply-suggestion.md, listing-description.md), written from
// what the seller may read with their session (RLS). Nothing is written but
// the log: the seller reads the text in an AssistantSuggestion and decides.
// Each suggestion counts as a message of the assistant for the day (it calls
// the model) and is logged with its tokens, under its own kind.

type Supabase = Awaited<ReturnType<typeof createClient>>;
type SuggestionKind = Exclude<LogKind, "chat">;

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

/** What the model writes a reply from: the property, the FAQ, the conversation. */
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
  const buyer = buyerFirstName ? `Acquéreur (${asData(buyerFirstName, 60)})` : "Acquéreur";
  const author = { seller: "Vendeur", buyer, leenkey: "Leenkey" } as const;
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
      `[${author[message.author]}, ${when.format(new Date(message.createdAt))}]`,
      asData(message.body, MESSAGE_CHARS),
      "",
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

/**
 * One suggestion: counted against the limit of the day (`counted`: the
 * person; null within a turn of the assistant, already counted), written by
 * the model from its prompt, logged.
 */
async function suggest({
  supabase,
  profileId,
  counted,
  kind,
  propertyId,
  prompt,
  max,
}: {
  supabase: Supabase;
  profileId: string;
  counted: SessionProfile | null;
  kind: SuggestionKind;
  propertyId: string;
  prompt: string;
  max: number;
}): Promise<SuggestionResult> {
  if (!isAiConfigured()) return { ok: false, error: "unavailable" };
  if (counted) {
    const paid = await sellerHasPaidPlan(counted.id);
    if (paid === null) return { ok: false, error: "unavailable" };
    const quota = await consumeQuota(supabase, counted, paid);
    if (!quota.ok) return { ok: false, error: quota.error === "quota" ? "quota" : "unavailable" };
  }

  const conversationId = await openConversation(supabase, profileId, "seller", propertyId, kind);
  if (!conversationId) return { ok: false, error: "unavailable" };
  if ((await logRequest(supabase, conversationId, prompt)) !== "ok") {
    return { ok: false, error: "unavailable" };
  }
  const system = promptFile(
    kind === "reply_suggestion" ? "reply-suggestion" : "listing-description",
  );
  const generation = await generateText(
    isAiMock() ? mockText(kind) : createModelMessage,
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
  if (!conversation || conversation.role !== "seller" || !conversation.listingId) {
    return { ok: false, error: "not_found" };
  }
  if (conversation.closed) return { ok: false, error: "nothing" };

  const supabase = await createClient();
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
    query: Array.from(lastFromBuyer.body.trim()).slice(0, 500).join(""),
    audience: "seller",
    limit: REPLY_CARDS,
  });
  if (!cards.ok) {
    console.error("[ai] reply cards unavailable", { user_id: profile.id, error: cards.error });
  }
  const prompt = replyPrompt({
    facts: propertyFacts(property.data, { withPrice: true }),
    cards: cards.ok ? cards.data : [],
    messages,
    buyerFirstName: conversation.counterpartFirstName,
  });
  return suggest({
    supabase,
    profileId: profile.id,
    counted: profile,
    kind: "reply_suggestion",
    propertyId: property.data.id,
    prompt,
    max: REPLY_MAX,
  });
}

/**
 * A description of the listing of a property of the seller (SPEC 8.3, 12):
 * its characteristics, its features and notes (what the seller already wrote
 * in the field, or asked the assistant to stress). Nothing written: the price
 * step keeps the text until « Enregistrer »; the assistant proposes it with
 * update_listing_description. `counted`: the person whose limit of the day it
 * counts against; null within a turn of the assistant (already counted).
 */
export async function draftListingDescription({
  profileId,
  counted,
  propertyId,
  notes,
}: {
  profileId: string;
  counted: SessionProfile | null;
  propertyId: string;
  notes: string;
}): Promise<SuggestionResult> {
  const property = await sellerPropertyById(profileId, propertyId);
  if (!property.ok) return { ok: false, error: "unavailable" };
  if (!property.data) return { ok: false, error: "not_found" };
  const supabase = await createClient();
  return suggest({
    supabase,
    profileId,
    counted,
    kind: "listing_description",
    propertyId: property.data.id,
    prompt: descriptionPrompt({
      facts: propertyFacts(property.data, { withPrice: false }),
      notes,
    }),
    max: LISTING_DESCRIPTION_MAX,
  });
}
