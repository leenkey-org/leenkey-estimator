// Edge Function `embed` (L1-27, SPEC-V2 section 3): the embeddings of the
// knowledge base, with the gte-small model built into Supabase (384
// dimensions, mean pooled and normalized: cosine distance in pgvector).
//
// POST, by an active signed-in account only (its token checked by Supabase
// Auth and the database, whatever the gateway does):
//   { "input": ["question", ...] }  -> { "embeddings": [[...384], ...] }
//   { "reindex": true }             -> { "updated": n, "remaining": bool }
// reindex, by an admin only, fills up to 20 cards without an embedding with
// the token of the caller (RLS: an admin alone writes knowledge_base); the
// caller calls again while some remain. No service role key here.
// Rate limit of the calls: with the assistant (L1-38, DECISIONS 2026-10-30).

type Session = {
  run(input: string, options: { mean_pool: boolean; normalize: boolean }): Promise<number[]>;
};
declare const Supabase: { ai: { Session: new (model: string) => Session } };

const MAX_INPUTS = 16;
const MAX_CHARS = 2_000;
const MAX_BODY_BYTES = 64 * 1024;
const REINDEX_BATCH = 20;
const DIMENSIONS = 384;

const session = new Supabase.ai.Session("gte-small");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function embed(text: string): Promise<number[]> {
  const vector = await session.run(text.slice(0, MAX_CHARS), { mean_pool: true, normalize: true });
  if (!Array.isArray(vector) || vector.length !== DIMENSIONS)
    throw new Error("unexpected embedding");
  return vector;
}

/** The headers of a request made for the caller: their token, never more rights. */
function asCaller(authorization: string): HeadersInit {
  return { apikey: ANON_KEY, authorization, "content-type": "application/json" };
}

/** A function of the database, called as the caller: true or false. */
async function check(authorization: string, fn: "is_active_user" | "is_admin"): Promise<boolean> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: asCaller(authorization),
    body: "{}",
  });
  return response.ok && (await response.json()) === true;
}

/** A signed-in account (an anon key has no user), not suspended nor deleted. */
async function activeAccount(authorization: string): Promise<boolean> {
  if (!/^Bearer \S+$/.test(authorization) || !SUPABASE_URL) return false;
  const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: asCaller(authorization) });
  return user.ok && (await check(authorization, "is_active_user"));
}

type Card = { id: string; question: string; answer: string };

async function reindex(authorization: string): Promise<{ updated: number; remaining: boolean }> {
  const rest = `${SUPABASE_URL}/rest/v1/knowledge_base`;
  const read = await fetch(
    `${rest}?select=id,question,answer&embedding=is.null&order=id&limit=${REINDEX_BATCH + 1}`,
    { headers: asCaller(authorization) },
  );
  if (!read.ok) throw new Error(`read ${read.status}`);
  const cards = (await read.json()) as Card[];
  let updated = 0;
  for (const card of cards.slice(0, REINDEX_BATCH)) {
    const vector = await embed(`${card.question}\n\n${card.answer}`);
    const write = await fetch(`${rest}?id=eq.${encodeURIComponent(card.id)}`, {
      method: "PATCH",
      headers: { ...asCaller(authorization), prefer: "return=minimal" },
      body: JSON.stringify({ embedding: `[${vector.join(",")}]` }),
    });
    if (!write.ok) throw new Error(`write ${write.status}`);
    updated += 1;
  }
  return { updated, remaining: cards.length > REINDEX_BATCH };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method" }, 405);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json({ error: "invalid" }, 413);
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!(await activeAccount(authorization).catch(() => false))) return json({ error: "auth" }, 401);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: "invalid" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid" }, 400);
  }
  try {
    if (
      typeof body === "object" &&
      body !== null &&
      (body as { reindex?: unknown }).reindex === true
    ) {
      if (!(await check(authorization, "is_admin"))) return json({ error: "forbidden" }, 403);
      return json(await reindex(authorization));
    }
    const input = (body as { input?: unknown } | null)?.input;
    if (
      !Array.isArray(input) ||
      input.length === 0 ||
      input.length > MAX_INPUTS ||
      !input.every(
        (text) => typeof text === "string" && text.trim().length > 0 && text.length <= MAX_CHARS,
      )
    ) {
      return json({ error: "invalid" }, 400);
    }
    const embeddings: number[][] = [];
    for (const text of input) embeddings.push(await embed(text));
    return json({ embeddings });
  } catch (error) {
    console.error("[embed] failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "unavailable" }, 500);
  }
});
