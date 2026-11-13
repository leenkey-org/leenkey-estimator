import { z } from "zod";
import { planCode } from "./billing";
import type { Database } from "@/types/database";

// L1-19: back office of the listings (SPEC-V2 section 17).

type ListingStatus = Database["public"]["Enums"]["listing_status"];

/** Status filters of /admin/annonces, in the order of the pills, with their URL value. */
export const ADMIN_LISTING_FILTERS = [
  { status: "pending", param: "a-valider" },
  { status: "published", param: "en-ligne" },
  { status: "suspended", param: "suspendues" },
  { status: "rejected", param: "a-corriger" },
  { status: "paused", param: "en-pause" },
  { status: "sold", param: "vendues" },
  { status: "draft", param: "brouillons" },
] as const satisfies ReadonlyArray<{ status: ListingStatus; param: string }>;

const PARAMS = ADMIN_LISTING_FILTERS.map((filter) => filter.param) as [string, ...string[]];

export type AdminListingsQuery = { status?: ListingStatus; query?: string };

/** /admin/annonces?statut=a-valider&q=juvisy; anything unknown is ignored. */
export function parseAdminListingsQuery(
  params: Record<string, string | string[] | undefined>,
): AdminListingsQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const param = z.enum(PARAMS).safeParse(first(params.statut));
  const query = z.string().trim().min(1).max(100).safeParse(first(params.q));
  return {
    status: param.success
      ? ADMIN_LISTING_FILTERS.find((filter) => filter.param === param.data)?.status
      : undefined,
    query: query.success ? query.data : undefined,
  };
}

/** Address of the list for a filter and a search. */
export function adminListingsHref({ status, query }: AdminListingsQuery): string {
  const params = new URLSearchParams();
  const param = ADMIN_LISTING_FILTERS.find((filter) => filter.status === status)?.param;
  if (param) params.set("statut", param);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/admin/annonces?${search}` : "/admin/annonces";
}

/** The motive drafted by the assistant, at most (the prompt asks 600; the field holds 1 000). */
export const REJECTION_DRAFT_MAX = 800;

/** « Rédiger avec l'assistant » in the refusal of a listing (L1-30d). */
export const rejectionDraftSchema = z.object({
  listingId: z.string().uuid(),
  /** What the field holds when the team asks: the reason, in a few words. */
  notes: z.string().max(1_000),
});

/** The CSV export of the same list (L1-30d). */
export function adminListingsExportHref(filter: AdminListingsQuery): string {
  return adminListingsHref(filter).replace("/admin/annonces", "/admin/annonces/export");
}

const listingId = z.string().uuid();

/** Characters of a motive, at least: what listing_reject and listing_suspend require. */
export const REASON_MIN = 3;

/**
 * Length of a motive as Postgres counts it (char_length: code points, not the
 * UTF-16 units of String.length, two for an emoji).
 */
export function reasonLength(value: string): number {
  return [...value.trim()].length;
}

/** Sent as is to the seller. */
const reason = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => reasonLength(value) >= REASON_MIN);

export const moderationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), listingId }),
  z.object({ action: z.literal("reject"), listingId, reason }),
  z.object({ action: z.literal("suspend"), listingId, reason }),
  z.object({ action: z.literal("unsuspend"), listingId }),
]);

export type ModerationInput = z.infer<typeof moderationSchema>;
export type ModerationAction = ModerationInput["action"];

// L1-30a: the users of the back office (SPEC-V2 section 17).

/** Filters of /admin/utilisateurs, in the order of the pills, with their URL value. */
export const ADMIN_USER_FILTERS = [
  { filter: "seller", param: "vendeurs" },
  { filter: "buyer", param: "acquereurs" },
  { filter: "admin", param: "equipe" },
  { filter: "suspended", param: "suspendus" },
] as const;

export type AdminUserFilter = (typeof ADMIN_USER_FILTERS)[number]["filter"];
export type AdminUsersQuery = { filter?: AdminUserFilter; query?: string };

const USER_PARAMS = ADMIN_USER_FILTERS.map((filter) => filter.param) as [string, ...string[]];

/** /admin/utilisateurs?filtre=vendeurs&q=martin; anything unknown is ignored. */
export function parseAdminUsersQuery(
  params: Record<string, string | string[] | undefined>,
): AdminUsersQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const param = z.enum(USER_PARAMS).safeParse(first(params.filtre));
  const query = z.string().trim().min(1).max(100).safeParse(first(params.q));
  return {
    filter: param.success
      ? ADMIN_USER_FILTERS.find((filter) => filter.param === param.data)?.filter
      : undefined,
    query: query.success ? query.data : undefined,
  };
}

/** Address of the list of the users for a filter and a search. */
export function adminUsersHref({ filter, query }: AdminUsersQuery): string {
  const params = new URLSearchParams();
  const param = ADMIN_USER_FILTERS.find((candidate) => candidate.filter === filter)?.param;
  if (param) params.set("filtre", param);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/admin/utilisateurs?${search}` : "/admin/utilisateurs";
}

const profileId = z.string().uuid();

/** Suspend an account (a motive sent to its owner by email) or lift the suspension. */
export const accountDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), profileId, reason }),
  z.object({ action: z.literal("unsuspend"), profileId }),
]);

export type AccountDecisionInput = z.infer<typeof accountDecisionSchema>;

/** The note of the team on a proof of financing (financing_documents.check_note). */
export const FINANCING_NOTE_MAX = 1000;

/** « Marquer le justificatif comme vérifié » (L2-02, SPEC-V2 13 and 17). */
export const financingCheckSchema = z.object({
  documentId: z.string().uuid(),
  profileId,
  note: z.string().trim().max(FINANCING_NOTE_MAX),
});

export type FinancingCheckInput = z.infer<typeof financingCheckSchema>;

// L1-30c: the cases and the reports of the back office (SPEC-V2 section 17).

type CaseStatus = Database["public"]["Enums"]["case_status"];

/** Status filters of /admin/dossiers (without one: the open cases), with their URL value. */
export const ADMIN_CASE_FILTERS = [
  { status: "new", param: "nouveaux" },
  { status: "in_progress", param: "en-cours" },
  { status: "closed", param: "clos" },
] as const satisfies ReadonlyArray<{ status: CaseStatus; param: string }>;

export type AdminCasesQuery = { status?: CaseStatus; query?: string };

const CASE_PARAMS = ADMIN_CASE_FILTERS.map((filter) => filter.param) as [string, ...string[]];

const firstOf = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** /admin/dossiers?statut=en-cours&q=LK-0001; anything unknown is ignored. */
export function parseAdminCasesQuery(
  params: Record<string, string | string[] | undefined>,
): AdminCasesQuery {
  const param = z.enum(CASE_PARAMS).safeParse(firstOf(params.statut));
  const query = z.string().trim().min(1).max(100).safeParse(firstOf(params.q));
  return {
    status: param.success
      ? ADMIN_CASE_FILTERS.find((filter) => filter.param === param.data)?.status
      : undefined,
    query: query.success ? query.data : undefined,
  };
}

/** Address of the list of the cases for a filter and a search. */
export function adminCasesHref({ status, query }: AdminCasesQuery): string {
  const params = new URLSearchParams();
  const param = ADMIN_CASE_FILTERS.find((filter) => filter.status === status)?.param;
  if (param) params.set("statut", param);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/admin/dossiers?${search}` : "/admin/dossiers";
}

export type AdminReportsQuery = { closed: boolean };

/** /admin/signalements?statut=clos: the closed reports; the open ones otherwise. */
export function parseAdminReportsQuery(
  params: Record<string, string | string[] | undefined>,
): AdminReportsQuery {
  return { closed: firstOf(params.statut) === "clos" };
}

export function adminReportsHref({ closed }: AdminReportsQuery): string {
  return closed ? "/admin/signalements?statut=clos" : "/admin/signalements";
}

/**
 * /admin/messages?formule=…: the advisor conversations of one plan (L1-34);
 * the plans offered are those of the conversations, never a list in the code.
 */
export type AdminMessagesQuery = { plan: z.infer<typeof planCode> | null };

export function parseAdminMessagesQuery(
  params: Record<string, string | string[] | undefined>,
): AdminMessagesQuery {
  const plan = planCode.safeParse(firstOf(params.formule));
  return { plan: plan.success ? plan.data : null };
}

export function adminMessagesHref({ plan }: AdminMessagesQuery): string {
  return plan ? `/admin/messages?formule=${plan}` : "/admin/messages";
}

const caseId = z.string().uuid();

/** A change of a case: its status, who follows it (the admin, or nobody), a note, a task of Leenkey. */
export const caseCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    caseId,
    status: z.enum(["new", "in_progress", "closed"]),
  }),
  z.object({ action: z.literal("follow"), caseId, follow: z.boolean() }),
  z.object({
    action: z.literal("note"),
    caseId,
    body: z
      .string()
      .trim()
      .min(1)
      .refine((value) => reasonLength(value) <= 4000),
  }),
  z.object({ action: z.literal("task"), caseId, taskId: z.string().uuid(), done: z.boolean() }),
]);

export type CaseCommand = z.infer<typeof caseCommandSchema>;

const reportId = z.string().uuid();

/** A report closed with what was done, or its other party warned (the reason sent by email). */
export const reportCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resolve"), reportId, note: reason }),
  z.object({ action: z.literal("warn"), reportId, reason }),
]);

export type ReportCommand = z.infer<typeof reportCommandSchema>;
