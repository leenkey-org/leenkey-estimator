import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AdminCasesQuery } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { fullName, type QueryResult } from "../users/queries";

// Reads of the cases of the back office (L1-30c, SPEC-V2 section 17), with
// the admin's session: admin_cases and admin_case_counts check is_admin();
// the sheet reads the tables the RLS opens to the admin (the case, its notes,
// the property and its sale, the history in audit_log). Each read calls
// requireAdmin() too.

type CaseStatus = Database["public"]["Enums"]["case_status"];
type CaseSource = Database["public"]["Enums"]["case_source"];
type PlanCode = Database["public"]["Enums"]["plan_code"];
type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type AdminCaseRow = {
  id: string;
  subject: string;
  source: CaseSource;
  plan: PlanCode | null;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string | null;
  propertyId: string | null;
  reference: string | null;
  city: string | null;
  profileId: string;
  accountName: string | null;
  followedBy: string | null;
  /** A payment of the case to check (a note Stripe wrote, L1-26). */
  toCheck: boolean;
};

export type AdminCaseList = { rows: AdminCaseRow[]; limited: boolean };

export type AdminCaseCounts = {
  open: number;
  new: number;
  inProgress: number;
  closed: number;
  toCheck: number;
};

export type AdminCaseNote = {
  id: string;
  body: string;
  at: string;
  /** null: written by Leenkey itself (a payment, a refund). */
  authorName: string | null;
  automatic: boolean;
};

export type AdminCaseStep = {
  code: string;
  title: string;
  state: "done" | "current" | "next";
};

export type AdminCaseTask = { id: string; title: string; done: boolean };

export type AdminCaseHistoryEntry = {
  id: number;
  action: string;
  at: string;
  actorId: string | null;
  actorName: string | null;
  meta: Record<string, unknown>;
};

export type AdminCaseDetail = {
  id: string;
  subject: string;
  source: CaseSource;
  plan: PlanCode | null;
  status: CaseStatus;
  aiSummary: string | null;
  createdAt: string;
  account: { id: string; name: string | null; deleted: boolean };
  followedBy: { id: string; name: string | null } | null;
  property: {
    id: string;
    city: string;
    listing: { id: string; reference: string; title: string | null; status: ListingStatus } | null;
  } | null;
  /** The sale of the property: its steps and the tasks of Leenkey of the current one. */
  sale: {
    plan: PlanCode;
    currentStep: string | null;
    steps: AdminCaseStep[];
    tasks: AdminCaseTask[];
  } | null;
  notes: AdminCaseNote[];
  toCheck: boolean;
  history: AdminCaseHistoryEntry[];
  /** The names of the people of the history (its « to » of a follow-up). */
  names: Record<string, string>;
};

/** Rows of /admin/dossiers at most (admin_cases). */
export const ADMIN_CASES_LIMIT = 200;
const SHEET_LIMIT = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

/**
 * A note Stripe wrote about a payment to check (stripe_checkout_complete,
 * L1-26): the same rule as case_has_check in SQL.
 */
export const isCheckNote = (note: { automatic: boolean; body: string }) =>
  note.automatic && (note.body.startsWith("À vérifier") || note.body.includes("À vérifier :"));

function logFailure(read: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(`[admin] ${read} failed`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function adminCases({
  status,
  query,
}: AdminCasesQuery): Promise<QueryResult<AdminCaseList>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_cases", {
      p_status: status,
      p_query: query,
      p_limit: ADMIN_CASES_LIMIT + 1,
    });
    if (error) throw new Error(`admin_cases: ${error.code} ${error.message}`);
    return {
      ok: true,
      data: {
        limited: data.length > ADMIN_CASES_LIMIT,
        rows: data.slice(0, ADMIN_CASES_LIMIT).map((row) => ({
          id: row.id,
          subject: row.subject,
          source: row.source,
          // Generated types declare the columns of a function result as never null.
          plan: row.plan as PlanCode | null,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at as string | null,
          propertyId: row.property_id as string | null,
          reference: row.reference as string | null,
          city: row.city as string | null,
          profileId: row.profile_id,
          accountName: fullName(row.first_name as string | null, row.last_name as string | null),
          followedBy: fullName(
            row.assigned_first_name as string | null,
            row.assigned_last_name as string | null,
          ),
          toCheck: row.to_check,
        })),
      },
    };
  } catch (error) {
    logFailure("cases", error);
    return { ok: false, error: "unavailable" };
  }
}

export async function adminCaseCounts(): Promise<QueryResult<AdminCaseCounts>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_case_counts");
    if (error) throw new Error(`admin_case_counts: ${error.code} ${error.message}`);
    const row = data[0];
    return {
      ok: true,
      data: {
        open: row?.open ?? 0,
        new: row?.new ?? 0,
        inProgress: row?.in_progress ?? 0,
        closed: row?.closed ?? 0,
        toCheck: row?.to_check ?? 0,
      },
    };
  } catch (error) {
    logFailure("case counts", error);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * The sheet of a case; null when it does not exist or the id is not one (it
 * goes into a filter). Read once per request: the metadata and the page
 * share it.
 */
export const adminCase = cache(async (id: string): Promise<QueryResult<AdminCaseDetail | null>> => {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: true, data: null };
  try {
    const supabase = await createClient();
    const found = await supabase
      .from("cases")
      .select(
        "id, subject, source, plan, status, ai_summary, assigned_to, created_at, property_id, profile_id",
      )
      .eq("id", id)
      .maybeSingle();
    if (found.error) throw new Error(`cases: ${found.error.code}`);
    if (!found.data) return { ok: true, data: null };
    const item = found.data;

    const [property, notes, audit] = await Promise.all([
      item.property_id
        ? supabase
            .from("properties")
            .select(
              "id, city, deleted_at, listing:listings(id, reference, title, status), progress:sale_progress(plan, current_step_code)",
            )
            .eq("id", item.property_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("case_notes")
        .select("id, author_id, body, created_at")
        .eq("case_id", id)
        // The latest ones, shown from the oldest (reversed below).
        .order("created_at", { ascending: false })
        .limit(SHEET_LIMIT),
      supabase
        .from("audit_log")
        .select("id, action, actor_id, created_at, meta")
        .eq("entity", "case")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(SHEET_LIMIT),
    ]);
    if (property.error) throw new Error(`properties: ${property.error.code}`);
    if (notes.error) throw new Error(`case_notes: ${notes.error.code}`);
    if (audit.error) throw new Error(`audit_log: ${audit.error.code}`);

    // The sale of the property: the steps of its plan, the tasks done.
    const progress = one(property.data?.progress);
    let sale: AdminCaseDetail["sale"] = null;
    if (property.data && !property.data.deleted_at && progress) {
      const [steps, done] = await Promise.all([
        supabase
          .from("sale_steps")
          .select(
            "id, code, position, title, owner, tasks:sale_step_tasks(id, title, owner, auto_trigger, position)",
          )
          .eq("plan", progress.plan)
          .order("position", { ascending: true }),
        supabase
          .from("sale_task_status")
          .select("task_id, done_at")
          .eq("property_id", property.data.id)
          .not("done_at", "is", null),
      ]);
      if (steps.error) throw new Error(`sale_steps: ${steps.error.code}`);
      if (done.error) throw new Error(`sale_task_status: ${done.error.code}`);
      const doneIds = new Set(done.data.map((row) => row.task_id));
      const current = steps.data.find((step) => step.code === progress.current_step_code);
      const currentPosition = current?.position ?? Number.POSITIVE_INFINITY;
      sale = {
        plan: progress.plan,
        currentStep: current?.title ?? null,
        steps: steps.data.map((step) => ({
          code: step.code,
          title: step.title,
          state:
            step.position < currentPosition
              ? "done"
              : step.position === currentPosition
                ? "current"
                : "next",
        })),
        tasks: (current?.tasks ?? [])
          .filter(
            (task) =>
              task.auto_trigger === null &&
              ["leenkey", "both"].includes(task.owner ?? current?.owner ?? ""),
          )
          .sort((a, b) => a.position - b.position)
          .map((task) => ({ id: task.id, title: task.title, done: doneIds.has(task.id) })),
      };
    }

    // The names of the account, of who follows it, of the authors and actors.
    const followedTo = audit.data.flatMap((entry) => {
      const to =
        entry.meta && typeof entry.meta === "object" ? Reflect.get(entry.meta, "to") : null;
      return typeof to === "string" && UUID.test(to) ? [to] : [];
    });
    const wanted = [
      ...new Set(
        [
          item.profile_id,
          item.assigned_to,
          ...notes.data.map((note) => note.author_id),
          ...audit.data.map((entry) => entry.actor_id),
          ...followedTo,
        ].filter((value): value is string => typeof value === "string"),
      ),
    ];
    const people = new Map<string, { name: string | null; deleted: boolean }>();
    if (wanted.length > 0) {
      const rows = await supabase
        .from("profiles")
        .select("id, first_name, last_name, deleted_at")
        .in("id", wanted);
      if (rows.error) throw new Error(`profiles: ${rows.error.code}`);
      for (const person of rows.data) {
        people.set(person.id, {
          name: fullName(person.first_name, person.last_name),
          deleted: person.deleted_at !== null,
        });
      }
    }
    const listing = one(property.data?.listing);
    const caseNotes: AdminCaseNote[] = [...notes.data].reverse().map((note) => ({
      id: note.id,
      body: note.body,
      at: note.created_at,
      authorName: note.author_id ? (people.get(note.author_id)?.name ?? null) : null,
      automatic: note.author_id === null,
    }));
    const account = people.get(item.profile_id);
    return {
      ok: true,
      data: {
        id: item.id,
        subject: item.subject,
        source: item.source,
        plan: item.plan,
        status: item.status,
        aiSummary: item.ai_summary,
        createdAt: item.created_at,
        account: {
          id: item.profile_id,
          name: account?.name ?? null,
          deleted: account?.deleted ?? false,
        },
        followedBy: item.assigned_to
          ? { id: item.assigned_to, name: people.get(item.assigned_to)?.name ?? null }
          : null,
        property:
          property.data && !property.data.deleted_at
            ? {
                id: property.data.id,
                city: property.data.city,
                listing: listing
                  ? {
                      id: listing.id,
                      reference: listing.reference,
                      title: listing.title,
                      status: listing.status,
                    }
                  : null,
              }
            : null,
        sale,
        notes: caseNotes,
        toCheck: item.status !== "closed" && caseNotes.some(isCheckNote),
        history: audit.data.map((entry) => ({
          id: entry.id,
          action: entry.action,
          at: entry.created_at,
          actorId: entry.actor_id,
          actorName: entry.actor_id ? (people.get(entry.actor_id)?.name ?? null) : null,
          meta:
            entry.meta && typeof entry.meta === "object" && !Array.isArray(entry.meta)
              ? (entry.meta as Record<string, unknown>)
              : {},
        })),
        names: Object.fromEntries(
          [...people.entries()].flatMap(([personId, person]) =>
            person.name ? [[personId, person.name]] : [],
          ),
        ),
      },
    };
  } catch (error) {
    logFailure("case", error, { entity_id: id });
    return { ok: false, error: "unavailable" };
  }
});
