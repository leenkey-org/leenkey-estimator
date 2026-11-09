import "server-only";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// « Mon compte » (L1-39): what the account page shows, read with the session
// of the person (RLS: their own profile only).

export type AccountOverview = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  /** A change of address asked and not confirmed yet from both addresses. */
  newEmail: string | null;
  roles: string[];
};

export async function accountOverview(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<AccountOverview | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, roles")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) {
    if (error)
      console.error("[account] profile read failed", { user_id: user.id, code: error.code });
    return null;
  }
  return {
    firstName: data.first_name,
    lastName: data.last_name,
    phone: data.phone,
    email: user.email ?? null,
    newEmail: user.new_email ?? null,
    roles: data.roles,
  };
}
