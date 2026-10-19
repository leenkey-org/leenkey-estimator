import type { SendError } from "./types";

/**
 * What the database said when a message or a first message was refused
 * (supabase/migrations/20261019220000_messaging.sql): the anti-abuse limits
 * (54000, the limit as message), a conversation closed (42501, « conversation
 * closed » from conversation_open) or an account that may no longer write
 * (42501 otherwise: RLS, conversation_start; a closed conversation also
 * fails RLS, which sendMessage tells apart), a subject no longer open to a
 * conversation (22023: for Leenkey, a listing offline or one's own), a body
 * the table refuses (23514).
 */
export function sendErrorOf(error: { code?: string; message?: string }): SendError {
  switch (error.code) {
    case "54000":
      return error.message === "conversations_per_day" ? "conversationsPerDay" : "messagesPerHour";
    case "42501":
      return error.message === "conversation closed" ? "closed" : "inactive";
    case "22023":
      return "subjectUnavailable";
    case "23514":
      return "tooLong";
    default:
      return "unavailable";
  }
}
