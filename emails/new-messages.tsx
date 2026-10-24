import { Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, emailQuote, emailText } from "./components/email-layout";

// « Nouveau message » (SPEC-V2 section 18, L1-22): the new messages of a
// conversation in one email, the excerpt of the last one (140 characters),
// at most one email per conversation every 15 minutes, none once read
// (leenkey/notifications/send-emails.ts).

const t = fr.emails;

export function newMessagesSubject(senderName: string | null, count: number): string {
  return t.newMessages.subject(senderName, count);
}

export type NewMessagesEmailProps = {
  firstName: string | null;
  senderName: string | null;
  listingTitle: string | null;
  /** The excerpt of the last message, its ellipsis included. */
  excerpt: string | null;
  /** The last message holds a link: its excerpt stays out of the email. */
  excerptHidden?: boolean;
  count: number;
  /** The recipient sells (seller) or contacted a seller (buyer): the line of the footer. */
  recipient: "seller" | "buyer";
  conversationUrl: string;
  siteUrl: string;
};

export function NewMessagesEmail({
  firstName,
  senderName,
  listingTitle,
  excerpt,
  excerptHidden = false,
  count,
  recipient,
  conversationUrl,
  siteUrl,
}: NewMessagesEmailProps) {
  const copy = t.newMessages;
  const subject = newMessagesSubject(senderName, count);
  return (
    <EmailLayout
      preview={excerpt ?? subject}
      title={subject}
      siteUrl={siteUrl}
      action={{ href: conversationUrl, label: copy.action }}
      why={recipient === "buyer" ? t.footer.whyBuyer : t.footer.why}
    >
      <Text style={emailText}>{t.greeting(firstName)}</Text>
      {listingTitle ? <Text style={emailText}>{copy.about(listingTitle)}</Text> : null}
      {excerpt ? <Text style={emailQuote}>{excerpt}</Text> : null}
      {excerptHidden ? <Text style={emailText}>{copy.hidden}</Text> : null}
      {count > 1 ? <Text style={emailText}>{copy.more(count - 1)}</Text> : null}
    </EmailLayout>
  );
}
