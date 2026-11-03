import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

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
  kind: "listing" | "case" | "report";
  id: string;
  /** The listing (« Maison 5 pièces · LK-0006 »), the subject of a case, the motive of a report. */
  label: string;
  /** Since when it waits. */
  since: string;
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

/** The items of « À traiter », merged and the oldest first. */
export function mergeTodo(groups: readonly AdminTodoItem[][], limit: number = TODO_LIMIT) {
  return groups
    .flat()
    .sort((a, b) => a.since.localeCompare(b.since) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/**
 * « À traiter » (SPEC 17): the listings to review, the open cases and the
 * open reports, the oldest first.
 */
export async function adminTodo(limit: number = TODO_LIMIT): Promise<QueryResult<AdminTodoItem[]>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const [listings, cases, reports] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, reference, submitted_at, created_at")
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
    ]);
    if (listings.error) throw new Error(`listings: ${listings.error.code}`);
    if (cases.error) throw new Error(`cases: ${cases.error.code}`);
    if (reports.error) throw new Error(`reports: ${reports.error.code}`);
    return {
      ok: true,
      data: mergeTodo(
        [
          listings.data.map((row) => ({
            kind: "listing" as const,
            id: row.id,
            label: `${shortLabel(row.title)} · ${row.reference}`,
            since: row.submitted_at ?? row.created_at,
          })),
          cases.data.map((row) => ({
            kind: "case" as const,
            id: row.id,
            label: shortLabel(row.subject),
            since: row.created_at,
          })),
          reports.data.map((row) => ({
            kind: "report" as const,
            id: row.id,
            label: shortLabel(row.reason),
            since: row.created_at,
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
