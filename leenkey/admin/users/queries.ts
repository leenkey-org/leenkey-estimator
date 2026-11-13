import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AdminUsersQuery } from "@/lib/validations/admin";
import type { Database } from "@/types/database";

// Reads of the users of the back office (L1-30a, SPEC-V2 section 17), with
// the admin's session: admin_users and admin_user_contact check is_admin()
// and give the address kept in auth.users; the rest comes from the tables,
// which the RLS opens to the admin. Each read calls requireAdmin() too.
// Conversations: their metadata only, never their messages (SPEC 17).

type Role = Database["public"]["Enums"]["user_role"];
type PlanCode = Database["public"]["Enums"]["plan_code"];
type FinancingStatus = Database["public"]["Enums"]["financing_status"];
type ListingStatus = Database["public"]["Enums"]["listing_status"];
type CaseStatus = Database["public"]["Enums"]["case_status"];
type BuyerProject = Database["public"]["Enums"]["buyer_project"];

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  roles: Role[];
  createdAt: string;
  suspendedAt: string | null;
  properties: number;
  /** The dearest paid plan in force on one of their properties, null when none. */
  paidPlan: PlanCode | null;
  /** Of the buyer profile; null without one. */
  financingStatus: FinancingStatus | null;
};

export type AdminUserList = { rows: AdminUserRow[]; limited: boolean };

export type AdminUserCounts = {
  total: number;
  sellers: number;
  buyers: number;
  admins: number;
  suspended: number;
};

export type AdminUserProperty = {
  id: string;
  /** The title of its listing, null before step 3. */
  title: string | null;
  type: Database["public"]["Enums"]["property_type"] | null;
  rooms: number | null;
  city: string;
  listing: { id: string; reference: string; status: ListingStatus } | null;
  plan: PlanCode;
  coverPath: string | null;
};

export type AdminUserConversation = {
  id: string;
  /** The account in this conversation. */
  role: "seller" | "buyer";
  /** The other side: its name, null without one, « deleted » for a deleted account. */
  counterpart: { name: string | null; deleted: boolean } | null;
  listingTitle: string | null;
  lastMessageAt: string | null;
  closed: boolean;
};

export type AdminUserCase = { id: string; subject: string; status: CaseStatus; createdAt: string };

export type AdminUserHistoryEntry = {
  id: number;
  action: string;
  at: string;
  actorName: string | null;
  reason: string | null;
};

export type AdminUserDetail = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  roles: Role[];
  createdAt: string;
  suspendedAt: string | null;
  suspensionReason: string | null;
  properties: AdminUserProperty[];
  buyer: {
    project: BuyerProject | null;
    targetCities: string[];
    financingStatus: FinancingStatus;
  } | null;
  conversations: AdminUserConversation[];
  cases: AdminUserCase[];
  history: AdminUserHistoryEntry[];
};

/** Rows of /admin/utilisateurs at most (admin_users). */
export const ADMIN_USERS_LIMIT = 200;
/** Items of each list of the sheet at most. */
const SHEET_LIMIT = 50;

export const fullName = (first: string | null, last: string | null) =>
  [first, last].filter(Boolean).join(" ") || null;

function logFailure(read: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(`[admin] ${read} failed`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });
}

/** Rows of /admin/utilisateurs, the most recent first; one more read to know whether the list is cut. */
export async function adminUsers({
  filter,
  query,
}: AdminUsersQuery): Promise<QueryResult<AdminUserList>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_users", {
      p_filter: filter,
      p_query: query,
      p_limit: ADMIN_USERS_LIMIT + 1,
    });
    if (error) throw new Error(`admin_users: ${error.code} ${error.message}`);
    return {
      ok: true,
      data: {
        limited: data.length > ADMIN_USERS_LIMIT,
        rows: data.slice(0, ADMIN_USERS_LIMIT).map((row) => ({
          id: row.id,
          // Generated types declare the columns of a function result as never null.
          name: fullName(row.first_name as string | null, row.last_name as string | null),
          email: row.email,
          roles: row.roles,
          createdAt: row.created_at,
          suspendedAt: row.suspended_at as string | null,
          properties: row.properties,
          paidPlan: row.paid_plan as PlanCode | null,
          financingStatus: row.financing_status as FinancingStatus | null,
        })),
      },
    };
  } catch (error) {
    logFailure("users", error);
    return { ok: false, error: "unavailable" };
  }
}

export async function adminUserCounts(): Promise<QueryResult<AdminUserCounts>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_user_counts");
    if (error) throw new Error(`admin_user_counts: ${error.code} ${error.message}`);
    const row = data[0];
    return {
      ok: true,
      data: {
        total: row?.total ?? 0,
        sellers: row?.sellers ?? 0,
        buyers: row?.buyers ?? 0,
        admins: row?.admins ?? 0,
        suspended: row?.suspended ?? 0,
      },
    };
  } catch (error) {
    logFailure("user counts", error);
    return { ok: false, error: "unavailable" };
  }
}

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The sheet of an account; null when it does not exist, was deleted or the
 * id is not one (it goes into a filter). Read once per request: the metadata
 * and the page share it.
 */
export const adminUser = cache(async (id: string): Promise<QueryResult<AdminUserDetail | null>> => {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: true, data: null };
  try {
    const supabase = await createClient();
    const profile = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, phone, roles, created_at, suspended_at, suspension_reason, deleted_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (profile.error) throw new Error(`profiles: ${profile.error.code}`);
    if (!profile.data || profile.data.deleted_at) return { ok: true, data: null };

    const [contact, properties, buyer, conversations, cases, audit] = await Promise.all([
      supabase.rpc("admin_user_contact", { p_profile_id: id }),
      supabase
        .from("properties")
        .select(
          "id, type, rooms, city, created_at, listing:listings(id, reference, title, status), progress:sale_progress(plan), photos(storage_path, is_cover)",
        )
        .eq("owner_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(SHEET_LIMIT),
      supabase
        .from("buyer_profiles")
        .select("project, target_cities, financing_status")
        .eq("profile_id", id)
        .maybeSingle(),
      supabase
        .from("conversations")
        .select(
          "id, kind, seller_id, buyer_id, last_message_at, created_at, closed_at, listing:listings(title)",
        )
        .eq("kind", "listing")
        .or(`seller_id.eq.${id},buyer_id.eq.${id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(SHEET_LIMIT),
      supabase
        .from("cases")
        .select("id, subject, status, created_at")
        .eq("profile_id", id)
        .order("created_at", { ascending: false })
        .limit(SHEET_LIMIT),
      supabase
        .from("audit_log")
        .select("id, action, actor_id, created_at, meta")
        .eq("entity", "profile")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(SHEET_LIMIT),
    ]);
    if (contact.error) throw new Error(`admin_user_contact: ${contact.error.code}`);
    if (properties.error) throw new Error(`properties: ${properties.error.code}`);
    if (buyer.error) throw new Error(`buyer_profiles: ${buyer.error.code}`);
    if (conversations.error) throw new Error(`conversations: ${conversations.error.code}`);
    if (cases.error) throw new Error(`cases: ${cases.error.code}`);
    if (audit.error) throw new Error(`audit_log: ${audit.error.code}`);

    // The names of the other side of each conversation and of the authors of the history.
    const counterpartIds = conversations.data.flatMap(
      (row) => (row.seller_id === id ? row.buyer_id : row.seller_id) ?? [],
    );
    const actorIds = audit.data.flatMap((entry) => entry.actor_id ?? []);
    // The RLS lets the admin read a deleted profile: said as such, not by its name.
    const people = new Map<string, { name: string | null; deleted: boolean }>();
    const wanted = [...new Set([...counterpartIds, ...actorIds])];
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

    const reachable = contact.data[0];
    const metaReason = (meta: unknown) =>
      typeof meta === "object" &&
      meta !== null &&
      "reason" in meta &&
      typeof meta.reason === "string"
        ? meta.reason
        : null;
    return {
      ok: true,
      data: {
        id,
        firstName: profile.data.first_name,
        lastName: profile.data.last_name,
        email: reachable?.email ?? null,
        phone: profile.data.phone,
        emailConfirmedAt: (reachable?.confirmed_at as string | null | undefined) ?? null,
        lastSignInAt: (reachable?.last_sign_in_at as string | null | undefined) ?? null,
        roles: profile.data.roles,
        createdAt: profile.data.created_at,
        suspendedAt: profile.data.suspended_at,
        suspensionReason: profile.data.suspension_reason,
        properties: properties.data.map((row) => {
          const listing = one(row.listing);
          const progress = one(row.progress);
          return {
            id: row.id,
            title: listing?.title ?? null,
            type: row.type,
            rooms: row.rooms,
            city: row.city,
            listing: listing
              ? { id: listing.id, reference: listing.reference, status: listing.status }
              : null,
            plan: progress?.plan ?? "autonomie",
            coverPath: row.photos.find((photo) => photo.is_cover)?.storage_path ?? null,
          };
        }),
        buyer: buyer.data
          ? {
              project: buyer.data.project,
              targetCities: buyer.data.target_cities ?? [],
              financingStatus: buyer.data.financing_status,
            }
          : null,
        conversations: conversations.data.map((row) => {
          const role = row.seller_id === id ? ("seller" as const) : ("buyer" as const);
          const other = role === "seller" ? row.buyer_id : row.seller_id;
          return {
            id: row.id,
            role,
            counterpart: other ? (people.get(other) ?? null) : null,
            listingTitle: one(row.listing)?.title ?? null,
            lastMessageAt: row.last_message_at ?? row.created_at,
            closed: row.closed_at !== null,
          };
        }),
        cases: cases.data.map((row) => ({
          id: row.id,
          subject: row.subject,
          status: row.status,
          createdAt: row.created_at,
        })),
        history: audit.data.map((entry) => ({
          id: entry.id,
          action: entry.action,
          at: entry.created_at,
          actorName: entry.actor_id ? (people.get(entry.actor_id)?.name ?? null) : null,
          reason: metaReason(entry.meta),
        })),
      },
    };
  } catch (error) {
    logFailure("user", error, { entity_id: id });
    return { ok: false, error: "unavailable" };
  }
});

/** A proof of financing as the team reads it (L2-02): with its note and who checked. */
export type AdminFinancingDocument = {
  id: string;
  type: Database["public"]["Enums"]["financing_document_type"];
  documentDate: string;
  isPdf: boolean;
  createdAt: string;
  removedAt: string | null;
  checkedAt: string | null;
  checkedByName: string | null;
  note: string | null;
  /** The one in force for the buyer: the only one to check. */
  current: boolean;
};

/** The proofs of financing of a buyer, the most recent first (admin_financing_documents). */
export async function adminFinancingDocuments(
  buyerId: string,
): Promise<QueryResult<AdminFinancingDocument[]>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_financing_documents", {
      p_buyer_id: buyerId,
    });
    if (error) throw new Error(`admin_financing_documents: ${error.code} ${error.message}`);
    return {
      ok: true,
      data: data.map((row) => ({
        id: row.id,
        type: row.type,
        documentDate: row.document_date,
        isPdf: row.mime_type === "application/pdf",
        createdAt: row.created_at,
        // Generated types declare the columns of a function result as never null.
        removedAt: (row.deleted_at as string | null) ?? null,
        checkedAt: (row.checked_at as string | null) ?? null,
        checkedByName: (row.checked_by_name as string | null) ?? null,
        note: (row.check_note as string | null) ?? null,
        current: row.is_current,
      })),
    };
  } catch (error) {
    logFailure("financing documents", error, { entity_id: buyerId });
    return { ok: false, error: "unavailable" };
  }
}
