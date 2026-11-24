import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { frAdminUsers } from "@/lib/i18n/sections/adminUsers";
import { createClient } from "@/lib/supabase/server";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminUsers: frAdminUsers } as const;

// Reads of the dashboard of the back office (L1-30a, SPEC-V2 section 17),
// with the admin's session: the SQL functions check is_admin() themselves
// and the RLS of the tables they read gives the admin everything; each read
// calls requireAdmin() too (a 404 for anyone else).

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

/** What waits for the admin: the counters of the sidebar, the mobile header and the dashboard. */
export type AdminCounts = {
  listingsPending: number;
  /** When the oldest listing to review was sent (24 h target), null without any. */
  listingsOldestSubmittedAt: string | null;
  casesOpen: number;
  reportsOpen: number;
  /** Advisor conversations where the seller wrote last, unread by the team (L1-34). */
  advisorUnread: number;
};

/** Plans sold and sign-ups of the last days. */
export type AdminActivity = {
  days: number;
  plansSold: number;
  plansAmountCents: number;
  signups: number;
  signupsSellers: number;
  signupsBuyers: number;
};

/** Something that waits for the admin, the oldest first. */
export type AdminTodoItem = {
  kind: "listing" | "case" | "report" | "financing" | "identity" | "identityFile";
  id: string;
  /** The listing (« Maison 5 pièces · LK-0006 »), the subject of a case, the motive of a report. */
  label: string;
  /** Since when it waits. */
  since: string;
  /** The cover photo of a listing (storage path), null without one or for a case or a report. */
  coverPath: string | null;
};

/** Days of the activity of the dashboard (SPEC 17: « sur 30 jours »). */
export const ACTIVITY_DAYS = 30;
/** Items of « À traiter » at most, the oldest first. */
export const TODO_LIMIT = 20;
/** A motive of a report in « À traiter », cut there. */
const LABEL_CHARS = 90;

function logFailure(read: string, error: unknown) {
  console.error(`[admin] ${read} failed`, {
    error: error instanceof Error ? error.message : String(error),
  });
}

/** Read once per request: the layout and the dashboard share it. */
export const adminCounts = cache(async (): Promise<QueryResult<AdminCounts>> => {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_counts");
    if (error) throw new Error(`admin_counts: ${error.code} ${error.message}`);
    const row = data[0];
    return {
      ok: true,
      data: {
        listingsPending: row?.listings_pending ?? 0,
        // Generated types declare the columns of a function result as never null.
        listingsOldestSubmittedAt: (row?.listings_oldest_submitted_at as string | null) ?? null,
        casesOpen: row?.cases_open ?? 0,
        reportsOpen: row?.reports_open ?? 0,
        advisorUnread: row?.advisor_unread ?? 0,
      },
    };
  } catch (error) {
    logFailure("counts", error);
    return { ok: false, error: "unavailable" };
  }
});

export async function adminActivity(
  days: number = ACTIVITY_DAYS,
): Promise<QueryResult<AdminActivity>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_activity", { p_days: days });
    if (error) throw new Error(`admin_activity: ${error.code} ${error.message}`);
    const row = data[0];
    return {
      ok: true,
      data: {
        days,
        plansSold: row?.plans_sold ?? 0,
        plansAmountCents: Number(row?.plans_amount_cents ?? 0),
        signups: row?.signups ?? 0,
        signupsSellers: row?.signups_sellers ?? 0,
        signupsBuyers: row?.signups_buyers ?? 0,
      },
    };
  } catch (error) {
    logFailure("activity", error);
    return { ok: false, error: "unavailable" };
  }
}

/** One line of text: no line break, `max` characters at most with an ellipsis. */
export function shortLabel(text: string, max: number = LABEL_CHARS): string {
  const line = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(line);
  return chars.length <= max
    ? line
    : `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`;
}

type PhotoRow = { storage_path: string; is_cover: boolean };

/** The cover photo of the property of a listing (embedded one to one, or as a list). */
function coverOf(
  property: { photos: PhotoRow[] } | { photos: PhotoRow[] }[] | null,
): string | null {
  const one = Array.isArray(property) ? property[0] : property;
  return one?.photos.find((photo) => photo.is_cover)?.storage_path ?? null;
}

/** The items of « À traiter », merged and the oldest first (by date, then by id). */
export function mergeTodo(groups: readonly AdminTodoItem[][], limit: number = TODO_LIMIT) {
  return groups
    .flat()
    .sort(
      (a, b) =>
        Date.parse(a.since) - Date.parse(b.since) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(0, limit);
}

/**
 * « À traiter » (SPEC 17): the listings to review, the open cases, the open
 * reports, the proofs of financing to check (L2-02), the identity
 * documents to check and the identity files still stored after their
 * document reached its end (DECISIONS.md 2026-11-23), the oldest first.
 */
export async function adminTodo(limit: number = TODO_LIMIT): Promise<QueryResult<AdminTodoItem[]>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const [listings, cases, reports, proofs, identities, identityFiles] = await Promise.all([
      supabase
        .from("listings")
        .select(
          "id, title, reference, submitted_at, created_at, property:properties(photos(storage_path, is_cover))",
        )
        .eq("status", "pending")
        .is("deleted_at", null)
        .order("submitted_at", { ascending: true, nullsFirst: true })
        .limit(limit),
      supabase
        .from("cases")
        .select("id, subject, created_at")
        .neq("status", "closed")
        .order("created_at", { ascending: true })
        .limit(limit),
      supabase
        .from("reports")
        .select("id, reason, created_at")
        .is("resolved_at", null)
        .order("created_at", { ascending: true })
        .limit(limit),
      // L2-02: the proofs of financing that wait for their check (one in
      // force per buyer: a replaced or removed one is marked removed).
      supabase
        .from("financing_documents")
        .select(
          "id, buyer_id, created_at, buyer:profiles!financing_documents_buyer_id_fkey(first_name, last_name)",
        )
        .is("checked_at", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(limit),
      // The identity documents that wait for their check (one per buyer).
      supabase
        .from("identity_documents")
        .select(
          "id, buyer_id, created_at, buyer:profiles!identity_documents_buyer_id_fkey(first_name, last_name)",
        )
        .is("checked_at", null)
        .is("refused_at", null)
        .is("withdrawn_at", null)
        .order("created_at", { ascending: true })
        .limit(limit),
      // The identity documents checked, refused or withdrawn whose file is
      // still stored (its deletion failed): « Supprimer le fichier » on the
      // sheet of the account. The scheduled task removes them too.
      supabase
        .from("identity_documents")
        .select(
          "id, buyer_id, updated_at, created_at, buyer:profiles!identity_documents_buyer_id_fkey(first_name, last_name)",
        )
        .is("file_deleted_at", null)
        .or("checked_at.not.is.null,refused_at.not.is.null,withdrawn_at.not.is.null")
        .order("created_at", { ascending: true })
        .limit(limit),
    ]);
    if (listings.error) throw new Error(`listings: ${listings.error.code}`);
    if (cases.error) throw new Error(`cases: ${cases.error.code}`);
    if (reports.error) throw new Error(`reports: ${reports.error.code}`);
    if (proofs.error) throw new Error(`financing: ${proofs.error.code}`);
    if (identities.error) throw new Error(`identity: ${identities.error.code}`);
    if (identityFiles.error) throw new Error(`identity files: ${identityFiles.error.code}`);
    return {
      ok: true,
      data: mergeTodo(
        [
          listings.data.map((row) => ({
            kind: "listing" as const,
            id: row.id,
            label: `${shortLabel(row.title)} · ${row.reference}`,
            since: row.submitted_at ?? row.created_at,
            coverPath: coverOf(row.property),
          })),
          cases.data.map((row) => ({
            kind: "case" as const,
            id: row.id,
            label: shortLabel(row.subject),
            since: row.created_at,
            coverPath: null,
          })),
          reports.data.map((row) => ({
            kind: "report" as const,
            id: row.id,
            label: shortLabel(row.reason),
            since: row.created_at,
            coverPath: null,
          })),
          proofs.data.map((row) => ({
            kind: "financing" as const,
            // The sheet of the buyer: where the document is checked.
            id: row.buyer_id,
            label: shortLabel(
              [row.buyer?.first_name, row.buyer?.last_name].filter(Boolean).join(" ") ||
                fr.adminUsers.noName,
            ),
            since: row.created_at,
            coverPath: null,
          })),
          identities.data.map((row) => ({
            kind: "identity" as const,
            // The sheet of the buyer too.
            id: row.buyer_id,
            label: shortLabel(
              [row.buyer?.first_name, row.buyer?.last_name].filter(Boolean).join(" ") ||
                fr.adminUsers.noName,
            ),
            since: row.created_at,
            coverPath: null,
          })),
          identityFiles.data.map((row) => ({
            kind: "identityFile" as const,
            id: row.buyer_id,
            label: shortLabel(
              [row.buyer?.first_name, row.buyer?.last_name].filter(Boolean).join(" ") ||
                fr.adminUsers.noName,
            ),
            // Since its document reached its end.
            since: row.updated_at ?? row.created_at,
            coverPath: null,
          })),
        ],
        limit,
      ),
    };
  } catch (error) {
    logFailure("to do", error);
    return { ok: false, error: "unavailable" };
  }
}

export type AdminUpgradeStat = {
  trigger: string;
  shown: number;
  clicked: number;
  dismissed: number;
  /** A plan ordered on the property within 7 days of the click. */
  converted: number;
};

/** The days of the measure of the upgrade prompts. */
export const UPGRADE_STATS_DAYS = 30;

/**
 * The upgrade prompts (L2-09, SPEC-V2 11 bis) over the last days, per
 * trigger: shown, opened, hidden, converted (admin_upgrade_prompt_stats).
 */
export async function adminUpgradeStats(
  days: number = UPGRADE_STATS_DAYS,
): Promise<QueryResult<AdminUpgradeStat[]>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_upgrade_prompt_stats", { p_days: days });
    if (error) throw new Error(`admin_upgrade_prompt_stats: ${error.code} ${error.message}`);
    return {
      ok: true,
      data: data.map((row) => ({
        trigger: row.trigger_code,
        shown: row.shown,
        clicked: row.clicked,
        dismissed: row.dismissed,
        converted: row.converted,
      })),
    };
  } catch (error) {
    logFailure("upgrade prompts", error);
    return { ok: false, error: "unavailable" };
  }
}

/** What the daily brief counts beside the counters of the dashboard (L1-30b). */
export type AdminBriefCounts = {
  financingToCheck: number;
  identityToCheck: number;
  identityFilesToDelete: number;
  /** Offers sent since `since` (each version counts, never a draft). */
  offersSent: number;
};

/**
 * The counts of the daily brief that « À traiter » lists without counting
 * them (it keeps 20 items): the proofs of financing and the identity
 * documents to check, the identity files to delete (same filters as
 * adminTodo), and the offers sent over the last hours.
 */
export async function adminBriefCounts(since: Date): Promise<QueryResult<AdminBriefCounts>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const count = { count: "exact" as const, head: true };
    const [proofs, identities, identityFiles, offers] = await Promise.all([
      supabase
        .from("financing_documents")
        .select("id", count)
        .is("checked_at", null)
        .is("deleted_at", null),
      supabase
        .from("identity_documents")
        .select("id", count)
        .is("checked_at", null)
        .is("refused_at", null)
        .is("withdrawn_at", null),
      supabase
        .from("identity_documents")
        .select("id", count)
        .is("file_deleted_at", null)
        .or("checked_at.not.is.null,refused_at.not.is.null,withdrawn_at.not.is.null"),
      supabase
        .from("offers")
        .select("id", count)
        .neq("status", "draft")
        .gte("submitted_at", since.toISOString()),
    ]);
    if (proofs.error) throw new Error(`financing: ${proofs.error.code}`);
    if (identities.error) throw new Error(`identity: ${identities.error.code}`);
    if (identityFiles.error) throw new Error(`identity files: ${identityFiles.error.code}`);
    if (offers.error) throw new Error(`offers: ${offers.error.code}`);
    return {
      ok: true,
      data: {
        financingToCheck: proofs.count ?? 0,
        identityToCheck: identities.count ?? 0,
        identityFilesToDelete: identityFiles.count ?? 0,
        offersSent: offers.count ?? 0,
      },
    };
  } catch (error) {
    logFailure("brief counts", error);
    return { ok: false, error: "unavailable" };
  }
}

/** The last daily brief written (L1-30b), null without any. */
export async function latestDailyBrief(): Promise<
  QueryResult<{ text: string; createdAt: string } | null>
> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admin_daily_briefs")
      .select("body, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`admin_daily_briefs: ${error.code}`);
    return { ok: true, data: data ? { text: data.body, createdAt: data.created_at } : null };
  } catch (error) {
    logFailure("daily brief", error);
    return { ok: false, error: "unavailable" };
  }
}
