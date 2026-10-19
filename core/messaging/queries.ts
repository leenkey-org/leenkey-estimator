import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toThreadMessage, type ThreadMessage } from "./types";

// Messages of a conversation (L1-21), with the session of the participant:
// RLS gives them to its participants (and to the admin) only.

const COLUMNS = "id, conversation_id, sender_id, body, kind, created_at";

/** At most the last 200 messages of a thread, oldest first. */
export const THREAD_LIMIT = 200;

export async function listThreadMessages(
  conversationId: string,
  options: { after?: string } = {},
): Promise<{ ok: true; data: ThreadMessage[] } | { ok: false; error: "unavailable" }> {
  const supabase = await createClient();
  let query = supabase
    .from("messages")
    .select(COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(THREAD_LIMIT);
  if (options.after) query = query.gt("created_at", options.after);
  const { data, error } = await query;
  if (error) {
    console.error("[messaging] messages read failed", {
      entity_id: conversationId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: data.map(toThreadMessage).reverse() };
}
