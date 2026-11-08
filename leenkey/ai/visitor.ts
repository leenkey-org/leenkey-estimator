import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { AnswerLog } from "@/core/ai/chat";
import { isAiMock, streamModel, type ModelCall } from "@/core/ai/client";
import { buildHistory } from "@/core/ai/conversation";
import type { FaqCard } from "@/core/ai/knowledge";
import { answerRow } from "@/core/ai/log";
import { MODELS } from "@/core/ai/models";
import { faqSection, promptFile } from "@/core/ai/prompts";
import { splitDescription } from "@/core/billing/plan-text";
import { addressScope } from "@/lib/client-address";
import { paidPlansOrderable } from "@/lib/config/sales";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { VisitorChatRequest } from "@/lib/validations/assistant";
import { HISTORY_TURNS } from "./assistant";
import { mockVisitorModel } from "./mock";

// The assistant of the public site (DECISIONS.md 2026-11-07): a visitor
// without an account asks basic questions and is helped to subscribe. Its
// prompt: core/ai/prompts/visitor.md, then the plans on sale (table plans,
// never written in the code) and the FAQ. No tool. The question is counted
// and written by the SQL function ai_visitor_ask (the limits of the day),
// the answer by ai_visitor_answer: no session, no service role. The server
// proves to them that it is the site with a key derived from CRON_SECRET
// (the Vault holds the same secret, ai_visitor_server); the visitor and its
// address are known by hashes keyed with another key derived from it, that
// nobody can compute or reverse without the secret.

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The cookie of a visitor of the assistant: set at its first question, a random key. */
export const VISITOR_COOKIE = "lk_visitor";
/** 30 days, as the conversations kept (purge-visitor-assistant). */
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const KEY = /^[0-9a-f]{64}$/;

const hmac = (key: string, text: string) => createHmac("sha256", key).update(text).digest("hex");

export type VisitorSecrets = {
  /** Given to the SQL functions: the proof that the caller is the site. */
  serverKey: string;
  /** Keys the hashes of the visitor and of its address. */
  hashKey: string;
};

/** The keys of the assistant of the site, derived from CRON_SECRET; none without it. */
export function visitorSecrets(secret = process.env.CRON_SECRET): VisitorSecrets | null {
  if (!secret) return null;
  return {
    serverKey: hmac(secret, "leenkey:ai-visitor:server"),
    hashKey: hmac(secret, "leenkey:ai-visitor:hash"),
  };
}

/** The cookie of the visitor, or a new one (to set on the response). */
export function visitorCookie(current: string | undefined): { value: string; isNew: boolean } {
  if (current && KEY.test(current)) return { value: current, isNew: false };
  return { value: randomBytes(32).toString("hex"), isNew: true };
}

/** The day in Europe/Paris (« 2026-11-07 »): an address is known for one day only. */
function parisDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * What the database knows of a visitor: a keyed hash of its cookie, and a
 * keyed hash of its address with the day (never the address itself, and no
 * way back to it without the secret). Without an address (local, tests), the
 * visitor stands for it.
 */
export function visitorKeys(
  hashKey: string,
  cookie: string,
  address: string | null,
  now: Date = new Date(),
): { visitorKey: string; ipKey: string } {
  return {
    visitorKey: hmac(hashKey, `visitor:${cookie}`),
    ipKey: address
      ? hmac(hashKey, `address:${parisDay(now)}:${addressScope(address)}`)
      : hmac(hashKey, `address:none:${cookie}`),
  };
}

export { addressScope, clientAddress } from "@/lib/client-address";

export type VisitorPlan = {
  name: string;
  priceCents: number;
  tagline: string | null;
  intro: string | null;
  outro: string | null;
  features: readonly string[];
};

/** The plans on sale, as the model reads them: from the table, never from the code. */
export function plansSection(plans: readonly VisitorPlan[]): string {
  const lines = [
    "# Formules",
    "",
    "Les formules en vente aujourd'hui, telles que le site les présente. Prix TTC, par bien.",
  ];
  for (const plan of plans) {
    lines.push(
      "",
      `<formule nom="${plan.name}" prix="${plan.priceCents === 0 ? "gratuit" : `${formatPrice(plan.priceCents)} TTC`}">`,
    );
    if (plan.tagline) lines.push(`Accroche : ${plan.tagline}`);
    if (plan.intro) lines.push(plan.intro);
    for (const feature of plan.features) lines.push(`- ${feature}`);
    if (plan.outro) lines.push(plan.outro);
    lines.push("</formule>");
  }
  return lines.join("\n");
}

/**
 * How a paid plan is ordered today: from the account, or, while the paid
 * plans cannot be ordered online (production before the final CGV and the
 * mediator, lib/config/sales.ts), by writing to us. The same for every
 * question of an environment (the prompt stays cached).
 */
export function orderingSection(orderable: boolean): string {
  return [
    "# Commande des formules payantes",
    "",
    orderable
      ? "Accompagné et Sérénité se commandent en ligne, depuis l'espace vendeur (« Choisir ma formule »), pour le bien concerné : paiement par carte bancaire sur la page sécurisée de Stripe."
      : "Accompagné et Sérénité ne se commandent pas encore en ligne. Pour en souscrire une, la personne crée son compte et ajoute son bien (Autonomie s'applique d'office), puis nous écrit depuis la page « Contact » : nous revenons vers elle sous 48 h, 7 j/7. Ne décris pas le paiement en ligne et ne dis pas quand il ouvrira.",
  ].join("\n");
}

/** The system prompt of the assistant of the site: its rules, the plans, the FAQ. */
export function visitorSystemPrompt(
  plans: readonly VisitorPlan[],
  cards: readonly FaqCard[],
  orderable: boolean = paidPlansOrderable(),
) {
  return [
    promptFile("visitor"),
    orderingSection(orderable),
    plansSection(plans),
    faqSection(cards),
  ].join("\n\n");
}

async function readPlans(supabase: Supabase): Promise<VisitorPlan[] | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("name, tagline, price_cents, description, features")
    .eq("active", true)
    .order("position");
  if (error) {
    console.error("[ai] visitor plans read failed", { code: error.code });
    return null;
  }
  return data.map((row) => ({
    name: row.name,
    priceCents: row.price_cents,
    tagline: row.tagline,
    ...splitDescription(row.description),
    features: row.features,
  }));
}

async function readCards(supabase: Supabase, serverKey: string): Promise<FaqCard[] | null> {
  const { data, error } = await supabase.rpc("knowledge_cards_visitor", { p_key: serverKey });
  if (error) {
    console.error("[ai] visitor cards read failed", { code: error.code });
    return null;
  }
  return data.map((row) => ({
    id: row.id,
    category: row.category,
    stepCode: row.step_code as string | null,
    question: row.question,
    answer: row.answer,
  }));
}

export type VisitorTurn = {
  conversationId: string;
  model: string;
  callModel: ModelCall;
  system: string;
  messages: Anthropic.MessageParam[];
  /** Writes the answer of the turn (once per question). */
  logAnswer(answer: AnswerLog): Promise<boolean>;
};

export type VisitorTurnError =
  /** 10 a day per visitor, or 30 per address. */
  | "quota"
  /** 300 a day for the site. */
  | "busy"
  | "unavailable";

/**
 * A question of a visitor: counted and written (ai_visitor_ask), then the
 * history of its conversation and the prompt. A conversation of another
 * visitor or of yesterday: a new one, whose id the stream gives back.
 */
export async function prepareVisitorTurn(
  serverKey: string,
  keys: { visitorKey: string; ipKey: string },
  request: VisitorChatRequest,
): Promise<{ ok: true; data: VisitorTurn } | { ok: false; error: VisitorTurnError }> {
  const supabase = await createClient();
  const [plans, cards] = await Promise.all([readPlans(supabase), readCards(supabase, serverKey)]);
  if (!plans || !cards) return { ok: false, error: "unavailable" };

  const asked = await supabase.rpc("ai_visitor_ask", {
    p_key: serverKey,
    p_visitor: keys.visitorKey,
    p_ip: keys.ipKey,
    p_conversation: request.conversationId ?? undefined,
    p_text: request.message,
  });
  const outcome = asked.data?.[0];
  if (asked.error || !outcome) {
    console.error("[ai] visitor question failed", { code: asked.error?.code });
    return { ok: false, error: "unavailable" };
  }
  if (outcome.status === "site_limit") return { ok: false, error: "busy" };
  if (outcome.status !== "ok") return { ok: false, error: "quota" };
  const conversationId = outcome.conversation_id;

  const log = await supabase.rpc("ai_visitor_history", {
    p_key: serverKey,
    p_visitor: keys.visitorKey,
    p_conversation: conversationId,
  });
  if (log.error) {
    console.error("[ai] visitor history failed", {
      entity_id: conversationId,
      code: log.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  const history = buildHistory(log.data, { maxTurns: HISTORY_TURNS });

  return {
    ok: true,
    data: {
      conversationId,
      model: MODELS.fast,
      callModel: isAiMock() ? mockVisitorModel : streamModel,
      system: visitorSystemPrompt(plans, cards),
      messages: history.messages,
      logAnswer: async (answer) => {
        const row = answerRow(answer);
        const { data, error } = await supabase.rpc("ai_visitor_answer", {
          p_key: serverKey,
          p_visitor: keys.visitorKey,
          p_conversation: conversationId,
          p_content: row.content,
          p_model: row.model,
          p_input_tokens: row.input_tokens,
          p_output_tokens: row.output_tokens,
        });
        if (error || !data) {
          console.error("[ai] visitor answer log failed", {
            entity_id: conversationId,
            code: error?.code,
          });
          return false;
        }
        return true;
      },
    },
  };
}
