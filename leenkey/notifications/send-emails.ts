import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  planEmails,
  toQueuedNotification,
  type PlannedEmail,
  type QueueRow,
} from "@/core/notifications/batch";
import { sendEmail } from "@/core/notifications/email";
import { appEnv } from "@/lib/env";
import type { Database } from "@/types/database";
import { emailPolicy, renderNotificationEmail } from "./email-catalog";

// The notification emails waiting in the table (L1-22, SPEC-V2 sections 10 and
// 19), sent by /api/cron/send-notification-emails every 5 minutes with the
// service role client of the cron. Each email is claimed before it leaves
// (email_sent_at), so that two runs at once never send it twice; one that
// fails is tried again 15 minutes later, until its event is a day old
// (core/notifications/batch.ts).

/** Rows read at each run; the next ones wait for the next run. */
const QUEUE_LIMIT = 500;
const RETRY_MINUTES = 15;
/** Ids per update: they travel in the address of the request. */
const CHUNK = 100;
/** Between two emails: Resend takes 2 requests a second by default. */
const PACE_MS = 600;
/** No new email after this time: the next run sends the rest (function of 60 s). */
const BUDGET_MS = 40_000;

export type SendSummary = {
  /** Rows due. */
  due: number;
  /** Emails handed to Resend (or written to the log, in local). */
  sent: number;
  /** Emails refused or unreachable: tried again later. */
  failed: number;
  /** Rows whose email never leaves (read, preference off, too old…). */
  skipped: number;
  /** Rows waiting for the end of the throttle of their group, or for the next run. */
  postponed: number;
};

type Client = SupabaseClient<Database>;
type Changes = Database["public"]["Tables"]["notifications"]["Update"];

/** ADMIN_NOTIFICATION_EMAIL; outside production any address does: the test inbox gets it. */
export function teamAddress(): string | null {
  const address = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (address) return address;
  return appEnv() === "production" ? null : "admin@leenkey.fr";
}

function chunks(ids: readonly string[]): string[][] {
  const result: string[][] = [];
  for (let start = 0; start < ids.length; start += CHUNK) {
    result.push(ids.slice(start, start + CHUNK));
  }
  return result;
}

/** Changes the rows still waiting for their email; how many. */
async function updateWaiting(supabase: Client, ids: readonly string[], changes: Changes) {
  let count = 0;
  for (const part of chunks(ids)) {
    const { data, error } = await supabase
      .from("notifications")
      .update(changes)
      .in("id", part)
      .is("email_sent_at", null)
      .is("email_skipped_at", null)
      .select("id");
    if (error) throw new Error(`notifications update: ${error.code} ${error.message}`);
    count += data.length;
  }
  return count;
}

/** Gives back the rows of an email that did not leave, for a new try later. */
async function release(supabase: Client, ids: readonly string[], claimedAt: string, retry: Date) {
  for (const part of chunks(ids)) {
    const { error } = await supabase
      .from("notifications")
      .update({ email_sent_at: null, email_after: retry.toISOString() })
      .in("id", part)
      .eq("email_sent_at", claimedAt);
    if (error) throw new Error(`notifications release: ${error.code} ${error.message}`);
  }
}

type Outcome = "sent" | "failed" | "skipped" | "taken";

async function deliver(supabase: Client, email: PlannedEmail, now: Date): Promise<Outcome> {
  const to = email.audience === "team" ? teamAddress() : email.email;
  const content = await renderNotificationEmail(email);
  if (!to || !content) {
    console.error("[notifications] email without recipient or content", {
      type: email.type,
      user_id: email.profileId,
    });
    await updateWaiting(supabase, email.ids, { email_skipped_at: now.toISOString() });
    return "skipped";
  }
  // Claimed first: a run that started meanwhile finds nothing left to send.
  const claimedAt = now.toISOString();
  if ((await updateWaiting(supabase, email.ids, { email_sent_at: claimedAt })) === 0) {
    return "taken";
  }
  if ((await sendEmail({ to, ...content })) !== "failed") return "sent";
  await release(supabase, email.ids, claimedAt, new Date(now.getTime() + RETRY_MINUTES * 60_000));
  return "failed";
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendNotificationEmails(
  supabase: Client,
  now = new Date(),
  { paceMs = PACE_MS, budgetMs = BUDGET_MS } = {},
): Promise<SendSummary> {
  const started = Date.now();
  const queue = await supabase.rpc("notification_email_queue", { p_limit: QUEUE_LIMIT });
  if (queue.error) {
    throw new Error(`notification_email_queue: ${queue.error.code} ${queue.error.message}`);
  }
  const rows = (queue.data as QueueRow[]).map(toQueuedNotification);
  const plan = planEmails(rows, emailPolicy, now);
  const summary: SendSummary = { due: rows.length, sent: 0, failed: 0, skipped: 0, postponed: 0 };

  if (plan.skipped.length > 0) {
    summary.skipped += await updateWaiting(
      supabase,
      plan.skipped.map((row) => row.id),
      { email_skipped_at: now.toISOString() },
    );
  }
  for (const { ids, until } of plan.postponed) {
    summary.postponed += await updateWaiting(supabase, ids, { email_after: until.toISOString() });
  }
  for (const [index, email] of plan.emails.entries()) {
    if (Date.now() - started > budgetMs) {
      // Still due: the next run takes them.
      summary.postponed += plan.emails.slice(index).reduce((sum, rest) => sum + rest.ids.length, 0);
      break;
    }
    if (index > 0) await pause(paceMs);
    try {
      const outcome = await deliver(supabase, email, now);
      if (outcome === "sent") summary.sent += 1;
      else if (outcome === "failed") summary.failed += 1;
      else if (outcome === "skipped") summary.skipped += email.ids.length;
    } catch (error) {
      summary.failed += 1;
      console.error("[notifications] email not sent", {
        type: email.type,
        user_id: email.profileId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return summary;
}
