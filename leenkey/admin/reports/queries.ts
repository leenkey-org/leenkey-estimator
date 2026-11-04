import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AdminReportsQuery } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { fullName, type QueryResult } from "../users/queries";

// Reads of the reports of the back office (L1-30c, SPEC-V2 section 17), with
// the admin's session: admin_reports and admin_report_counts check
// is_admin(). The messages of a reported conversation are read through
// admin_report_read only, which writes the reading to the history of the
// report (« lecture complète autorisée dans ce cadre, tracée »): the page
// reads them, never its metadata, then the history (which shows that
// reading). Each read calls requireAdmin() too.

type Role = Database["public"]["Enums"]["user_role"];

export type AdminReportRow = {
  id: string;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  reference: string | null;
  listingTitle: string | null;
  reporterName: string | null;
  reporterDeleted: boolean;
  targetName: string | null;
  targetDeleted: boolean;
  targetSuspended: boolean;
};

export type AdminReportList = { rows: AdminReportRow[]; limited: boolean };

export type AdminReportCounts = { open: number; closed: number };

export type AdminReportPerson = {
  id: string;
  name: string | null;
  deleted: boolean;
  suspended: boolean;
  team: boolean;
  /** Their side of the conversation. */
  role: "seller" | "buyer" | null;
};

export type AdminReportHistoryEntry = {
  id: number;
  action: string;
  at: string;
  actorName: string | null;
  reason: string | null;
};

export type AdminReportDetail = {
  id: string;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  listing: { id: string; reference: string; title: string | null } | null;
  reporter: AdminReportPerson | null;
  /** The other party of the conversation: the one the report is about. */
  target: AdminReportPerson | null;
};

export type AdminReportMessage = {
  id: string;
  body: string;
  at: string;
  senderId: string | null;
  /** A message of Leenkey itself (a visit, an offer, the assistant), not of a party. */
  system: boolean;
};

/** Rows of /admin/signalements at most (admin_reports). */
export const ADMIN_REPORTS_LIMIT = 200;
const SHEET_LIMIT = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

function logFailure(read: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(`[admin] ${read} failed`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function adminReports({
  closed,
}: AdminReportsQuery): Promise<QueryResult<AdminReportList>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_reports", {
      p_open: !closed,
      p_limit: ADMIN_REPORTS_LIMIT + 1,
    });
    if (error) throw new Error(`admin_reports: ${error.code} ${error.message}`);
    return {
      ok: true,
      data: {
        limited: data.length > ADMIN_REPORTS_LIMIT,
        rows: data.slice(0, ADMIN_REPORTS_LIMIT).map((row) => ({
          id: row.id,
          reason: row.reason,
          createdAt: row.created_at,
          // Generated types declare the columns of a function result as never null.
          resolvedAt: row.resolved_at as string | null,
          reference: row.reference as string | null,
          listingTitle: row.listing_title as string | null,
          reporterName: fullName(
            row.reporter_first_name as string | null,
            row.reporter_last_name as string | null,
          ),
          reporterDeleted: row.reporter_deleted,
          targetName: fullName(
            row.target_first_name as string | null,
            row.target_last_name as string | null,
          ),
          targetDeleted: row.target_deleted,
          targetSuspended: (row.target_suspended_at as string | null) !== null,
        })),
      },
    };
  } catch (error) {
    logFailure("reports", error);
    return { ok: false, error: "unavailable" };
  }
}

export async function adminReportCounts(): Promise<QueryResult<AdminReportCounts>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_report_counts");
    if (error) throw new Error(`admin_report_counts: ${error.code} ${error.message}`);
    const row = data[0];
    return { ok: true, data: { open: row?.open ?? 0, closed: row?.resolved ?? 0 } };
  } catch (error) {
    logFailure("report counts", error);
    return { ok: false, error: "unavailable" };
  }
}

const reasonOf = (meta: unknown) =>
  typeof meta === "object" && meta !== null && "reason" in meta && typeof meta.reason === "string"
    ? meta.reason
    : null;

/**
 * The sheet of a report, without its messages nor its history; null when it
 * does not exist or the id is not one. Read once per request: the metadata
 * and the page share it.
 */
export const adminReport = cache(
  async (id: string): Promise<QueryResult<AdminReportDetail | null>> => {
    await requireAdmin();
    if (!UUID.test(id)) return { ok: true, data: null };
    try {
      const supabase = await createClient();
      const found = await supabase
        .from("reports")
        .select(
          "id, reason, created_at, resolved_at, reporter_id, conversation:conversations(seller_id, buyer_id, listing:listings(id, reference, title))",
        )
        .eq("id", id)
        .maybeSingle();
      if (found.error) throw new Error(`reports: ${found.error.code}`);
      if (!found.data) return { ok: true, data: null };
      const report = found.data;
      const conversation = one(report.conversation);
      const targetId =
        conversation === null
          ? null
          : report.reporter_id === conversation.seller_id
            ? conversation.buyer_id
            : conversation.seller_id;

      const wanted = [report.reporter_id, targetId].filter(
        (value): value is string => typeof value === "string",
      );
      const people = new Map<
        string,
        { name: string | null; deleted: boolean; suspended: boolean; roles: Role[] }
      >();
      if (wanted.length > 0) {
        const rows = await supabase
          .from("profiles")
          .select("id, first_name, last_name, deleted_at, suspended_at, roles")
          .in("id", wanted);
        if (rows.error) throw new Error(`profiles: ${rows.error.code}`);
        for (const person of rows.data) {
          people.set(person.id, {
            name: fullName(person.first_name, person.last_name),
            deleted: person.deleted_at !== null,
            suspended: person.suspended_at !== null,
            roles: person.roles,
          });
        }
      }
      const personOf = (personId: string | null): AdminReportPerson | null => {
        if (!personId) return null;
        const person = people.get(personId);
        return {
          id: personId,
          name: person?.name ?? null,
          deleted: person?.deleted ?? true,
          suspended: person?.suspended ?? false,
          team: person?.roles.includes("admin") ?? false,
          role:
            conversation === null
              ? null
              : personId === conversation.seller_id
                ? "seller"
                : personId === conversation.buyer_id
                  ? "buyer"
                  : null,
        };
      };
      const listing = one(conversation?.listing);
      return {
        ok: true,
        data: {
          id: report.id,
          reason: report.reason,
          createdAt: report.created_at,
          resolvedAt: report.resolved_at,
          listing: listing
            ? { id: listing.id, reference: listing.reference, title: listing.title }
            : null,
          reporter: personOf(report.reporter_id),
          target: personOf(targetId),
        },
      };
    } catch (error) {
      logFailure("report", error, { entity_id: id });
      return { ok: false, error: "unavailable" };
    }
  },
);

/**
 * The messages of the reported conversation, each reading written to the
 * history of the report (admin_report_read). Called by the page only.
 */
export const adminReportMessages = cache(
  async (id: string): Promise<QueryResult<AdminReportMessage[]>> => {
    await requireAdmin();
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("admin_report_read", { p_report: id });
      if (error) throw new Error(`admin_report_read: ${error.code} ${error.message}`);
      return {
        ok: true,
        data: data.map((message) => ({
          id: message.id,
          body: message.body,
          at: message.created_at,
          // Generated types declare the columns of a function result as never null.
          senderId: message.sender_id as string | null,
          system: message.kind !== "text" && message.kind !== "visit_invite",
        })),
      };
    } catch (error) {
      logFailure("report messages", error, { entity_id: id });
      return { ok: false, error: "unavailable" };
    }
  },
);

/**
 * The history of a report (audit_log), the latest first. Read by the page
 * after the messages: it shows the reading just written.
 */
export async function adminReportHistory(
  id: string,
): Promise<QueryResult<AdminReportHistoryEntry[]>> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: true, data: [] };
  try {
    const supabase = await createClient();
    const audit = await supabase
      .from("audit_log")
      .select("id, action, actor_id, created_at, meta")
      .eq("entity", "report")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(SHEET_LIMIT);
    if (audit.error) throw new Error(`audit_log: ${audit.error.code}`);
    const actors = [
      ...new Set(
        audit.data
          .map((entry) => entry.actor_id)
          .filter((value): value is string => typeof value === "string"),
      ),
    ];
    const names = new Map<string, string | null>();
    if (actors.length > 0) {
      const rows = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", actors);
      if (rows.error) throw new Error(`profiles: ${rows.error.code}`);
      for (const person of rows.data) {
        names.set(person.id, fullName(person.first_name, person.last_name));
      }
    }
    return {
      ok: true,
      data: audit.data.map((entry) => ({
        id: entry.id,
        action: entry.action,
        at: entry.created_at,
        actorName: entry.actor_id ? (names.get(entry.actor_id) ?? null) : null,
        reason: reasonOf(entry.meta),
      })),
    };
  } catch (error) {
    logFailure("report history", error, { entity_id: id });
    return { ok: false, error: "unavailable" };
  }
}
