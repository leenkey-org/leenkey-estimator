import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createModelMessage, isAiConfigured, isAiMock } from "@/core/ai/client";
import { toStoredBlocks } from "@/core/ai/conversation";
import { generateText, textRequest, type TextCall } from "@/core/ai/generate";
import { answerRow } from "@/core/ai/log";
import { MODELS } from "@/core/ai/models";
import { promptFile } from "@/core/ai/prompts";
import { mockText } from "@/leenkey/ai/mock";
import { asData, breaksRules, cleanSuggestion } from "@/leenkey/ai/suggestions";
import { frPropertyType } from "@/lib/i18n/sections/propertyType";
import { createPublicClient } from "@/lib/supabase/public";
import { LISTING_DESCRIPTION_MAX } from "@/lib/validations/listing";
import type { Database } from "@/types/database";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { propertyType: frPropertyType } as const;

// The summary of a listing by the assistant (L2-05, SPEC-V2 8.4 point 8): two
// factual sentences on its public page, written when it goes online and
// again at each change of what it says. The database asks for it
// (listings.summary_requested_at, set by its triggers); the scheduled task
// writes it here, with the service role: never the seller, who could
// otherwise type their own « Résumé par l'assistant ». The model reads what
// the public reads of the listing and nothing else (the view public_listings,
// with the public key): never an address, never a name. One call of
// MODELS.fast per listing, logged with its tokens under the kind
// 'listing_summary', in the name of the owner of the listing; it counts for
// no quota (nobody asked).

/** The service client of the scheduled task (given by its route, never imported here). */
type Admin = SupabaseClient<Database>;
type PublicRow = Database["public"]["Views"]["public_listings"]["Row"];

/** Listings summarised by one run: the route has a minute. */
export const SUMMARY_BATCH = 6;
/** No new call of the model after this long in a run. */
const RUN_BUDGET_MS = 40_000;
/**
 * One call: 12 s, no retry. The last call of a run starts before 40 s and
 * ends before 52 s: within the minute of the route and the 55 s pg_net waits.
 * A listing whose call timed out is taken again by the next run.
 */
const CALL = { timeout: 12_000, maxRetries: 0 } as const;
/** 300 characters asked of the model, a few more kept. */
export const SUMMARY_MAX = 340;

const COLUMNS =
  "id, title, description, type, city, district, surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total, has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar, orientation, build_year, is_new_build, dpe_class, ges_class, heating, copro_lots" as const;

export type SummaryRow = Pick<
  PublicRow,
  | "id"
  | "title"
  | "description"
  | "type"
  | "city"
  | "district"
  | "surface_m2"
  | "carrez_m2"
  | "rooms"
  | "bedrooms"
  | "floor"
  | "floors_total"
  | "has_elevator"
  | "has_balcony"
  | "has_terrace"
  | "has_garden"
  | "has_parking"
  | "has_cellar"
  | "orientation"
  | "build_year"
  | "is_new_build"
  | "dpe_class"
  | "ges_class"
  | "heating"
  | "copro_lots"
>;

const number = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

/**
 * What the model summarises: the listing as the public reads it, a line per
 * fact given, the title and the description as data. Never its price (shown
 * beside the summary), never an address.
 */
export function listingSummaryPrompt(row: SummaryRow): string {
  const land = row.type === "terrain";
  const lines = [`Type : ${fr.propertyType[row.type ?? "autre"]}`];
  const add = (label: string, value: string | null) => {
    if (value !== null && value !== "") lines.push(`${label} : ${value}`);
  };
  add("Commune", row.city === null ? null : asData(row.city, 100));
  add("Quartier", row.district === null ? null : asData(row.district, 100));
  add(
    land ? "Surface du terrain" : "Surface",
    row.surface_m2 === null ? null : `${number(row.surface_m2)} m²`,
  );
  add("Surface Carrez", row.carrez_m2 === null ? null : `${number(row.carrez_m2)} m²`);
  if (!land) {
    add("Pièces", row.rooms === null ? null : String(row.rooms));
    add("Chambres", row.bedrooms === null ? null : String(row.bedrooms));
    add(
      "Étage",
      row.floor === null
        ? null
        : row.floor === 0
          ? "rez-de-chaussée"
          : row.floors_total === null
            ? String(row.floor)
            : `${row.floor} sur ${row.floors_total}`,
    );
    add("Année de construction", row.build_year === null ? null : String(row.build_year));
    if (row.is_new_build) lines.push("Construction neuve");
    add("Chauffage", row.heating === null ? null : asData(row.heating, 80));
    add("Classe du DPE", row.dpe_class);
    add("Classe du GES", row.ges_class);
    add("Exposition", row.orientation === null ? null : asData(row.orientation, 60));
    add("Lots de la copropriété", row.copro_lots === null ? null : String(row.copro_lots));
  }
  const features = [
    row.has_elevator ? "ascenseur" : null,
    row.has_balcony ? "balcon" : null,
    row.has_terrace ? "terrasse" : null,
    row.has_garden ? "jardin" : null,
    row.has_parking ? "stationnement" : null,
    row.has_cellar ? "cave" : null,
  ].filter((feature) => feature !== null);
  add("Équipements", features.length > 0 ? features.join(", ") : null);
  return [
    "<fiche>",
    lines.join("\n"),
    "</fiche>",
    `<titre>${asData(row.title ?? "", 120)}</titre>`,
    `<description>${asData(row.description ?? "", LISTING_DESCRIPTION_MAX)}</description>`,
  ].join("\n");
}

/**
 * What a summary never says, checked in code after the prompt: the title and
 * the description of a listing are typed by its seller, who could ask the
 * model for a text Leenkey would seem to sign.
 */
const FORBIDDEN: readonly RegExp[] = [
  // A link, a handle, a long number (a phone number without its spaces).
  /(?:https?:\/\/|www\.)\S+/i,
  /@\w/,
  /\d{5,}/,
  // The name of the platform, a guarantee, a check: never claimed by a summary.
  /leenkey/i,
  /garanti|v[ée]rifi[ée]|certifi[ée]|valid[ée]|agr[ée]{2}|officiel|labellis/i,
  // An amount: the price is shown beside the summary, by the page.
  /€|\beuros?\b/i,
  // A street address.
  /\b\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|boulevard|bd|all[ée]e|impasse|chemin|place|route|quai|cours|square|passage)\b/i,
  /\p{Extended_Pictographic}/u,
];

/**
 * The summary as the page shows it: one paragraph of plain text, its first
 * two sentences, whole. Null (such a text is never shown) when it breaks a
 * rule of the prompt (a phone number, an email, « Prix ferme », and what
 * FORBIDDEN lists), when it has no whole sentence, or when two sentences do
 * not fit its length: never a text cut in the middle of a word.
 */
export function cleanSummary(text: string): string | null {
  const plain = cleanSuggestion(text.replace(/[*_#`]/g, ""), Number.MAX_SAFE_INTEGER)
    .replace(/\s+/g, " ")
    .trim();
  // A sentence ends with its mark, followed by a space or the end (« 68.5 m² »
  // is not two sentences). The first two, as long as each one is whole.
  const parts = plain.split(/(?<=[.!?])\s+/);
  const whole: string[] = [];
  for (const part of parts.slice(0, 2)) {
    if (!/[.!?]$/.test(part)) break;
    whole.push(part);
  }
  const value = whole.join(" ");
  if (value === "" || Array.from(value).length > SUMMARY_MAX) return null;
  if (breaksRules(value) || FORBIDDEN.some((pattern) => pattern.test(value))) return null;
  return value;
}

export type SummaryRun = {
  /** Summaries written. */
  written: number;
  /** Requests closed without a summary (not online any more, a text refused or left out). */
  dropped: number;
  /** Requests left for the next run (the model could not be reached, the listing changed meanwhile). */
  left: number;
  skipped?: "not_configured";
};

/**
 * Writes the summaries asked for, the oldest request first. `call` is the
 * model (the scripted one of the tests); the public client reads what the
 * model is given.
 */
export async function summarizeListings(
  admin: Admin,
  options: { call?: TextCall; now?: () => number } = {},
): Promise<SummaryRun> {
  const run: SummaryRun = { written: 0, dropped: 0, left: 0 };
  if (!options.call && !isAiConfigured()) return { ...run, skipped: "not_configured" };
  const now = options.now ?? Date.now;
  const started = now();

  const pending = await admin
    .from("listings")
    .select("id, property_id, summary_requested_at, property:properties!inner(owner_id)")
    .eq("status", "published")
    .not("summary_requested_at", "is", null)
    .order("summary_requested_at")
    .limit(SUMMARY_BATCH);
  if (pending.error) throw new Error(`listings: ${pending.error.code}`);
  if (pending.data.length === 0) return run;

  const system = promptFile("listing-summary");
  const facts = await createPublicClient()
    .from("public_listings")
    .select(COLUMNS)
    .in(
      "id",
      pending.data.map((listing) => listing.id),
    );
  if (facts.error) throw new Error(`public_listings: ${facts.error.code}`);
  const byId = new Map(facts.data.map((row) => [row.id, row]));

  const call: TextCall =
    options.call ??
    (isAiMock() ? mockText("listing_summary") : (request) => createModelMessage(request, CALL));

  for (const listing of pending.data) {
    const asked = listing.summary_requested_at;
    if (asked === null) continue;
    /** Writes the summary (or none) and closes the request, unless a later one came. */
    const close = async (summary: string | null) => {
      const { data, error } = await admin
        .from("listings")
        .update({ summary, summary_requested_at: null })
        .eq("id", listing.id)
        .eq("summary_requested_at", asked)
        .select("id");
      if (error) {
        console.error("[listings] summary not written", {
          entity_id: listing.id,
          code: error.code,
        });
        return false;
      }
      return data.length > 0;
    };

    const row = byId.get(listing.id);
    // Not read by the public (its owner suspended, deleted…): nothing to
    // summarise; it is asked for again when the listing comes back online.
    if (!row) {
      if (await close(null)) run.dropped += 1;
      else run.left += 1;
      continue;
    }
    if (now() - started > RUN_BUDGET_MS) {
      run.left += 1;
      continue;
    }

    const ownerId = listing.property.owner_id;
    const prompt = listingSummaryPrompt(row);
    const generation = await generateText(call, textRequest(MODELS.fast, system, prompt), {
      userId: ownerId,
      kind: "listing_summary",
    });
    // Its tokens are billed whatever came of it: logged, in the name of the owner.
    if (generation.message) {
      await logSummary(admin, {
        ownerId,
        propertyId: listing.property_id,
        listingId: listing.id,
        prompt,
        message: generation.message,
      });
    }
    if (!generation.ok) {
      // The model answered nothing usable: no retry until the listing changes
      // (each retry would be billed). It could not be reached: the next run.
      if (generation.message && (await close(null))) run.dropped += 1;
      else run.left += 1;
      continue;
    }
    const summary = cleanSummary(generation.text);
    if (summary === null) {
      console.error("[listings] summary left out", { entity_id: listing.id });
    }
    if (await close(summary)) {
      if (summary === null) run.dropped += 1;
      else run.written += 1;
    } else {
      // Changed while the model wrote: the summary of before is not kept.
      run.left += 1;
    }
  }
  return run;
}

/** The call in the log of the assistant: what was given, what was written, its tokens. */
async function logSummary(
  admin: Admin,
  entry: {
    ownerId: string;
    propertyId: string;
    listingId: string;
    prompt: string;
    message: Anthropic.Message;
  },
): Promise<void> {
  const conversation = await admin
    .from("ai_conversations")
    .insert({
      profile_id: entry.ownerId,
      context: "seller",
      kind: "listing_summary",
      property_id: entry.propertyId,
    })
    .select("id")
    .single();
  if (conversation.error) {
    console.error("[listings] summary not logged", {
      entity_id: entry.listingId,
      code: conversation.error.code,
    });
    return;
  }
  const { message } = entry;
  // One after the other: the log is read in the order of its dates.
  const rows: Database["public"]["Tables"]["ai_messages"]["Insert"][] = [
    {
      conversation_id: conversation.data.id,
      role: "user",
      content: { type: "request", text: `annonce ${entry.listingId}\n\n${entry.prompt}` },
    },
    {
      conversation_id: conversation.data.id,
      role: "assistant",
      ...answerRow({
        blocks: toStoredBlocks(message.content),
        stopReason: message.stop_reason,
        model: message.model,
        usage: message.usage,
      }),
    },
  ];
  for (const row of rows) {
    const { error } = await admin.from("ai_messages").insert(row);
    if (error) {
      console.error("[listings] summary not logged", {
        entity_id: entry.listingId,
        code: error.code,
      });
      return;
    }
  }
}
