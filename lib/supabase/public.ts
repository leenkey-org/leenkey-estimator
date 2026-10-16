import "server-only";
import { createServerClient } from "@supabase/ssr";
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
