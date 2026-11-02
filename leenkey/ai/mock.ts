import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ModelCall } from "@/core/ai/client";

// The model of the end-to-end tests (AI_MOCK=1, core/ai/client.ts): the same
// answer to the same conversation, no call to the API. It plays the
// scenarios of the tests: « description » (reads the properties and the
// listing of the conversation, or the first that may change, proposes one of
// two texts, not the current one, then says what happened), « prix » (5 000 €
// less), anything else (one sentence).

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

export const mockModel: ModelCall = async (request, { onText }) => {
  const { text: asked, file, after } = currentTurn(request.messages);
  const result = lastResult(after);
  const say = (value: string) => {
    onText(value);
    return message([text(value)], "end_turn");
  };
  const wantsDescription = /description/i.test(asked);
  const wantsPrice = /prix/i.test(asked);

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
