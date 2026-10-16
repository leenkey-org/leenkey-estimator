"use server";

import { countListings } from "./queries";
import { SearchFilters } from "@/lib/validations/search";

// Server actions of the search. A read, not a mutation: the filters panel
// shows « Voir N biens » for the filters being chosen, before they are
// applied (no Supabase query from a client component, CLAUDE.md section 9).
// Public data: no session required, the visitor's session (or none) is used.

export async function countSearchResults(
  input: unknown,
): Promise<{ ok: true; data: number } | { ok: false; error: "invalid" | "unavailable" }> {
  const parsed = SearchFilters.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return countListings(parsed.data);
}
