import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAnonKey, supabaseUrl } from "./config";

// Anonymous client that never reads nor writes a session cookie: for public
// data, including responses cached by the CDN (share image), where a
// refreshed session cookie must never be sent.
export function createPublicClient() {
  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/**
 * Anonymous client whose session, if an auth call opens one, stays in its
 * memory only: never in the cookies of the browser. For an auth step that
 * must not sign the browser in (checking a password, the link of a change of
 * address, L1-39), then signed out of with `signOut({ scope: "local" })`.
 */
export function createStatelessClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
