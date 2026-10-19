import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-21: the actions of the messaging, with a script of answers for the
// Supabase client: the RLS, the limits and the functions of the database are
// tested in supabase/tests/rls_messaging.sql.

type Answer = { data: unknown; error: { code: string; message?: string } | null };
type Call = { target: string; op: string; values?: unknown };

const CONVERSATION = "5eed2000-0000-4000-8000-000000000011";
const LISTING = "623efc8b-97d4-4902-ac43-406417498893";

const mocks = vi.hoisted(() => ({
  profile: null as { id: string; firstName: string | null; roles: string[] } | null,
  answers: [] as Answer[],
  calls: [] as Call[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth/session", () => ({ getProfile: async () => mocks.profile }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const answer = async (call: Call) => {
      mocks.calls.push(call);
      return mocks.answers.shift() ?? { data: null, error: null };
    };
    return {
      rpc: (name: string, values: unknown) => answer({ target: name, op: "rpc", values }),
      from(table: string) {
        const call: Call = { target: table, op: "select" };
        // Answers when awaited (an insert alone) or at single / maybeSingle.
        const chain = {
          insert(values: unknown) {
            Object.assign(call, { op: "insert", values });
            return chain;
          },
          select: () => chain,
          eq: () => chain,
          single: () => answer(call),
          maybeSingle: () => answer(call),
          then: (resolve: (value: Answer) => unknown, reject: (reason: unknown) => unknown) =>
            answer(call).then(resolve, reject),
        };
        return chain;
      },
    };
  },
}));

const { startConversation } = await import("@/leenkey/messaging/actions");
const { markConversationRead, messagesSince, reportConversation, sendMessage } =
  await import("@/core/messaging/actions");

const buyer = { id: "5eed0000-0000-4000-8000-00000000000c", firstName: "Chloé", roles: ["buyer"] };
const seller = {
  id: "5eed0000-0000-4000-8000-00000000000a",
  firstName: "Alice",
  roles: ["seller"],
};
const ok = (data: unknown): Answer => ({ data, error: null });
const refused = (code: string, message?: string): Answer => ({
  data: null,
  error: { code, message },
});

beforeEach(() => {
  mocks.profile = buyer;
  mocks.answers.length = 0;
  mocks.calls.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the first message from a listing", () => {
  it("refuses an empty message, then asks for a session", async () => {
    expect(await startConversation({ listingId: LISTING, body: "  " })).toEqual({
      ok: false,
      error: "empty",
    });
    mocks.profile = null;
    expect(await startConversation({ listingId: LISTING, body: "Bonjour" })).toEqual({
      ok: false,
      error: "auth",
    });
    expect(mocks.calls).toEqual([]);
  });

  it("opens the conversation with its message, in one call", async () => {
    mocks.answers.push(ok(CONVERSATION));
    expect(await startConversation({ listingId: LISTING, body: " Bonjour " })).toEqual({
      ok: true,
      data: { conversationId: CONVERSATION },
    });
    expect(mocks.calls).toEqual([
      {
        target: "conversation_open",
        op: "rpc",
        values: { p_listing_id: LISTING, p_body: "Bonjour" },
      },
    ]);
  });

  it("gives the buyer role to an account that only sold, without requiring it", async () => {
    mocks.profile = seller;
    mocks.answers.push(ok(CONVERSATION), refused("42501"));
    expect((await startConversation({ listingId: LISTING, body: "Bonjour" })).ok).toBe(true);
    expect(mocks.calls[1]).toEqual({
      target: "profile_add_role",
      op: "rpc",
      values: { p_role: "buyer" },
    });
  });

  it("says why the database refused it", async () => {
    const cases: [Answer, string][] = [
      [refused("54000", "conversations_per_day"), "conversationsPerDay"],
      [refused("54000", "messages_per_hour"), "messagesPerHour"],
      [refused("22023", "listing not available"), "listingUnavailable"],
      [refused("42501", "conversation closed"), "closed"],
      [refused("42501", "not authenticated"), "inactive"],
      [refused("08006"), "unavailable"],
    ];
    for (const [answer, error] of cases) {
      mocks.answers.push(answer);
      expect(await startConversation({ listingId: LISTING, body: "Bonjour" }), error).toEqual({
        ok: false,
        error,
      });
    }
  });
});

describe("a message in a conversation", () => {
  const row = {
    id: "m1",
    conversation_id: CONVERSATION,
    sender_id: buyer.id,
    body: "Bonjour",
    kind: "text",
    created_at: "2026-10-19T21:24:22.382911+00:00",
  };

  it("is written with the session of its author and comes back as sent", async () => {
    mocks.answers.push(ok(row));
    expect(await sendMessage({ conversationId: CONVERSATION, body: "Bonjour" })).toEqual({
      ok: true,
      data: {
        id: "m1",
        conversationId: CONVERSATION,
        senderId: buyer.id,
        body: "Bonjour",
        kind: "text",
        createdAt: "2026-10-19T21:24:22.382Z",
      },
    });
    expect(mocks.calls[0]).toEqual({
      target: "messages",
      op: "insert",
      values: { conversation_id: CONVERSATION, sender_id: buyer.id, body: "Bonjour" },
    });
  });

  it("tells a closed conversation from an account that may no longer write", async () => {
    mocks.answers.push(refused("42501", "new row violates row-level security policy"));
    mocks.answers.push(ok({ closed_at: "2026-10-19T08:00:00Z" }));
    expect(await sendMessage({ conversationId: CONVERSATION, body: "Bonjour" })).toEqual({
      ok: false,
      error: "closed",
    });
    mocks.answers.push(refused("42501", "new row violates row-level security policy"));
    mocks.answers.push(ok({ closed_at: null }));
    expect(await sendMessage({ conversationId: CONVERSATION, body: "Bonjour" })).toEqual({
      ok: false,
      error: "inactive",
    });
  });

  it("refuses more than 4 000 characters before the database", async () => {
    expect(await sendMessage({ conversationId: CONVERSATION, body: "a".repeat(4001) })).toEqual({
      ok: false,
      error: "tooLong",
    });
    expect(mocks.calls).toEqual([]);
  });
});

describe("read marks, catching up and reports", () => {
  it("marks the conversation read through its function", async () => {
    expect(await markConversationRead("not-a-uuid")).toEqual({ ok: false, error: "invalid" });
    expect(await markConversationRead(CONVERSATION)).toEqual({ ok: true, data: null });
    expect(mocks.calls).toEqual([
      { target: "conversation_mark_read", op: "rpc", values: { p_conversation_id: CONVERSATION } },
    ]);
  });

  it("reads the messages after a date only", async () => {
    expect(await messagesSince(CONVERSATION, "hier")).toEqual({ ok: false, error: "invalid" });
    expect(await messagesSince("x", "2026-10-19T21:24:22.382Z")).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("asks a reason, then writes the report for its author", async () => {
    expect(await reportConversation({ conversationId: CONVERSATION, reason: "ok" })).toEqual({
      ok: false,
      error: "tooShort",
    });
    mocks.answers.push(ok(null));
    expect(
      await reportConversation({ conversationId: CONVERSATION, reason: " Propos insultants " }),
    ).toEqual({ ok: true, data: null });
    expect(mocks.calls).toEqual([
      {
        target: "reports",
        op: "insert",
        values: {
          conversation_id: CONVERSATION,
          reporter_id: buyer.id,
          reason: "Propos insultants",
        },
      },
    ]);
  });
});
