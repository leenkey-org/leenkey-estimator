import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// The anonymisation of the accounts closed 30 days ago (L2-10, SPEC-V2
// sections 19 and 21): every Sunday at 2:00, /api/cron/anonymize-deleted.
// For each account due, in this order, so that a run cut short is resumed
// the next time (the account stays due until the last step):
//   1. its files (photos, financing documents), listed by account_files and
//      removed from Storage;
//   2. what names the person in the database (account_anonymize);
//   3. its sign-in (Supabase Auth): an address that leads nowhere, a random
//      password, no metadata, sign-in barred for good;
//   4. the account marked anonymised (account_mark_anonymized).
// The orders, the offers sent and the messages stay (the migration says why).

/** The service client of the scheduled task (given by its route, never imported here). */
type Admin = SupabaseClient<Database>;

/** Paths removed from Storage in one request. */
const REMOVE_CHUNK = 100;
/** Sign-in barred for a hundred years (Supabase Auth takes a duration). */
const BAN_FOREVER = "876000h";

export type AnonymizeSummary = { due: number; anonymized: number; failed: number };

/** The address that replaces the email of an account anonymised (never delivered). */
export function erasedEmail(profileId: string): string {
  return `${profileId}@compte-supprime.invalid`;
}

async function removeFiles(admin: Admin, files: { bucket: string; path: string }[]) {
  const byBucket = new Map<string, string[]>();
  for (const file of files) {
    if (!file.path) continue;
    byBucket.set(file.bucket, [...(byBucket.get(file.bucket) ?? []), file.path]);
  }
  for (const [bucket, paths] of byBucket) {
    for (let start = 0; start < paths.length; start += REMOVE_CHUNK) {
      const { error } = await admin.storage
        .from(bucket)
        .remove(paths.slice(start, start + REMOVE_CHUNK));
      if (error) throw new Error(`storage ${bucket}: ${error.message}`);
    }
  }
}

async function eraseSignIn(admin: Admin, profileId: string) {
  const { data, error: readError } = await admin.auth.admin.getUserById(profileId);
  // Already gone from Supabase Auth: nothing left to erase there.
  if (readError?.status === 404 || (!readError && !data.user)) return;
  if (readError) throw new Error(`auth read: ${readError.message}`);
  // Supabase Auth merges the metadata: each key is set to null to go.
  const metadata = Object.fromEntries(
    Object.keys(data.user.user_metadata ?? {}).map((key) => [key, null]),
  );
  const { error } = await admin.auth.admin.updateUserById(profileId, {
    email: erasedEmail(profileId),
    email_confirm: true,
    password: randomBytes(32).toString("base64url"),
    user_metadata: metadata,
    ban_duration: BAN_FOREVER,
  });
  if (error) throw new Error(`auth update: ${error.message}`);
}

/** One account due: files, database, sign-in, then marked. Throws on a failed step. */
export async function anonymizeAccount(admin: Admin, profileId: string, now: Date) {
  const at = now.toISOString();
  const files = await admin.rpc("account_files", { p_profile: profileId, p_now: at });
  if (files.error) throw new Error(`files: ${files.error.code}`);
  await removeFiles(admin, files.data ?? []);
  const scrub = await admin.rpc("account_anonymize", { p_profile: profileId, p_now: at });
  if (scrub.error) throw new Error(`anonymize: ${scrub.error.code}`);
  await eraseSignIn(admin, profileId);
  const mark = await admin.rpc("account_mark_anonymized", { p_profile: profileId, p_now: at });
  if (mark.error) throw new Error(`mark: ${mark.error.code}`);
}

/** The accounts due (50 a run at most), one after the other; a failure does not stop the others. */
export async function anonymizeDeletedAccounts(
  admin: Admin,
  now: Date = new Date(),
): Promise<AnonymizeSummary> {
  const { data, error } = await admin.rpc("accounts_due", { p_now: now.toISOString() });
  if (error) throw new Error(`accounts_due: ${error.code}`);
  const due = data ?? [];
  let anonymized = 0;
  let failed = 0;
  for (const profileId of due) {
    try {
      await anonymizeAccount(admin, profileId, now);
      anonymized += 1;
    } catch (failure) {
      failed += 1;
      console.error("[account] anonymisation failed", {
        user_id: profileId,
        error: failure instanceof Error ? failure.message : String(failure),
      });
    }
  }
  return { due: due.length, anonymized, failed };
}
