import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, EmailQuote, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// For the team (SPEC-V2 13, « notification au conseiller si formule
// payante », L2-07): one or several offers accepted on sales whose plan has
// an adviser since the last email, grouped by the cron of L1-22. The
// reference of the offer, the listing and its town, the price accepted:
// never the identity of a buyer. The same email tells the team the offers
// RECEIVED on such sales (`received`, answer of Cédric of 2026-11-19), with
// its own words.

export type OffersAcceptedEmailProps = {
  items: { reference: string; property: string | null; price: string | null }[];
  url: string;
  siteUrl: string;
  /** Offers received, not yet answered, rather than offers accepted. */
  received?: boolean;
};

export const offersAcceptedSubject = (count: number, reference: string | null) =>
  fr.emails.offersAccepted.subject(count, reference);

export const offersReceivedSubject = (count: number, reference: string | null) =>
  fr.emails.offersReceived.subject(count, reference);

export function OffersAcceptedEmail({
  items,
  url,
  siteUrl,
  received = false,
}: OffersAcceptedEmailProps) {
  const t = received ? fr.emails.offersReceived : fr.emails.offersAccepted;
  const count = items.length;
  return (
    <EmailLayout
      preview={t.text(count)}
      title={t.title(count)}
      siteUrl={siteUrl}
      internal
      action={{ href: url, label: t.action(count) }}
    >
      <Text style={emailText}>{t.text(count)}</Text>
      {items.map((item, index) => (
        <EmailQuote
          key={index}
          label={t.item(item.reference, item.property)}
          text={item.price ? t.price(item.price) : t.noPrice}
        />
      ))}
      <Text style={emailText}>{t.next}</Text>
    </EmailLayout>
  );
}
