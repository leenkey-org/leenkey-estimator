// Messages of a conversation (L1-21), generic: a conversation has
// participants and messages, whatever it is about.

export type MessageKind = "text" | "system" | "visit_invite" | "offer_notice" | "assistant_handoff";

export type ThreadMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  kind: MessageKind;
  createdAt: string;
};

/** Why a message, a first message or a report did not go (SPEC-V2 8.6). */
export type SendError =
  | "empty"
  | "tooLong"
  | "auth"
  | "messagesPerHour"
  | "conversationsPerDay"
  | "closed"
  /** The account may no longer write (suspended by the Leenkey team). */
  | "inactive"
  /** What the conversation is about is no longer open to it (a listing offline, one's own). */
  | "subjectUnavailable"
  | "unavailable";

/** A row of public.messages, as PostgREST and Realtime give it. */
export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  kind: string;
  created_at: string;
};

const KINDS: readonly string[] = [
  "text",
  "system",
  "visit_invite",
  "offer_notice",
  "assistant_handoff",
] satisfies readonly MessageKind[];

function isKind(value: string): value is MessageKind {
  return KINDS.includes(value);
}

/** Dates as ISO strings in UTC, so that they sort as strings. */
export function toThreadMessage(row: MessageRow): ThreadMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    kind: isKind(row.kind) ? row.kind : "text",
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * Messages of a thread in order, each once: what the page gave, what was
 * sent from it and what Realtime brought may overlap.
 */
export function mergeMessages(
  current: readonly ThreadMessage[],
  incoming: readonly ThreadMessage[],
): ThreadMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
