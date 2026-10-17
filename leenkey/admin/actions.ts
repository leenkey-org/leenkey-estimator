"use server";

import { revalidatePath } from "next/cache";
import type { EmailDelivery } from "@/core/notifications/email";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { moderationSchema, type ModerationAction } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { emailSellerAboutDecision } from "./listing-emails";

// Server actions of the back office (L1-19). The status changes go through
// the SQL functions of L1-04 (listing_publish, listing_reject,
// listing_suspend, listing_unsuspend), which check is_admin(), validate the
// transition and write audit_log. No service role.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type ModerationResult =
  | { ok: true; data: { status: ListingStatus; email: EmailDelivery | null } }
  | { ok: false; error: "invalid" | "forbidden" | "not_found" | "conflict" | "unavailable" };

const DECISION = {
  publish: "published",
  reject: "rejected",
  suspend: "suspended",
  unsuspend: null,
} as const satisfies Record<ModerationAction, "published" | "rejected" | "suspended" | null>;

export async function moderateListing(input: unknown): Promise<ModerationResult> {
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };

  const command = parsed.data;
  const supabase = await createClient();
  const { data: status, error } =
    command.action === "publish"
      ? await supabase.rpc("listing_publish", { p_listing_id: command.listingId })
      : command.action === "reject"
        ? await supabase.rpc("listing_reject", {
            p_listing_id: command.listingId,
            p_reason: command.reason,
          })
        : command.action === "suspend"
          ? await supabase.rpc("listing_suspend", {
              p_listing_id: command.listingId,
              p_reason: command.reason,
            })
          : await supabase.rpc("listing_unsuspend", {
              p_listing_id: command.listingId,
              p_to: "published",
            });
  if (error) {
    console.error("[admin] moderation failed", {
      user_id: profile.id,
      entity_id: command.listingId,
      action: command.action,
      code: error.code,
    });
    if (error.code === "42501") return { ok: false, error: "forbidden" };
    if (error.code === "P0002") return { ok: false, error: "not_found" };
    // 22023: the listing changed status since the page was shown.
    if (error.code === "22023") return { ok: false, error: "conflict" };
    return { ok: false, error: "unavailable" };
  }

  const decision = DECISION[command.action];
  const email = decision
    ? await emailSellerAboutDecision({
        listingId: command.listingId,
        decision,
        reason: "reason" in command ? command.reason : undefined,
      })
    : null;
  revalidatePath("/admin/annonces");
  revalidatePath(`/admin/annonces/${command.listingId}`);
  return { ok: true, data: { status, email } };
}
