import "server-only";
import { render } from "@react-email/components";
import { sendEmail, type EmailDelivery } from "@/core/notifications/email";
import {
  ListingDecisionEmail,
  listingDecisionSubject,
  type ListingDecision,
} from "@/emails/listing-decision";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";
import { absoluteUrl, siteUrl } from "@/lib/site";

// Email to the seller after a decision of the back office (SPEC-V2 sections
// 17 and 18), with the admin's session: admin_listing_seller_contact checks
// is_admin() and gives the address kept in auth.users.

export async function emailSellerAboutDecision({
  listingId,
  decision,
  reason,
}: {
  listingId: string;
  decision: ListingDecision;
  reason?: string;
}): Promise<EmailDelivery> {
  try {
    const supabase = await createClient();
    const [contact, listing] = await Promise.all([
      supabase.rpc("admin_listing_seller_contact", { p_listing_id: listingId }),
      supabase.from("listings").select("title, slug").eq("id", listingId).maybeSingle(),
    ]);
    if (contact.error) throw new Error(`contact: ${contact.error.code} ${contact.error.message}`);
    if (listing.error) throw new Error(`listing: ${listing.error.code} ${listing.error.message}`);
    const seller = contact.data[0];
    if (!seller?.email || !listing.data) throw new Error("no seller email or listing");

    const element = ListingDecisionEmail({
      decision,
      firstName: seller.first_name,
      title: listing.data.title,
      reason,
      listingUrl: absoluteUrl(`/annonce/${listing.data.slug}`),
      sellerUrl: absoluteUrl("/vendeur"),
      contactEmail: fr.legal.contactEmail,
      siteUrl: siteUrl(),
    });
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
    return await sendEmail({
      to: seller.email,
      subject: listingDecisionSubject(decision),
      html,
      text,
    });
  } catch (error) {
    console.error("[admin] decision email failed", {
      entity_id: listingId,
      decision,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}
