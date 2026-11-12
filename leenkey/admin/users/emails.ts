import "server-only";
import { render } from "@react-email/components";
import { sendEmail, type EmailDelivery } from "@/core/notifications/email";
import { AccountSuspendedEmail, accountSuspendedSubject } from "@/emails/account-suspended";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { frLegal } from "@/lib/i18n/sections/legal";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { legal: frLegal } as const;

// Email to the owner of an account the back office suspended (SPEC-V2
// section 17, « suspension du compte (motif, email) »), with the admin's
// session: admin_user_contact checks is_admin() and gives the address kept in
// auth.users. An answer goes to the contact address of Leenkey.

export async function emailAccountSuspended({
  profileId,
  reason,
}: {
  profileId: string;
  reason: string;
}): Promise<EmailDelivery> {
  try {
    const supabase = await createClient();
    const [contact, profile] = await Promise.all([
      supabase.rpc("admin_user_contact", { p_profile_id: profileId }),
      supabase.from("profiles").select("first_name").eq("id", profileId).maybeSingle(),
    ]);
    if (contact.error) throw new Error(`contact: ${contact.error.code}`);
    if (profile.error) throw new Error(`profile: ${profile.error.code}`);
    const email = contact.data[0]?.email;
    if (!email) throw new Error("no email");
    const element = AccountSuspendedEmail({
      firstName: profile.data?.first_name ?? null,
      reason,
      contactEmail: fr.legal.contactEmail,
      siteUrl: siteUrl(),
    });
    const [html, text] = await Promise.all([render(element), render(element, EMAIL_PLAIN_TEXT)]);
    return await sendEmail({
      to: email,
      subject: accountSuspendedSubject(),
      html,
      text,
      replyTo: fr.legal.contactEmail,
    });
  } catch (error) {
    console.error("[admin] suspension email failed", {
      entity_id: profileId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}
