import "server-only";
import type { ReactElement } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/components";
import { sendEmail } from "@/core/notifications/email";
import { emailSafeText } from "@/core/notifications/user-text";
import {
  AlertDigestEmail,
  SimilarListingsEmail,
  alertDigestSubject,
  similarListingsSubject,
  type AlertEmailListing,
} from "@/emails/alert-digest";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { toSqlFilters, type SqlSearchFilters } from "@/leenkey/search/sql-filters";
import { formatPrice, formatSurface } from "@/lib/format";
import { frEmails } from "@/lib/i18n/sections/emails";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { readAlertCriteria } from "@/lib/validations/alert";
import { searchHref } from "@/lib/validations/search";
import type { Database } from "@/types/database";
import {
  composeDigest,
  freshListings,
  groupByBuyer,
  rotateByRun,
  similarListings,
  similarSqlFilters,
  type AlertMatch,
  type DigestListing,
} from "./digest";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// The daily run of the buyer alerts (L3-06, SPEC-V2 16 and 19), called by
// /api/cron/buyer-alerts with the service role client of the cron, four
// times ten minutes apart: a run sends for a bounded time, the next one
// takes the buyers left.
//
// The digest: each active alert is run through search_listings, the SQL
// function of the search page, the most recent first; its listings
// published since its last digest are kept. One email per buyer for all
// their alerts. `alert.match` has no notification in the application (SPEC
// 10) and notification_add always writes one: the email leaves from here,
// with the sendEmail of the other emails (outside production: the test
// inbox only). Idempotent: the alerts of a buyer are claimed together
// before their email leaves (alert_digest_claim: all of them still as they
// were read, or none), so that two runs at once send one email; an email
// that fails gives them back (alert_digest_release), and the next run tells
// of the same listings. An alert whose search fails is left out of the
// claim: it keeps its date, the others go on.
//
// Similar listings after a sale: once per buyer and listing sold
// (alert_similar_sent, claimed by its primary key before the email leaves),
// on a time budget of their own, so that the digests never starve them.

/** Between two emails that left: Resend takes 2 requests a second by default. */
const PACE_MS = 600;
/** No new digest after this time: the next run sends the rest (function of 60 s). */
const DIGEST_BUDGET_MS = 25_000;
/** The similar listings have their own time, after the digests. */
const SIMILAR_BUDGET_MS = 15_000;

type Client = SupabaseClient<Database>;
type SearchRow = Database["public"]["Functions"]["search_listings"]["Returns"][number];

export type AlertsSummary = {
  /** Active alerts due. */
  alerts: number;
  /** Buyers they belong to. */
  buyers: number;
  /** Digests handed to Resend (or written to the log, in local). */
  sent: number;
  /** Buyers whose alerts found nothing new: no email, their alerts dated. */
  quiet: number;
  /** Buyers whose digest did not leave or could not be read: tried again by the next run. */
  failed: number;
  /** Buyers left for the next run (time budget), or taken by another run. */
  postponed: number;
  similar: {
    /** Buyers to tell of a listing sold. */
    due: number;
    sent: number;
    /** Nothing similar online: no email, never asked again. */
    none: number;
    failed: number;
    postponed: number;
  };
};

function toDigestListing(row: SearchRow): DigestListing {
  // The generated types declare the columns of a function result as never null.
  const nullable = row as Omit<SearchRow, "published_at" | "rooms" | "surface_m2"> & {
    published_at: string | null;
    rooms: number | null;
    surface_m2: number | null;
  };
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    city: row.city,
    priceCents: Number(row.price_cents),
    surfaceM2: nullable.surface_m2 === null ? null : Number(nullable.surface_m2),
    rooms: nullable.rooms,
    publishedAt: nullable.published_at,
  };
}

/** The first page of a search (20 listings), the most recent first, as the search page reads it. */
async function search(supabase: Client, filters: SqlSearchFilters): Promise<DigestListing[]> {
  const { data, error } = await supabase.rpc("search_listings", {
    p_filters: filters,
    p_sort: "recent",
    p_page: 1,
  });
  if (error) throw new Error(`search_listings: ${error.code} ${error.message}`);
  return (data ?? []).map(toDigestListing);
}

/** Among these listings, those of the properties of the buyer: never told to them. */
async function ownListings(
  supabase: Client,
  buyerId: string,
  listingIds: readonly string[],
): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("listings")
    .select("id, properties!inner(owner_id)")
    .in("id", [...new Set(listingIds)])
    .eq("properties.owner_id", buyerId);
  if (error) throw new Error(`own listings: ${error.code} ${error.message}`);
  return new Set(data.map((row) => row.id));
}

function emailListing(listing: DigestListing): AlertEmailListing {
  return {
    // The words of a seller: never a link made by a mail client.
    title: emailSafeText(listing.title),
    city: emailSafeText(listing.city),
    price: formatPrice(listing.priceCents),
    facts: fr.emails.alerts.listingFacts(
      listing.surfaceM2 ? formatSurface(listing.surfaceM2) : null,
      listing.rooms,
    ),
    url: absoluteUrl(`${ROUTES.listing}/${listing.slug}`),
  };
}

async function send(
  to: string,
  subject: string,
  element: ReactElement,
  idempotencyKey: string,
): Promise<boolean> {
  const [html, text] = await Promise.all([render(element), render(element, EMAIL_PLAIN_TEXT)]);
  return (await sendEmail({ to, subject, html, text, idempotencyKey })) !== "failed";
}

type QueuedAlert = {
  alertId: string;
  buyerId: string;
  name: string;
  criteria: unknown;
  lastSentAt: string | null;
  since: string;
  email: string;
  firstName: string | null;
};

const claimArgs = (alerts: readonly QueuedAlert[], claimedAt: string) => ({
  p_alert_ids: alerts.map((alert) => alert.alertId),
  // Null for an alert never sent (the generated types say an array of strings).
  p_read: alerts.map((alert) => alert.lastSentAt) as string[],
  p_claimed_at: claimedAt,
});

/**
 * Dates the alerts of a buyer together, if all of them are still as they
 * were read; false when another run, or the buyer, changed one meanwhile.
 */
async function claim(supabase: Client, alerts: readonly QueuedAlert[], claimedAt: string) {
  const { data, error } = await supabase.rpc("alert_digest_claim", claimArgs(alerts, claimedAt));
  if (error) throw new Error(`alert_digest_claim: ${error.code} ${error.message}`);
  return data === true;
}

/** Gives back the alerts of a digest that did not leave: the next run reads the same listings. */
async function release(supabase: Client, alerts: readonly QueuedAlert[], claimedAt: string) {
  const { error } = await supabase.rpc("alert_digest_release", claimArgs(alerts, claimedAt));
  if (error) {
    console.error("[alerts] alerts not given back", {
      user_id: alerts[0]?.buyerId,
      code: error.code,
    });
  }
}

type Outcome = "sent" | "quiet" | "failed" | "taken";

async function digestOf(
  supabase: Client,
  alerts: readonly QueuedAlert[],
  now: Date,
): Promise<Outcome> {
  const buyer = alerts[0];
  if (!buyer) return "taken";
  const read = await Promise.all(
    alerts.map(async (alert) => {
      const criteria = readAlertCriteria(alert.criteria);
      // Criteria the site no longer knows match nothing; the page says so to the buyer.
      if (!criteria) return { alert, criteria, listings: [] as DigestListing[] };
      try {
        return { alert, criteria, listings: await search(supabase, toSqlFilters(criteria)) };
      } catch (error) {
        // One search that fails never stops the other alerts of the buyer:
        // this alert keeps its date and is read again by the next run.
        console.error("[alerts] search of an alert failed", {
          type: "alert.match",
          entity_id: alert.alertId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }),
  );
  const found = read.filter((entry) => entry !== null);
  if (found.length === 0) return "failed";
  const own = await ownListings(
    supabase,
    buyer.buyerId,
    found.flatMap(({ listings }) => listings.map((listing) => listing.id)),
  );
  // Claimed first, all together: a run that started meanwhile leaves this buyer out.
  const claimedAt = now.toISOString();
  const held = found.map(({ alert }) => alert);
  if (!(await claim(supabase, held, claimedAt))) return "taken";
  let sent = false;
  try {
    const matches: AlertMatch[] = found.map(({ alert, criteria, listings }) => ({
      alertId: alert.alertId,
      name: alert.name,
      href: criteria ? searchHref({ filters: criteria }) : ROUTES.search,
      listings: freshListings(listings, alert.since, now, own),
    }));
    const digest = composeDigest(matches);
    if (!digest) return "quiet";
    sent = await send(
      buyer.email,
      alertDigestSubject(digest.total),
      AlertDigestEmail({
        firstName: emailSafeText(buyer.firstName),
        listings: digest.listings.map(emailListing),
        total: digest.total,
        alerts: digest.alerts.map((alert) => ({
          name: emailSafeText(alert.name) ?? fr.emails.alerts.digest.unnamed,
          count: alert.count,
          url: absoluteUrl(alert.href),
        })),
        alertsUrl: absoluteUrl(ROUTES.buyerAlerts),
        siteUrl: siteUrl(),
      }),
      // The same digest sent again after an answer lost on the way leaves once.
      `alert-digest/${buyer.buyerId}/${claimedAt}`,
    );
  } catch (error) {
    console.error("[alerts] digest not rendered", {
      user_id: buyer.buyerId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  if (sent) return "sent";
  await release(supabase, held, claimedAt);
  return "failed";
}

type QueuedSimilar = Database["public"]["Functions"]["alert_similar_queue"]["Returns"][number];

async function similarOf(
  supabase: Client,
  row: QueuedSimilar,
  candidates: readonly DigestListing[],
): Promise<"sent" | "none" | "failed" | "taken"> {
  // The generated types declare the columns of a function result as never null.
  const rooms = (row as { rooms: number | null }).rooms;
  const sold = { city: row.city, priceCents: Number(row.price_cents), rooms };
  const own = await ownListings(
    supabase,
    row.buyer_id,
    candidates.map((listing) => listing.id),
  );
  const listings = similarListings(sold, candidates, own);
  // Claimed first by its primary key: once per buyer and listing sold.
  const key = { buyer_id: row.buyer_id, listing_id: row.listing_id };
  const claimed = await supabase
    .from("alert_similar_sent")
    .insert({ ...key, listings_count: listings.length });
  if (claimed.error) {
    if (claimed.error.code === "23505") return "taken";
    throw new Error(`alert_similar_sent: ${claimed.error.code} ${claimed.error.message}`);
  }
  if (listings.length === 0) return "none";
  let sent = false;
  try {
    // The name of a commune is typed by a seller: never a link made by a mail client.
    const city = emailSafeText(row.city);
    sent = await send(
      row.email,
      similarListingsSubject(city),
      SimilarListingsEmail({
        firstName: emailSafeText((row as { first_name: string | null }).first_name),
        soldTitle: emailSafeText(row.title),
        city,
        listings: listings.map(emailListing),
        searchUrl: absoluteUrl(searchHref({ filters: { location: slugify(row.city) } })),
        alertsUrl: absoluteUrl(ROUTES.buyerAlerts),
        siteUrl: siteUrl(),
      }),
      `alert-similar/${row.buyer_id}/${row.listing_id}`,
    );
  } catch (error) {
    console.error("[alerts] similar listings not rendered", {
      user_id: row.buyer_id,
      entity_id: row.listing_id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  if (sent) return "sent";
  // Given back: the next run tries again.
  const { error } = await supabase.from("alert_similar_sent").delete().match(key);
  if (error) {
    console.error("[alerts] similar listings not given back", {
      user_id: row.buyer_id,
      entity_id: row.listing_id,
      code: error.code,
    });
  }
  return "failed";
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendAlertDigests(
  supabase: Client,
  now = new Date(),
  { paceMs = PACE_MS, digestBudgetMs = DIGEST_BUDGET_MS, similarBudgetMs = SIMILAR_BUDGET_MS } = {},
): Promise<AlertsSummary> {
  const queue = await supabase.rpc("alert_digest_queue");
  if (queue.error) {
    throw new Error(`alert_digest_queue: ${queue.error.code} ${queue.error.message}`);
  }
  // Each run of the day starts further in the queue: a buyer whose email
  // keeps failing stays at its head (their alerts keep their old date) and
  // must not stand before the same buyers at every run.
  const groups = rotateByRun(
    groupByBuyer(
      queue.data.map(
        (row): QueuedAlert => ({
          alertId: row.alert_id,
          buyerId: row.buyer_id,
          name: row.name,
          criteria: row.criteria,
          // Null for an alert never sent (the generated types say never null).
          lastSentAt: (row as { last_sent_at: string | null }).last_sent_at,
          since: row.since,
          email: row.email,
          firstName: (row as { first_name: string | null }).first_name,
        }),
      ),
    ),
    now,
  );
  const summary: AlertsSummary = {
    alerts: queue.data.length,
    buyers: groups.length,
    sent: 0,
    quiet: 0,
    failed: 0,
    postponed: 0,
    similar: { due: 0, sent: 0, none: 0, failed: 0, postponed: 0 },
  };
  const digestsStarted = Date.now();
  for (const [index, alerts] of groups.entries()) {
    if (Date.now() - digestsStarted > digestBudgetMs) {
      // Their alerts keep their date: the next run reads the same listings.
      summary.postponed += groups.length - index;
      break;
    }
    try {
      const outcome = await digestOf(supabase, alerts, now);
      if (outcome === "taken") summary.postponed += 1;
      else summary[outcome] += 1;
      // Only after an email that left: a failure costs the next buyers no wait.
      if (outcome === "sent") await pause(paceMs);
    } catch (error) {
      summary.failed += 1;
      console.error("[alerts] digest failed", {
        user_id: alerts[0]?.buyerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const similar = await supabase.rpc("alert_similar_queue");
  if (similar.error) {
    throw new Error(`alert_similar_queue: ${similar.error.code} ${similar.error.message}`);
  }
  summary.similar.due = similar.data.length;
  // One search per listing sold, whatever the number of its buyers.
  const searches = new Map<string, DigestListing[]>();
  const similarStarted = Date.now();
  for (const [index, row] of similar.data.entries()) {
    if (Date.now() - similarStarted > similarBudgetMs) {
      summary.similar.postponed += similar.data.length - index;
      break;
    }
    try {
      let candidates = searches.get(row.listing_id);
      if (!candidates) {
        candidates = await search(
          supabase,
          similarSqlFilters({
            city: row.city,
            priceCents: Number(row.price_cents),
            rooms: (row as { rooms: number | null }).rooms,
          }),
        );
        searches.set(row.listing_id, candidates);
      }
      const outcome = await similarOf(supabase, row, candidates);
      if (outcome === "taken") summary.similar.postponed += 1;
      else summary.similar[outcome] += 1;
      if (outcome === "sent") await pause(paceMs);
    } catch (error) {
      summary.similar.failed += 1;
      console.error("[alerts] similar listings failed", {
        user_id: row.buyer_id,
        entity_id: row.listing_id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return summary;
}
