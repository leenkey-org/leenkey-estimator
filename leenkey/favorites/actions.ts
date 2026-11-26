"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { chunk } from "@/lib/utils";
import type { ZodError } from "zod";
import {
  RESERVED_LIST_NAME_ISSUE,
  favoriteListCreateSchema,
  favoriteListDeleteSchema,
  favoriteListRenameSchema,
  favoriteMoveSchema,
  favoriteSchema,
} from "@/lib/validations/favorites";
import { IDS_PER_REQUEST } from "./queries";

export type FavoriteResult =
  /** at: server time of the change (favorite-store.ts). */
  | { ok: true; data: { favorite: boolean; at: number } }
  | { ok: false; error: "invalid" | "auth" | "unavailable" };

/**
 * Adds or removes a favourite (L1-18), with the visitor's session: RLS only
 * lets an active account add a published listing to its own favourites.
 * Idempotent. No revalidatePath: the pages that show favourites are read
 * at each visit, and the favourites page keeps a removed card until then,
 * so that a mistaken tap can be undone.
 */
export async function setFavorite(input: unknown): Promise<FavoriteResult> {
  const parsed = favoriteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const { listingId, favorite } = parsed.data;
  const supabase = await createClient();
  const { error } = favorite
    ? await supabase.from("favorites").insert({ buyer_id: profile.id, listing_id: listingId })
    : await supabase
        .from("favorites")
        .delete()
        .eq("buyer_id", profile.id)
        .eq("listing_id", listingId);
  // 23505: already saved (a second tab, a double tap).
  if (error && error.code !== "23505") {
    console.error("[favorites] write failed", {
      user_id: profile.id,
      entity_id: listingId,
      favorite,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: { favorite, at: Date.now() } };
}

/**
 * Removes the favourites that are no longer online (sold, paused, suspended):
 * the favourites page cannot show them, only count them. No input, hence no
 * Zod schema: the account is the session's.
 */
export async function clearOfflineFavorites(): Promise<
  { ok: true; data: { removed: number } } | { ok: false; error: "auth" | "unavailable" }
> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const supabase = await createClient();
  try {
    const saved = await supabase.from("favorites").select("listing_id").eq("buyer_id", profile.id);
    if (saved.error) throw new Error(`favorites: ${saved.error.code}`);
    const ids = saved.data.map((row) => row.listing_id);
    if (ids.length === 0) return { ok: true, data: { removed: 0 } };
    const onlineIds = new Set<string | null>();
    for (const part of chunk(ids, IDS_PER_REQUEST)) {
      const online = await supabase.from("public_listings").select("id").in("id", part);
      if (online.error) throw new Error(`public_listings: ${online.error.code}`);
      for (const row of online.data) onlineIds.add(row.id);
    }
    const offline = ids.filter((id) => !onlineIds.has(id));
    for (const part of chunk(offline, IDS_PER_REQUEST)) {
      const removed = await supabase
        .from("favorites")
        .delete()
        .eq("buyer_id", profile.id)
        .in("listing_id", part);
      if (removed.error) throw new Error(`favorites delete: ${removed.error.code}`);
    }
    revalidatePath("/acquereur/favoris");
    return { ok: true, data: { removed: offline.length } };
  } catch (error) {
    console.error("[favorites] clearing offline favourites failed", {
      user_id: profile.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}

// ---------------------------------------------------------------------------
// Named lists of favourites (DECISIONS.md 2026-11-26), with the session of the
// account: RLS only lets it write its own lists and file its own favourites
// (supabase/migrations/20261126120000_favorite_lists.sql).
// ---------------------------------------------------------------------------

/**
 * reserved: the name of a filter of the page (« Tous », « Sans liste »);
 * duplicate: the account already has a list of that name; limit: 20 lists;
 * missing: the list or the favourite is gone (deleted from another tab).
 */
export type FavoriteListError =
  | "invalid"
  | "reserved"
  | "auth"
  | "duplicate"
  | "limit"
  | "missing"
  | "unavailable";

export type FavoriteListResult<T> = { ok: true; data: T } | { ok: false; error: FavoriteListError };

/** Why a name was refused before any query. */
function nameIssue(error: ZodError): FavoriteListError {
  return error.issues.some((issue) => issue.message === RESERVED_LIST_NAME_ISSUE)
    ? "reserved"
    : "invalid";
}

/** What Postgres refused, as the error the interface explains. */
function listError(code: string | undefined): FavoriteListError {
  // 23505: favorite_lists_owner_name_key; 54000: favorite_lists_limit;
  // 23514: the check of the name; 23503: the list was deleted meanwhile.
  if (code === "23505") return "duplicate";
  if (code === "54000") return "limit";
  if (code === "23514") return "invalid";
  if (code === "23503") return "missing";
  return "unavailable";
}

export async function createFavoriteList(
  input: unknown,
): Promise<FavoriteListResult<{ id: string; name: string }>> {
  const parsed = favoriteListCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: nameIssue(parsed.error) };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorite_lists")
    .insert({ owner_id: profile.id, name: parsed.data.name })
    .select("id, name")
    .single();
  if (error) {
    const reason = listError(error.code);
    if (reason === "unavailable") {
      console.error("[favorites] list not created", { user_id: profile.id, code: error.code });
    }
    return { ok: false, error: reason };
  }
  revalidatePath("/acquereur/favoris");
  return { ok: true, data };
}

export async function renameFavoriteList(
  input: unknown,
): Promise<FavoriteListResult<{ id: string; name: string }>> {
  const parsed = favoriteListRenameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: nameIssue(parsed.error) };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const { listId, name } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorite_lists")
    .update({ name })
    .eq("id", listId)
    .eq("owner_id", profile.id)
    .select("id, name")
    .maybeSingle();
  if (error) {
    const reason = listError(error.code);
    if (reason === "unavailable") {
      console.error("[favorites] list not renamed", {
        user_id: profile.id,
        entity_id: listId,
        code: error.code,
      });
    }
    return { ok: false, error: reason };
  }
  revalidatePath("/acquereur/favoris");
  // No row: the list was deleted (another tab).
  if (!data) return { ok: false, error: "missing" };
  return { ok: true, data };
}

/** Deletes a list; its favourites stay saved, in no list. Idempotent. */
export async function deleteFavoriteList(
  input: unknown,
): Promise<FavoriteListResult<{ id: string }>> {
  const parsed = favoriteListDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const { listId } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("favorite_lists")
    .delete()
    .eq("id", listId)
    .eq("owner_id", profile.id);
  if (error) {
    console.error("[favorites] list not deleted", {
      user_id: profile.id,
      entity_id: listId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/acquereur/favoris");
  return { ok: true, data: { id: listId } };
}

/** Files a favourite into one of the lists of the account, or into none. */
export async function moveFavoriteToList(
  input: unknown,
): Promise<FavoriteListResult<{ listingId: string; listId: string | null }>> {
  const parsed = favoriteMoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const { listingId, listId } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .update({ list_id: listId })
    .eq("buyer_id", profile.id)
    .eq("listing_id", listingId)
    .select("listing_id")
    .maybeSingle();
  if (error) {
    // 42501: not a list of the account (deleted from another tab, forged).
    const reason = error.code === "42501" ? "missing" : listError(error.code);
    if (error.code === "42501") {
      console.warn("[favorites] favourite not filed: not a list of the account", {
        user_id: profile.id,
        entity_id: listingId,
        list_id: listId,
      });
    }
    if (reason === "unavailable") {
      console.error("[favorites] favourite not filed", {
        user_id: profile.id,
        entity_id: listingId,
        code: error.code,
      });
    }
    // The page is read again: its lists may be out of date.
    if (reason === "missing") revalidatePath("/acquereur/favoris");
    return { ok: false, error: reason };
  }
  revalidatePath("/acquereur/favoris");
  // No row: the favourite was removed (the heart, another tab).
  if (!data) return { ok: false, error: "missing" };
  return { ok: true, data: { listingId, listId } };
}
