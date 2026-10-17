import { z } from "zod";
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
