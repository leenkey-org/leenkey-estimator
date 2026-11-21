import "server-only";
import { createClient } from "@/lib/supabase/server";
import { readAlertCriteria } from "@/lib/validations/alert";
import { searchHref, SEARCH_PATH, type SearchFilters } from "@/lib/validations/search";
import { alertSummary } from "./presentation";

// The alerts of a buyer (L3-06, SPEC-V2 16), read with their session (RLS:
// their own). last_sent_at is written by the daily digest alone.

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type Alert = {
  id: string;
  name: string;
  /** Null when the stored criteria are no longer a search the site knows. */
  criteria: SearchFilters | null;
  /** Its criteria on one line: « Savigny-sur-Orge », « 5 km », « ≤ 400 k€ ». */
  summary: string[];
  /** The search with these criteria. */
  href: string;
  active: boolean;
  createdAt: string;
  lastSentAt: string | null;
};

export async function listAlerts(profileId: string): Promise<QueryResult<Alert[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("id, name, criteria, active, created_at, last_sent_at")
    // An admin reads every alert (RLS): this page shows their own.
    .eq("buyer_id", profileId)
    .order("created_at");
  if (error) {
    console.error("[alerts] list read failed", { user_id: profileId, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: data.map((row) => {
      const criteria = readAlertCriteria(row.criteria);
      return {
        id: row.id,
        name: row.name,
        criteria,
        summary: criteria ? alertSummary(criteria) : [],
        href: criteria ? searchHref({ filters: criteria }) : SEARCH_PATH,
        active: row.active,
        createdAt: row.created_at,
        lastSentAt: row.last_sent_at,
      };
    }),
  };
}
