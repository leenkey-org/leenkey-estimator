import { Link, Section, Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailLink, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// The emails of the buyer alerts (L3-06, SPEC-V2 16 and 18), sent by the
// daily run: the digest of the new listings of all the alerts of a buyer (6
// at most), and the listings similar to a listing sold the buyer had
// followed. What a listing shows publicly only: its title, its commune, its
// price, its surface and its rooms; never an address, never a seller.

const t = fr.emails.alerts;

export type AlertEmailListing = {
  /** Null when the words of the seller cannot go in an email (a link). */
  title: string | null;
  /** Null when its name cannot go in an email. */
  city: string | null;
  /** « 350 000 € » */
  price: string;
  /** « 82 m² · 4 pièces » */
  facts: string;
  url: string;
};

function Listings({ listings }: { listings: readonly AlertEmailListing[] }) {
  return (
    <>
      {listings.map((listing) => (
        <Section
          key={listing.url}
          style={{
            margin: "0 0 12px",
            padding: "12px 16px",
            border: "1px solid #D9DBD3",
            borderRadius: "4px",
          }}
        >
          <Text style={{ ...emailText, margin: "0 0 4px", fontWeight: 600 }}>
            {[listing.title, listing.city].filter(Boolean).join(" · ")}
          </Text>
          <Text style={{ ...emailText, margin: "0 0 4px" }}>
            {[listing.price, listing.facts].filter(Boolean).join(" · ")}
          </Text>
          <Text style={{ ...emailText, margin: 0 }}>
            <Link href={listing.url} style={emailLink}>
              {t.seeListing}
            </Link>
          </Text>
        </Section>
      ))}
    </>
  );
}

export type AlertDigestEmailProps = {
  firstName: string | null;
  /** The listings shown: 6 at most, the most recent first. */
  listings: readonly AlertEmailListing[];
  /** Every new listing of the alerts. */
  total: number;
  /** The alerts that matched, each with the address of its search. */
  alerts: ReadonlyArray<{ name: string; count: number; url: string }>;
  alertsUrl: string;
  siteUrl: string;
};

export const alertDigestSubject = (total: number) => t.digest.subject(total);

export function AlertDigestEmail({
  firstName,
  listings,
  total,
  alerts,
  alertsUrl,
  siteUrl,
}: AlertDigestEmailProps) {
  const text = t.digest.text(total);
  const only = alerts.length === 1 ? alerts[0] : undefined;
  return (
    <EmailLayout
      preview={text}
      title={t.digest.title(total)}
      siteUrl={siteUrl}
      action={
        only
          ? { href: only.url, label: t.digest.actionSearch }
          : { href: alertsUrl, label: t.digest.actionAlerts }
      }
      why={t.why}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>
        {text}
        {total > listings.length ? ` ${t.digest.more(listings.length)}` : ""}
      </Text>
      <Listings listings={listings} />
      <Text style={{ ...emailText, margin: "16px 0 4px", fontWeight: 600 }}>
        {t.digest.searches}
      </Text>
      {alerts.map((alert) => (
        <Text key={alert.url + alert.name} style={{ ...emailText, margin: "0 0 4px" }}>
          <Link href={alert.url} style={emailLink}>
            {t.digest.alertCount(alert.name, alert.count)}
          </Link>
        </Text>
      ))}
      <Text style={{ ...emailText, margin: "12px 0 16px" }}>
        <Link href={alertsUrl} style={emailLink}>
          {t.manage}
        </Link>
      </Text>
    </EmailLayout>
  );
}

export type SimilarListingsEmailProps = {
  firstName: string | null;
  /** The listing sold: its title (null when it cannot go in an email) and its commune. */
  soldTitle: string | null;
  city: string | null;
  listings: readonly AlertEmailListing[];
  searchUrl: string;
  alertsUrl: string;
  siteUrl: string;
};

export const similarListingsSubject = (city: string | null) => t.similar.subject(city);

export function SimilarListingsEmail({
  firstName,
  soldTitle,
  city,
  listings,
  searchUrl,
  alertsUrl,
  siteUrl,
}: SimilarListingsEmailProps) {
  const text = t.similar.text(soldTitle, city);
  return (
    <EmailLayout
      preview={text}
      title={t.similar.title}
      siteUrl={siteUrl}
      action={{ href: searchUrl, label: t.similar.action }}
      why={t.why}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      <Listings listings={listings} />
      <Text style={{ ...emailText, margin: "12px 0 16px" }}>
        <Link href={alertsUrl} style={emailLink}>
          {t.manage}
        </Link>
      </Text>
    </EmailLayout>
  );
}
