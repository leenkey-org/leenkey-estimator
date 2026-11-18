import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ModelCall } from "@/core/ai/client";
import type { TextCall } from "@/core/ai/generate";

// The model of the end-to-end tests (AI_MOCK=1, core/ai/client.ts): the same
// answer to the same conversation, no call to the API. It plays the
// scenarios of the tests: « description » (reads the properties and the
// listing of the conversation, or the first that may change, proposes one of
// two texts, not the current one, then says what happened), « prix » (5 000 €
// less), « visite » (invites the first contact of the property, or the one
// named after « visite à », on a new slot when the message gives « le
// 2026-12-05 à 10:30 »), anything else (one sentence). The buyer (L2-06) has its own
// scenarios (mockBuyerModel). The suggestions (L1-29) give one fixed text
// each.

/** The motive of a refusal drafted for the team (L1-30d). */
export const MOCK_REJECTION_REASON =
  "Motif proposé par l'assistant de test : nous ne pouvons pas publier votre annonce en l'état. " +
  "Ajoutez au moins six photos nettes de chaque pièce, puis renvoyez-la : nous la relisons à nouveau.";

/** The summary of a case before a call (L1-30d). */
export const MOCK_CASE_SUMMARY =
  "Situation : synthèse de l'assistant de test, d'après le dossier et ses notes.\n" +
  "Points à aborder : les tâches de Leenkey de l'étape en cours.\n" +
  "À éviter : rien de particulier.";

/** The summary of a listing on its public page (L2-05). */
export const MOCK_LISTING_SUMMARY =
  "Résumé de l'assistant de test : un bien présenté d'après sa fiche et sa description. " +
  "Ses caractéristiques sont reprises telles que le vendeur les a renseignées.";

export const MOCK_DESCRIPTIONS = [
  "Bien au calme, proche des commerces et des transports. Description proposée par l'assistant " +
    "de test : séjour lumineux, cuisine équipée, chambres et rangements. Chauffage individuel.",
  "Bien lumineux dans un quartier résidentiel. Seconde description de l'assistant de test : " +
    "pièces de vie ouvertes, cuisine séparée, chambres au calme, stationnement à proximité.",
] as const;

const detailsDescription = z.object({ listing: z.object({ description: z.string() }) });

/** The text of the last message of the person, and what followed it. */
function currentTurn(messages: readonly Anthropic.MessageParam[]) {
  let start = -1;
  let texts: string[] = [];
  messages.forEach((message, index) => {
    if (message.role !== "user") return;
    if (typeof message.content === "string") {
      start = index;
      texts = [message.content];
    } else if (message.content.every((block) => block.type === "text")) {
      start = index;
      texts = message.content.flatMap((block) => (block.type === "text" ? [block.text] : []));
    }
  });
  // The file of the seller first, then what they wrote.
  return {
    text: texts.at(-1) ?? "",
    file: texts.length > 1 ? texts[0] : "",
    after: messages.slice(start + 1),
  };
}

/** The last result of a tool in the turn, with the name of its call. */
function lastResult(after: readonly Anthropic.MessageParam[]) {
  const names = new Map<string, string>();
  let last: { name: string; content: string } | null = null;
  for (const message of after) {
    if (!Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block.type === "tool_use") names.set(block.id, block.name);
      if (block.type === "tool_result") {
        last = {
          name: names.get(block.tool_use_id) ?? "",
          content: typeof block.content === "string" ? block.content : "",
        };
      }
    }
  }
  return last;
}

const mockProperties = z.object({
  properties: z.array(
    z.object({
      propertyId: z.string(),
      priceEuros: z.number().nullable(),
      listingStatus: z.string().nullable(),
    }),
  ),
});

/** The property of the conversation, or the first whose listing may change (neither sold nor suspended). */
function firstListing(content: string, preferred: string | null) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  const read = mockProperties.safeParse(parsed);
  if (!read.success) return null;
  const changeable = read.data.properties.filter(
    (property) =>
      property.priceEuros !== null &&
      property.listingStatus !== "Vendu" &&
      property.listingStatus !== "Suspendue par Leenkey",
  );
  return changeable.find((property) => property.propertyId === preferred) ?? changeable[0] ?? null;
}

function message(content: Anthropic.ContentBlock[], stop: Anthropic.StopReason): Anthropic.Message {
  return {
    id: `msg_mock_${crypto.randomUUID()}`,
    type: "message",
    role: "assistant",
    model: "mock",
    container: null,
    diagnostics: null,
    stop_details: null,
    stop_reason: stop,
    stop_sequence: null,
    content,
    usage: {
      cache_creation: null,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      inference_geo: null,
      input_tokens: 10,
      output_tokens: 10,
      output_tokens_details: null,
      server_tool_use: null,
      service_tier: null,
      speed: null,
    },
  };
}

const text = (value: string): Anthropic.ContentBlock => ({
  type: "text",
  text: value,
  citations: null,
});

function call(name: string, input: Record<string, unknown>): Anthropic.ContentBlock {
  return {
    type: "tool_use",
    id: `toolu_mock_${crypto.randomUUID()}`,
    name,
    input,
    caller: { type: "direct" },
  };
}

/** The property the conversation is about, as the file of the seller names it. */
function conversationProperty(file: string): string | null {
  return /La conversation porte sur le bien ([0-9a-f-]{36})/.exec(file)?.[1] ?? null;
}

/** The listing the buyer is reading, as their file names it. */
function viewedListing(file: string): string | null {
  return /Annonce consultée en ce moment : ([0-9a-f-]{36})/.exec(file)?.[1] ?? null;
}

/** « 285 000 € », « 285000 euros »: the amount, in euros. */
function eurosIn(text: string): number | null {
  const match = /(\d[\d\s\u00A0\u202F]*)\s*(?:€|euros?)/i.exec(text);
  if (!match) return null;
  const value = Number(match[1].replace(/[\s\u00A0\u202F]/g, ""));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * A search as the model of the tests writes it down: the type, the rooms,
 * the commune after « à » and the budget, read from a few fixed turns of
 * phrase. Not the reading of the real model (tests/eval, `npm run ai:eval-search`).
 */
export function mockSearchRequest(asked: string) {
  const type = /appartement/i.test(asked)
    ? "appartement"
    : /maison/i.test(asked)
      ? "maison"
      : /terrain/i.test(asked)
        ? "terrain"
        : "any";
  const rooms = /(\d+)\s*pièces?/i.exec(asked);
  const place = /(?:^|\s)à\s+([A-ZÀ-Ý][\p{L}'’-]*(?: [A-ZÀ-Ý][\p{L}'’-]*)*)/u.exec(asked);
  return {
    location: place?.[1] ?? "",
    radiusKm: 0,
    propertyType: type,
    budgetMinEuros: 0,
    budgetMaxEuros: eurosIn(asked) ?? 0,
    surfaceMinM2: 0,
    surfaceMaxM2: 0,
    roomsMin: rooms ? Number(rooms[1]) : 0,
    bedroomsMin: 0,
    outdoor: [],
    parking: false,
    elevator: false,
    dpeMax: "any",
    sort: "recent",
  };
}

/**
 * The assistant of the buyer in the tests (L2-06): « cherche » (a search of
 * the listings), « offre » with an amount (the draft of an offer on the
 * listing being read), « équipe » (a request to the team), « bien » or
 * « annonce » (the listing being read), anything else (one sentence).
 */
const mockBuyerModel: ModelCall = async (request, { onText }) => {
  const { text: asked, file, after } = currentTurn(request.messages);
  const result = lastResult(after);
  const say = (value: string) => {
    onText(value);
    return message([text(value)], "end_turn");
  };
  const listingId = viewedListing(file);

  if (/équipe/i.test(asked)) {
    if (!result) {
      const summary = `Demande transmise par l'assistant : ${asked.slice(0, 200)}`;
      onText("Voici votre demande pour l'équipe Leenkey. ");
      return message(
        [
          text("Voici votre demande pour l'équipe Leenkey. "),
          call("create_case", { subject: "Demande d'un acquéreur", summary }),
        ],
        "tool_use",
      );
    }
    if (result.content.includes('"sent":true')) return say("C'est transmis à l'équipe Leenkey.");
    if (result.content.includes("cancelled")) return say("Très bien, je n'envoie rien.");
    return say("La demande n'a pas pu être envoyée.");
  }

  if (/offre/i.test(asked) && eurosIn(asked) !== null) {
    if (!result) {
      if (!listingId) return say("Dites-moi sur quelle annonce vous souhaitez faire une offre.");
      onText("Voici l'offre que je peux préparer. ");
      return message(
        [
          text("Voici l'offre que je peux préparer. "),
          call("prefill_offer", { listingId, priceEuros: eurosIn(asked) }),
        ],
        "tool_use",
      );
    }
    if (result.content.includes('"prefilled":true')) return say("Votre offre est préparée.");
    if (result.content.includes("cancelled")) return say("Très bien, je ne prépare rien.");
    if (result.content.includes("buying project")) {
      return say("Renseignez d'abord votre projet d'achat.");
    }
    return say("Votre offre n'a pas pu être préparée.");
  }

  if (/cherche/i.test(asked)) {
    if (!result) return message([call("search_listings", mockSearchRequest(asked))], "tool_use");
    const total = /"total":(\d+)/.exec(result.content)?.[1];
    if (!total) return say("La recherche n'a pas pu être lancée.");
    return say(
      total === "0"
        ? "Aucun bien ne correspond à cette recherche pour le moment."
        : `J'ai trouvé ${total} bien(s) pour cette recherche.`,
    );
  }

  if (/\b(bien|annonce)\b/i.test(asked) && listingId) {
    if (!result) return message([call("get_listing_public", { listingId })], "tool_use");
    const title = /"title":"([^"]*)"/.exec(result.content)?.[1];
    return say(title ? `Cette annonce : ${title}.` : "Cette annonce n'est plus en ligne.");
  }
  return say(`Réponse de test de l'assistant à : ${asked.slice(0, 80)}`);
};

export const mockModel: ModelCall = async (request, options) => {
  // The tools offered say who is asking: the buyer has search_listings.
  if (request.tools?.some((tool) => "name" in tool && tool.name === "search_listings")) {
    return mockBuyerModel(request, options);
  }
  const { onText } = options;
  const { text: asked, file, after } = currentTurn(request.messages);
  const result = lastResult(after);
  const say = (value: string) => {
    onText(value);
    return message([text(value)], "end_turn");
  };
  const wantsDescription = /description/i.test(asked);
  const wantsPrice = /prix/i.test(asked);

  // create_case (L1-31): « Je voudrais écrire à l'équipe Leenkey » ; about the
  // account, a request about no property.
  if (/équipe/i.test(asked)) {
    if (!result) return message([call("get_my_properties", {})], "tool_use");
    if (result.name === "get_my_properties") {
      const propertyId = /compte/i.test(asked)
        ? ""
        : (conversationProperty(file) ??
          /"propertyId":"([0-9a-f-]{36})"/.exec(result.content)?.[1] ??
          "");
      const summary = `Demande transmise par l'assistant : ${asked.slice(0, 200)}`;
      onText("Voici votre demande pour l'équipe Leenkey. ");
      return message(
        [
          text("Voici votre demande pour l'équipe Leenkey. "),
          call("create_case", { propertyId, subject: "Demande d'un vendeur", summary }),
        ],
        "tool_use",
      );
    }
    if (result.name === "create_case") {
      if (result.content.includes('"sent":true')) return say("C'est transmis à l'équipe Leenkey.");
      if (result.content.includes("cancelled")) return say("Très bien, je n'envoie rien.");
      if (result.content.includes("contact_advisor")) {
        return say("Votre formule comprend un conseiller : écrivez-lui plutôt.");
      }
      return say("La demande n'a pas pu être envoyée.");
    }
  }

  // contact_advisor (L1-34): « Transmettez ma question à mon conseiller ».
  if (/conseiller/i.test(asked)) {
    if (!result) return message([call("get_my_properties", {})], "tool_use");
    if (result.name === "get_my_properties") {
      const propertyId =
        conversationProperty(file) ?? /"propertyId":"([0-9a-f-]{36})"/.exec(result.content)?.[1];
      if (!propertyId) return say("Vous n'avez pas encore de bien.");
      const summary = `Question transmise par l'assistant : ${asked.slice(0, 200)}`;
      onText("Voici le message pour votre conseiller. ");
      return message(
        [
          text("Voici le message pour votre conseiller. "),
          call("contact_advisor", { propertyId, summary }),
        ],
        "tool_use",
      );
    }
    if (result.name === "contact_advisor") {
      if (result.content.includes('"sent":true')) return say("C'est transmis à votre conseiller.");
      if (result.content.includes("cancelled")) return say("Très bien, je n'envoie rien.");
      return say("Le message n'a pas pu être envoyé.");
    }
  }

  // summarize_offer (L2-07): « Que disent les offres reçues ? ».
  if (/offres? reçues?/i.test(asked)) {
    if (!result) return message([call("get_my_properties", {})], "tool_use");
    if (result.name === "get_my_properties") {
      const propertyId =
        conversationProperty(file) ?? /"propertyId":"([0-9a-f-]{36})"/.exec(result.content)?.[1];
      if (!propertyId) return say("Vous n'avez pas encore de bien.");
      return message([call("summarize_offer", { propertyId })], "tool_use");
    }
    if (result.name === "summarize_offer") {
      const total = /"total":(\d+)/.exec(result.content)?.[1];
      const price = /"offerPrice":"([^"]*)"/.exec(result.content)?.[1];
      if (!total) return say("Les offres n'ont pas pu être lues.");
      return say(
        total === "0"
          ? "Vous n'avez pas encore reçu d'offre pour ce bien."
          : `Vous avez reçu ${total} offre(s) pour ce bien. La plus récente propose ${price ?? "un prix"}.`,
      );
    }
  }

  // propose_visit_slot (L3-02): « Proposez une visite à Chloé » ; with « le
  // 2026-12-05 à 10:30 », on a new slot of 30 minutes.
  if (/visite/i.test(asked)) {
    if (!result) return message([call("get_my_properties", {})], "tool_use");
    if (result.name === "get_my_properties") {
      const propertyId =
        conversationProperty(file) ?? /"propertyId":"([0-9a-f-]{36})"/.exec(result.content)?.[1];
      if (!propertyId) return say("Vous n'avez pas encore de bien.");
      return message([call("summarize_contacts", { propertyId })], "tool_use");
    }
    if (result.name === "summarize_contacts") {
      const named = /visite à ([A-ZÀ-Ý][\p{L}'’-]*)/u.exec(asked)?.[1];
      const buyerFirstName = named ?? /"firstName":"([^"]+)"/.exec(result.content)?.[1];
      const propertyId = after
        .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
        .flatMap((block) =>
          block.type === "tool_use" && block.name === "summarize_contacts" ? [block.input] : [],
        )
        .map((value) => z.object({ propertyId: z.string() }).safeParse(value))
        .flatMap((read) => (read.success ? [read.data.propertyId] : []))
        .at(-1);
      if (!buyerFirstName || !propertyId) {
        return say("Aucun acquéreur ne vous a encore écrit pour ce bien.");
      }
      const slot = /(\d{4}-\d{2}-\d{2}) à (\d{2}:\d{2})/.exec(asked);
      const newSlot = slot ? { day: slot[1], time: slot[2], minutes: 30 } : null;
      onText("Voici l'invitation que je peux envoyer. ");
      return message(
        [
          text("Voici l'invitation que je peux envoyer. "),
          call("propose_visit_slot", { propertyId, buyerFirstName, newSlot }),
        ],
        "tool_use",
      );
    }
    if (result.name === "propose_visit_slot") {
      if (result.content.includes('"invited":true')) return say("L'invitation est envoyée.");
      if (result.content.includes("cancelled")) return say("Très bien, je n'envoie rien.");
      if (result.content.includes("no free slot")) {
        return say("Vous n'avez pas de créneau libre : indiquez-moi un jour et une heure.");
      }
      return say("L'invitation n'a pas pu être envoyée.");
    }
  }

  if (wantsDescription || wantsPrice) {
    const tool = wantsDescription ? "update_listing_description" : "update_listing_price";
    if (!result) return message([call("get_my_properties", {})], "tool_use");
    if (result.name === "get_my_properties") {
      const property = firstListing(result.content, conversationProperty(file));
      if (!property || property.priceEuros === null) {
        return say("Vous n'avez pas encore d'annonce à modifier.");
      }
      if (wantsDescription) {
        return message(
          [call("get_property_details", { propertyId: property.propertyId })],
          "tool_use",
        );
      }
      const input = { propertyId: property.propertyId, priceEuros: property.priceEuros - 5_000 };
      onText("Voici ma proposition. ");
      return message([text("Voici ma proposition. "), call(tool, input)], "tool_use");
    }
    if (result.name === "get_property_details") {
      let current = "";
      try {
        const details = detailsDescription.safeParse(JSON.parse(result.content));
        current = details.success ? details.data.listing.description.trim() : "";
      } catch {
        current = "";
      }
      const propertyId = /"propertyId":"([0-9a-f-]{36})"/.exec(result.content)?.[1] ?? "";
      const description =
        current === MOCK_DESCRIPTIONS[0] ? MOCK_DESCRIPTIONS[1] : MOCK_DESCRIPTIONS[0];
      onText("Voici ma proposition. ");
      return message(
        [text("Voici ma proposition. "), call(tool, { propertyId, description })],
        "tool_use",
      );
    }
    if (result.name === tool) {
      if (result.content.includes('"updated":true')) {
        return say("C'est fait : votre annonce est à jour.");
      }
      if (result.content.includes("cancelled")) return say("Très bien, je ne change rien.");
      return say("La modification n'a pas pu être faite.");
    }
  }
  return say(`Réponse de test de l'assistant à : ${asked.slice(0, 80)}`);
};

/**
 * The assistant of the public site in the tests (DECISIONS.md 2026-11-07):
 * one sentence, whatever is asked; never a tool (it has none).
 */
export const mockVisitorModel: ModelCall = async (request, { onText }) => {
  const asked = currentTurn(request.messages).text;
  const answer = `Réponse de test de l'assistant du site à : ${asked.slice(0, 80)}`;
  onText(answer);
  return message([text(answer)], "end_turn");
};

/** The reply suggested by the model of the tests (messaging, L1-29). */
export const MOCK_REPLY =
  "Bonjour, merci pour votre message. Je vérifie ce point et je reviens vers vous rapidement avec une réponse précise.";

/** The description drafted by the model of the tests (price step, L1-29). */
export const MOCK_LISTING_DESCRIPTION =
  "Proposition de description de l'assistant de test. Le bien se compose d'un séjour, d'une cuisine " +
  "et de chambres réparties de part et d'autre d'un dégagement.\n\nLes caractéristiques indiquées par le " +
  "vendeur sont reprises sans rien ajouter : surface, nombre de pièces, étage, chauffage et classes du DPE.";

/** The suggestions of the tests: the same text for the same kind, no call to the API. */
export function mockText(
  kind:
    | "reply_suggestion"
    | "listing_description"
    | "rejection_reason"
    | "case_summary"
    | "listing_summary",
): TextCall {
  const answer = {
    reply_suggestion: MOCK_REPLY,
    listing_description: MOCK_LISTING_DESCRIPTION,
    rejection_reason: MOCK_REJECTION_REASON,
    case_summary: MOCK_CASE_SUMMARY,
    listing_summary: MOCK_LISTING_SUMMARY,
  }[kind];
  return async () => message([text(answer)], "end_turn");
}
