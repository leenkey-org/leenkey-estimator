import { cookies } from "next/headers";
import { after } from "next/server";
import { runTurn, type ChatEvent } from "@/core/ai/chat";
import { describeError, isAiConfigured } from "@/core/ai/client";
import { VISITOR_SETTINGS } from "@/core/ai/models";
import {
  clientAddress,
  prepareVisitorTurn,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  visitorCookie,
  visitorKeys,
  visitorSecrets,
} from "@/leenkey/ai/visitor";
import { visitorChatSchema } from "@/lib/validations/assistant";

// The assistant of the public site (DECISIONS.md 2026-11-07): a question of
// a visitor, without an account; the answer streams as for the assistant of
// the accounts (app/api/ai/chat): the id of the conversation, the text as it
// is written, the end. Before the stream, an error is JSON with its status
// (400 invalid, 403 sent by another site, 415 not JSON, 429 the limit of
// the visitor or of the site, 503 unavailable). The visitor is known by a
// cookie set at its first question (lk_visitor, needed for the service it
// asks: no consent asked), sent back to this route only.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type StreamEvent = ChatEvent | { type: "conversation"; id: string };

const PATH = "/api/ai/visitor";

/**
 * Asked by a page of this site: a browser says where a request comes from
 * (Sec-Fetch-Site), and a page of another site never makes its visitors use
 * up the questions of the day. A client that is not a browser says nothing
 * and is bound by the limits of its address.
 */
function fromThisSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin";
}

export async function POST(request: Request): Promise<Response> {
  if (!fromThisSite(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "invalid" }, { status: 415 });
  }
  const jar = await cookies();
  const cookie = visitorCookie(jar.get(VISITOR_COOKIE)?.value);
  const headers = new Headers({ "cache-control": "no-store" });
  if (cookie.isNew) {
    headers.append(
      "set-cookie",
      [
        `${VISITOR_COOKIE}=${cookie.value}`,
        `Path=${PATH}`,
        `Max-Age=${VISITOR_COOKIE_MAX_AGE}`,
        "HttpOnly",
        "SameSite=Lax",
        ...(process.env.NEXT_PUBLIC_ENV === "local" ? [] : ["Secure"]),
      ].join("; "),
    );
  }
  const json = (body: Record<string, unknown>, status: number) =>
    Response.json(body, { status, headers });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const parsed = visitorChatSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const secrets = visitorSecrets();
  if (!isAiConfigured() || !secrets) return json({ error: "unavailable" }, 503);

  const keys = visitorKeys(secrets.hashKey, cookie.value, clientAddress(request.headers));
  const prepared = await prepareVisitorTurn(secrets.serverKey, keys, parsed.data);
  if (!prepared.ok) {
    const status = prepared.error === "unavailable" ? 503 : 429;
    return json({ error: prepared.error }, status);
  }
  const turn = prepared.data;

  const encoder = new TextEncoder();
  let output: ReadableStreamDefaultController<Uint8Array> | null = null;
  // The visitor may leave: the turn goes on to its end and is logged.
  const send = (event: StreamEvent) => {
    try {
      output?.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch {
      output = null;
    }
  };
  const close = () => {
    try {
      output?.close();
    } catch {
      // Closed by the visitor leaving.
    }
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      output = controller;
      send({ type: "conversation", id: turn.conversationId });
    },
    cancel() {
      output = null;
    },
  });

  const run = runTurn({
    model: turn.model,
    callModel: turn.callModel,
    system: turn.system,
    tools: [],
    messages: turn.messages,
    // No account and no tool: what the turn knows of the person, for its logs.
    ctx: { profileId: "visitor", roles: [], context: "buyer", stepCode: null },
    emit: send,
    maxTokens: VISITOR_SETTINGS.maxTokens,
    log: {
      answer: turn.logAnswer,
      // Never called: the assistant of the site has no tool.
      result: async () => false,
    },
  })
    .catch((error: unknown) => {
      console.error("[ai] visitor turn failed", {
        entity_id: turn.conversationId,
        error: describeError(error),
      });
      send({ type: "error", error: "unavailable" });
    })
    .finally(close);
  after(() => run);

  headers.set("content-type", "text/event-stream; charset=utf-8");
  headers.set("cache-control", "no-store, no-transform");
  headers.set("x-accel-buffering", "no");
  return new Response(stream, { headers });
}
