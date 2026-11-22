"use server";

import { revalidatePath } from "next/cache";
import type { EmailDelivery } from "@/core/notifications/email";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { SuggestionResult } from "@/leenkey/ai/types";
import {
  complianceSchema,
  moderationSchema,
  rejectionDraftSchema,
  type ComplianceAction,
  type ModerationAction,
} from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { emailSellerAboutDecision } from "./listing-emails";
import { moderationError, type ModerationError } from "./moderation";
import { draftRejectionReason } from "./rejection-draft";

// Server actions of the back office (L1-19). The status changes go through
// the SQL functions of L1-04 (listing_publish, listing_reject,
// listing_suspend, listing_unsuspend), which check is_admin(), validate the
// transition and write audit_log. No service role.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type ModerationResult =
  | { ok: true; data: { status: ListingStatus; email: EmailDelivery | null } }
  /** dpe: published without its DPE, refused by listing_publish (L1-65). */
  | { ok: false; error: ModerationError | "dpe" };

const DECISION = {
  publish: "published",
  reject: "rejected",
  suspend: "suspended",
  unsuspend: null,
} as const satisfies Record<ModerationAction, "published" | "rejected" | "suspended" | null>;

export async function moderateListing(input: unknown): Promise<ModerationResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

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
          : // Back online, as SPEC-V2 section 17 says, even when paused before (Q45).
            await supabase.rpc("listing_unsuspend", {
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
    const dpe = error.code === "22023" && error.message.startsWith("dpe: ");
    return { ok: false, error: dpe ? "dpe" : moderationError(error.code) };
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

/**
 * « Rédiger avec l'assistant » in the refusal of a listing (L1-30d): a motive
 * proposed to the team, never sent by itself. Nothing changes: no
 * revalidatePath.
 */
export async function draftRejectionAction(input: unknown): Promise<SuggestionResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "auth" };
  const parsed = rejectionDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return draftRejectionReason(profile, parsed.data.listingId, parsed.data.notes);
}

export type ComplianceError =
  | ModerationError
  /** The deadline has not passed, or the listing changed since the request. */
  | "deadline"
  | "changed"
  /** Offers wait for an answer, or one is accepted: not deleted. */
  | "offers_waiting"
  | "offer_accepted";

export type ComplianceResult =
  | { ok: true; data: { action: ComplianceAction } }
  | { ok: false; error: ComplianceError };

/** The refusals of the SQL functions (55000), by their message. */
function complianceError(error: { code: string; message: string }): ComplianceError {
  if (error.code !== "55000") return moderationError(error.code);
  if (/deadline/.test(error.message)) return "deadline";
  if (/changed since/.test(error.message)) return "changed";
  if (/accepted/.test(error.message)) return "offer_accepted";
  if (/wait for an answer/.test(error.message)) return "offers_waiting";
  // No request any more: lifted meanwhile.
  return "conflict";
}

/**
 * « Demander une mise en conformité », « Lever la demande », « Supprimer
 * l'annonce » after the deadline (DECISIONS.md 2026-11-22). The SQL functions
 * check is_admin(), the status, the deadline and the changes, write
 * audit_log and the notifications of the seller (bell, and email through the
 * cron of the notifications). No service role.
 */
export async function listingComplianceAction(input: unknown): Promise<ComplianceResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = complianceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const command = parsed.data;
  const supabase = await createClient();
  const { error } =
    command.action === "request"
      ? await supabase.rpc("listing_compliance_request", {
          p_listing_id: command.listingId,
          p_reason: command.reason,
        })
      : command.action === "clear"
        ? await supabase.rpc("listing_compliance_clear", { p_listing_id: command.listingId })
        : await supabase.rpc("listing_admin_delete", { p_listing_id: command.listingId });
  if (error) {
    console.error("[admin] compliance failed", {
      user_id: profile.id,
      entity_id: command.listingId,
      action: command.action,
      code: error.code,
    });
    return { ok: false, error: complianceError(error) };
  }
  revalidatePath("/admin/annonces");
  revalidatePath(`/admin/annonces/${command.listingId}`);
  return { ok: true, data: { action: command.action } };
}
