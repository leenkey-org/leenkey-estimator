"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { VIEW_COOKIE, parisDay, readViewCookie, writeViewCookie } from "./view-cookie";
import { createClient } from "@/lib/supabase/server";

// Server actions of the public listing page.

/**
 * Counts a view of a published listing (SPEC-V2 8.5), on the server, once per
 * visitor and per day: the listings already counted today come with the
 * request in a cookie. The SQL function ignores the seller of the listing
 * and the admins when they are signed in, and anything not published.
 *
 * Returns the new value of the cookie, written by the page: setting a cookie
 * from a server action makes Next.js render the whole page again.
 */
export async function recordListingView(
  input: unknown,
): Promise<
  { ok: true; data: { cookie: string } } | { ok: false; error: "invalid" | "unavailable" }
> {
  const parsed = z.string().uuid().safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const listingId = parsed.data;

  const today = parisDay();
  const seen = readViewCookie((await cookies()).get(VIEW_COOKIE)?.value, today);
  if (seen.includes(listingId)) return { ok: true, data: { cookie: writeViewCookie(today, seen) } };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("listing_view_increment", { p_listing_id: listingId });
    if (error) throw new Error(`listing_view_increment: ${error.code} ${error.message}`);
  } catch (error) {
    console.error("[listings] recordListingView failed", {
      listing_id: listingId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: { cookie: writeViewCookie(today, [...seen, listingId]) } };
}
