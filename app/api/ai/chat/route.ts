import { after } from "next/server";
import { runTurn, type ChatEvent } from "@/core/ai/chat";
import { describeError, isAiConfigured } from "@/core/ai/client";
import { logAnswer, logResult } from "@/core/ai/log";
import { getProfile, missingAcceptances } from "@/core/auth/session";
import { prepareTurn } from "@/leenkey/ai/assistant";
import { chatRequestSchema } from "@/lib/validations/assistant";

// The assistant (L1-28, SPEC-V2 section 12): a message of the person, or the
// turn going on once they have confirmed or cancelled the actions proposed
// (leenkey/ai/actions.ts). The answer streams as server-sent events: the id
// of the conversation, the text as it is written, the tools that read, the
// actions to confirm, the end. Before the stream, an error is JSON with its
// status (401 session, 403 role or conditions, 404 conversation, 409 nothing
// to go on with, 429 limit of the day, 503 unavailable).

export const dynamic = "force-dynamic";
// A turn calls the model up to six times (core/ai/models.ts).
export const maxDuration = 60;

type StreamEvent = ChatEvent | { type: "conversation"; id: string };

const json = (body: Record<string, unknown>, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const STATUS = {
  invalid: 400,
  not_found: 404,
  pending: 409,
  nothing: 409,
  quota: 429,
  unavailable: 503,
};

export async function POST(request: Request): Promise<Response> {
  const profile = await getProfile();
  if (!profile) return json({ error: "auth" }, 401);
  if ((await missingAcceptances(profile.id)).length > 0) return json({ error: "conditions" }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid" }, 400);
  // The context of a role of the account (the seller, until lot 2).
  if (!profile.roles.includes(parsed.data.context)) return json({ error: "forbidden" }, 403);
  if (!isAiConfigured()) return json({ error: "unavailable" }, 503);

  const prepared = await prepareTurn(profile, parsed.data);
  if (!prepared.ok) {
    const { ok: _ok, ...error } = prepared;
    return json(error, STATUS[prepared.error]);
  }
  const turn = prepared.data;

  const encoder = new TextEncoder();
  let output: ReadableStreamDefaultController<Uint8Array> | null = null;
  // The person may leave (a tab closed): the turn goes on to its end and is
  // logged, its tokens with it; only the stream stops.
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
      // Closed by the person leaving.
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
    tools: turn.tools,
    messages: turn.messages,
    ctx: turn.ctx,
    emit: send,
    log: {
      answer: async (answer) =>
        (await logAnswer(turn.supabase, turn.conversationId, answer)) === "ok",
      result: async (result) =>
        (await logResult(turn.supabase, turn.conversationId, result)) === "ok",
    },
  })
    .catch((error: unknown) => {
      console.error("[ai] turn failed", {
        user_id: profile.id,
        entity_id: turn.conversationId,
        error: describeError(error),
      });
      send({ type: "error", error: "unavailable" });
    })
    .finally(close);
  // Kept alive by the platform after the response, should the person leave.
  after(() => run);

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
