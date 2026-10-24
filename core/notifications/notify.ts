import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

// The one way in for a notification written by the server (SPEC-V2 section
// 10, « notify() », L1-22): public.notification_add, executable by the
// service role only, from a webhook or a cron (Stripe: plan.activated,
// L1-26). The database calls it itself for the events it holds (a message,
// a listing reviewed). The wording comes from the type, written by the
// application; the email, planned by `emailAfter`, leaves with the cron,
// grouped, under the preferences of the recipient read when it leaves.

export type NotifyInput = {
  profileId: string;
  type: string;
  /** The facts of the event, for the wording (first name, listing, amount). */
  data: { [key: string]: Json | undefined };
  /** Where it leads, in the application. */
  link: string;
  /** Rows grouped in one email (« conversation:<id> »). */
  groupKey?: string;
  /** From when its email may leave; none: in the application only. */
  emailAfter?: Date;
};

/** The id of the notification; null when it could not be written (logged). */
export async function notify(
  supabase: SupabaseClient<Database>,
  input: NotifyInput,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("notification_add", {
    p_profile_id: input.profileId,
    p_type: input.type,
    p_data: input.data,
    p_link: input.link,
    p_group_key: input.groupKey,
    p_email_after: input.emailAfter?.toISOString(),
  });
  if (error) {
    console.error("[notifications] not written", {
      user_id: input.profileId,
      type: input.type,
      code: error.code,
    });
    return null;
  }
  return data;
}
