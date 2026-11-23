import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// No identity file stays behind (DECISIONS.md 2026-11-23): the file of a
// document is deleted when the team decides, when its buyer withdraws or
// replaces it, when the account is closed. When that deletion failed, and for
// a file sent but never declared, the scheduled task takes it
// (/api/cron/anonymize-deleted, with the service client given by its route):
//   1. the files to remove, listed by identity_files_to_sweep (those of the
//      documents that reached their end, those no document names for more
//      than an hour), removed from Storage;
//   2. the documents whose file is gone marked, each once, in the audit log
//      (identity_files_mark_swept).
// Idempotent: a run cut short is resumed by the next one. Never the file of
// a document that waits for its check.

/** The service client of the scheduled task (given by its route, never imported here). */
type Admin = SupabaseClient<Database>;

/** Paths removed from Storage in one request. */
const REMOVE_CHUNK = 100;

export type IdentitySweepSummary = { removed: number; marked: number };

export async function sweepIdentityFiles(admin: Admin): Promise<IdentitySweepSummary> {
  const listed = await admin.rpc("identity_files_to_sweep");
  if (listed.error) throw new Error(`identity_files_to_sweep: ${listed.error.code}`);
  const paths = (listed.data ?? []).map((row) => row.path).filter(Boolean);
  for (let start = 0; start < paths.length; start += REMOVE_CHUNK) {
    const { error } = await admin.storage
      .from("documents")
      .remove(paths.slice(start, start + REMOVE_CHUNK));
    if (error) throw new Error(`storage documents: ${error.message}`);
  }
  const marked = await admin.rpc("identity_files_mark_swept");
  if (marked.error) throw new Error(`identity_files_mark_swept: ${marked.error.code}`);
  return { removed: paths.length, marked: marked.data ?? 0 };
}
