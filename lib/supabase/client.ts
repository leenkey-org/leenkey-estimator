"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

// Browser client, reserved for Realtime subscriptions (messages, notifications).
// Never query tables from a client component: go through a server action
// or a route handler (CLAUDE.md section 9).
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
