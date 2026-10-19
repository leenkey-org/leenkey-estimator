"use server";

import { getProfile } from "@/core/auth/session";
import { sendErrorOf } from "@/core/messaging/errors";
import type { SendError } from "@/core/messaging/types";
import { createClient } from "@/lib/supabase/server";
import { firstMessageSchema } from "@/lib/validations/messaging";

/**
 * The first message of a buyer from a listing (SPEC-V2 8.6): opens the
 * conversation and posts the message in one transaction (conversation_open),
 * or adds it to the conversation they already have about this listing. The
 * database refuses a listing that is not online, one's own listing and the
 * anti-abuse limits. A first contact gives the account the buyer role, as
 * the first property gives the seller one (DECISIONS 2026-10-19), never
 * required to write. No revalidatePath (CLAUDE.md section 9, exception): the
 * page then opens the conversation, and the messages pages are read at each
 * visit.
 */
export async function startConversation(
  input: unknown,
): Promise<{ ok: true; data: { conversationId: string } } | { ok: false; error: SendError }> {
  const parsed = firstMessageSchema.safeParse(input);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.message === "tooLong");
    return { ok: false, error: tooLong ? "tooLong" : "empty" };
  }
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const { listingId, body } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("conversation_open", {
    p_listing_id: listingId,
    p_body: body,
  });
  if (error) {
    const reason = sendErrorOf(error);
    if (reason === "unavailable") {
      console.error("[messaging] conversation not opened", {
        user_id: profile.id,
        entity_id: listingId,
        code: error.code,
      });
    }
    return { ok: false, error: reason };
  }
  if (!profile.roles.includes("buyer")) {
    const role = await supabase.rpc("profile_add_role", { p_role: "buyer" });
    if (role.error) {
      console.error("[messaging] buyer role failed", {
        user_id: profile.id,
        code: role.error.code,
      });
    }
  }
  return { ok: true, data: { conversationId: data } };
}
