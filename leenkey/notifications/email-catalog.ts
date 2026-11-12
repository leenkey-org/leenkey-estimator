import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/components";
import type { EmailPolicy, PlannedEmail, QueuedNotification } from "@/core/notifications/batch";
import { emailSafeText } from "@/core/notifications/user-text";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { AccountsCreatedEmail, accountsCreatedSubject } from "@/emails/accounts-created";
import { CaseRequestsEmail, caseRequestsSubject } from "@/emails/case-requests";
import { ListingToReviewEmail, listingToReviewSubject } from "@/emails/listing-submitted";
import { ListingsToReviewEmail, listingsToReviewSubject } from "@/emails/listings-to-review";
import { NewMessagesEmail, newMessagesSubject } from "@/emails/new-messages";
import { ReportsToReviewEmail, reportsToReviewSubject } from "@/emails/reports-to-review";
import { formatAmount, formatPrice } from "@/lib/format";
import { PlanEndingEmail, planEndingSubject } from "@/emails/plan-ending";
import {
  WithdrawalsToProcessEmail,
  withdrawalsToProcessSubject,
} from "@/emails/withdrawals-to-process";
import { legalDate, legalDateTime } from "@/leenkey/billing/withdrawal";
import { frAdminUsers } from "@/lib/i18n/sections/adminUsers";
import { frEmails } from "@/lib/i18n/sections/emails";
import { frLegal } from "@/lib/i18n/sections/legal";
import { roleLabels } from "./catalog";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { adminListingsHref } from "@/lib/validations/admin";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminUsers: frAdminUsers, emails: frEmails, legal: frLegal } as const;

// The notification emails of Leenkey that the cron sends grouped (SPEC-V2
// sections 10 and 18, L1-22): who gets them, how often, and their content
// from the facts written by the database. The others (listing published, to
// correct) leave with the decision of the back office (L1-19).

const POLICIES: Record<string, EmailPolicy> = {
  // One email per conversation every 15 minutes at most, none once read.
  "message.new": { audience: "recipient", preference: "email_messages", throttleMinutes: 15 },
  // L1-34: the adviser writes (as a message), a seller writes to the team (read by one: none).
  "advisor.message": { audience: "recipient", preference: "email_messages", throttleMinutes: 15 },
  "advisor.message_from_client": { audience: "team", throttleMinutes: 20 },
  // « Digest si > 3 en 1 h »: one email, then the next ones together, 20 minutes later at the
  // earliest: never more than 3 in an hour.
  "listing.pending": { audience: "team", throttleMinutes: 20 },
  // A report (L1-30c): the first at once, the next ones together 20 minutes later at the earliest.
  "report.created": { audience: "team", throttleMinutes: 20 },
  // A new account, its email confirmed (2026-11-08): the first at once, the next ones together.
  "account.created": { audience: "team", throttleMinutes: 20 },
  // A request to the team (create_case, L1-31): the first at once, the next ones together. The
  // case of a plan paid has no email here (its own leaves with the payment, L1-26).
  "case.created": { audience: "team", throttleMinutes: 20 },
  // A withdrawal to refund (L1-40): the first at once, the next ones together.
  "plan.withdrawn": { audience: "team", throttleMinutes: 20 },
  // A plan ending within 30 days (L1-40): once per plan (its own group).
  "plan.ending": { audience: "recipient", throttleMinutes: 60 },
};

export function emailPolicy(type: string): EmailPolicy | null {
  return POLICIES[type] ?? null;
}

export type RenderedEmail = { subject: string; html: string; text: string; replyTo?: string };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function rendered(subject: string, element: ReactElement, replyTo?: string) {
  const [html, plain] = await Promise.all([render(element), render(element, EMAIL_PLAIN_TEXT)]);
  return { subject, html, text: plain, ...(replyTo ? { replyTo } : {}) };
}

/** The new messages of a conversation: the excerpt of the last one. */
async function newMessages(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  // Written by the other party: a first name or words a mail client would make a link of stay
  // out of the email.
  const senderName = emailSafeText(last.data.sender_first_name);
  const words = text(last.data.excerpt);
  const excerpt = emailSafeText(words);
  const count = email.items.length;
  return rendered(
    newMessagesSubject(senderName, count),
    NewMessagesEmail({
      firstName: email.firstName,
      senderName,
      listingTitle: emailSafeText(last.data.listing_title),
      excerpt: excerpt ? `${excerpt}${last.data.truncated === true ? "…" : ""}` : null,
      excerptHidden: Boolean(words) && !excerpt,
      count,
      // A message of the seller goes to the buyer, and the other way round.
      recipient: last.data.from === "seller" ? "buyer" : "seller",
      conversationUrl: absoluteUrl(last.link ?? "/messages"),
      siteUrl: siteUrl(),
    }),
    fr.legal.contactEmail,
  );
}

/**
 * The conversation with the adviser (L1-34): to the seller, the messages of
 * the team, as « Nouveau message de votre conseiller Leenkey »; to the team,
 * the messages of a seller, with the reference of their property.
 */
async function advisorMessages(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  const words = text(last.data.excerpt);
  const excerpt = emailSafeText(words);
  const count = email.items.length;
  const team = email.audience === "team";
  const senderName = team
    ? emailSafeText(last.data.sender_first_name)
    : fr.emails.newMessages.advisorSender;
  const reference = text(last.data.reference);
  return rendered(
    team
      ? fr.emails.newMessages.advisorTeamSubject(senderName, reference, count)
      : newMessagesSubject(senderName, count),
    NewMessagesEmail({
      firstName: team ? null : email.firstName,
      senderName,
      listingTitle: emailSafeText(last.data.listing_title) ?? reference,
      excerpt: excerpt ? `${excerpt}${last.data.truncated === true ? "…" : ""}` : null,
      excerptHidden: Boolean(words) && !excerpt,
      count,
      recipient: team ? "team" : "seller",
      conversationUrl: absoluteUrl(last.link ?? "/messages"),
      siteUrl: siteUrl(),
      subject: team
        ? fr.emails.newMessages.advisorTeamSubject(senderName, reference, count)
        : undefined,
    }),
    team ? undefined : fr.legal.contactEmail,
  );
}

function place(item: QueuedNotification): string {
  const city = text(item.data.city);
  const postalCode = text(item.data.postal_code);
  return [city, postalCode ? `(${postalCode})` : null].filter(Boolean).join(" ");
}

function price(item: QueuedNotification): string {
  const cents = Number(item.data.price_cents);
  return Number.isFinite(cents) && cents > 0 ? formatPrice(cents) : "";
}

function adminUrl(item: QueuedNotification): string {
  return absoluteUrl(item.link ?? adminListingsHref({ status: "pending" }));
}

/** Written by the seller: its reference instead of a title a mail client would make a link of. */
function listingTitle(item: QueuedNotification): string {
  return emailSafeText(item.data.title) ?? text(item.data.reference) ?? "";
}

/** Listings sent for review: one email for one, a list for several. */
async function listingsToReview(email: PlannedEmail): Promise<RenderedEmail | null> {
  const [first, ...others] = email.items;
  if (!first) return null;
  const reference = text(first.data.reference) ?? "";
  const title = listingTitle(first);
  if (others.length === 0) {
    return rendered(
      listingToReviewSubject(reference),
      ListingToReviewEmail({
        title,
        reference,
        place: place(first),
        price: price(first),
        sellerName: emailSafeText(first.data.seller_first_name),
        adminUrl: adminUrl(first),
        siteUrl: siteUrl(),
      }),
    );
  }
  return rendered(
    listingsToReviewSubject(email.items.length),
    ListingsToReviewEmail({
      items: email.items.map((item) => ({
        title: listingTitle(item),
        details: fr.emails.listingToReview.details(
          text(item.data.reference) ?? "",
          place(item),
          price(item),
          emailSafeText(item.data.seller_first_name),
        ),
        adminUrl: adminUrl(item),
      })),
      listUrl: absoluteUrl(adminListingsHref({ status: "pending" })),
      siteUrl: siteUrl(),
    }),
  );
}

/** Conversations reported: the reason of each, written by a user, made safe for a mail client. */
async function reportsToReview(email: PlannedEmail): Promise<RenderedEmail | null> {
  const [first] = email.items;
  if (!first) return null;
  const count = email.items.length;
  return rendered(
    reportsToReviewSubject(count, text(first.data.reference)),
    ReportsToReviewEmail({
      items: email.items.map((item) => {
        const reason = emailSafeText(item.data.excerpt);
        return {
          reason: reason ? `${reason}${item.data.truncated === true ? "…" : ""}` : null,
          reference: text(item.data.reference),
        };
      }),
      url: absoluteUrl(count > 1 ? "/admin/signalements" : (first.link ?? "/admin/signalements")),
      siteUrl: siteUrl(),
    }),
  );
}

/**
 * « Alice D. »: the first name (made safe for a mail client) and the initial
 * of the last name; without a first name to show, « Sans nom » rather than an
 * initial alone.
 */
export function accountName(item: QueuedNotification): string {
  const first = emailSafeText(item.data.first_name);
  if (!first) return fr.adminUsers.noName;
  const initial = text(item.data.last_initial);
  return initial ? `${first} ${initial}.` : first;
}

/** « Vendeur, Acquéreur »: the roles of the account. */
export function accountRoles(item: QueuedNotification): string {
  return roleLabels(item.data.roles);
}

/** Accounts confirmed: one email for one, a list for several. */
async function accountsCreated(email: PlannedEmail): Promise<RenderedEmail | null> {
  const [first] = email.items;
  if (!first) return null;
  const count = email.items.length;
  return rendered(
    accountsCreatedSubject(count),
    AccountsCreatedEmail({
      items: email.items.map((item) => ({ name: accountName(item), roles: accountRoles(item) })),
      url: absoluteUrl(count > 1 ? "/admin/utilisateurs" : (first.link ?? "/admin/utilisateurs")),
      siteUrl: siteUrl(),
    }),
  );
}

/**
 * The property of a request: the reference of its listing, or, without a
 * listing, its town, which its owner typed (made safe for a mail client).
 */
function requestProperty(value: unknown): string | null {
  const reference = text(value);
  if (!reference) return null;
  return /^LK-\d+$/.test(reference) ? reference : emailSafeText(reference);
}

/** Requests written to the team (L1-31): who asks, for which property, about what. */
async function caseRequests(email: PlannedEmail): Promise<RenderedEmail | null> {
  const [first] = email.items;
  if (!first) return null;
  const count = email.items.length;
  return rendered(
    caseRequestsSubject(count, requestProperty(first.data.reference)),
    CaseRequestsEmail({
      items: email.items.map((item) => ({
        name: accountName(item),
        reference: requestProperty(item.data.reference),
        subject: emailSafeText(item.data.subject),
      })),
      url: absoluteUrl(count > 1 ? "/admin/dossiers" : (first.link ?? "/admin/dossiers")),
      siteUrl: siteUrl(),
    }),
  );
}

/** Withdrawals to refund (L1-40), to the team: one line each. */
async function withdrawalsToProcess(email: PlannedEmail): Promise<RenderedEmail | null> {
  if (email.items.length === 0) return null;
  const items = email.items.map((item) => {
    const requested = text(item.data.requested_at);
    // A passage renounced with the plan it replaced: both are refunded.
    const amount =
      Number(item.data.amount_paid_cents) + (Number(item.data.replaced_amount_paid_cents) || 0);
    const replaced = text(item.data.replaced_plan_name);
    const plan = text(item.data.plan_name) ?? "";
    return {
      planName: replaced ? `${plan} + ${replaced}` : plan,
      property: text(item.data.reference) ?? "",
      amount: formatAmount(Number.isFinite(amount) ? amount : 0),
      requestedAt: requested ? legalDateTime(requested) : "",
      earlyStart: item.data.early_start === true,
    };
  });
  return rendered(
    withdrawalsToProcessSubject(items),
    WithdrawalsToProcessEmail({
      items,
      casesUrl: absoluteUrl("/admin/dossiers"),
      siteUrl: siteUrl(),
    }),
  );
}

/** A plan ending within 30 days (L1-40), to its owner; an answer goes to Leenkey. */
async function planEnding(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  const endsAt = text(last?.data.ends_at);
  if (!last || !endsAt) return null;
  const planName = text(last.data.plan_name) ?? "";
  const endsOn = legalDate(endsAt);
  return rendered(
    planEndingSubject(planName, endsOn),
    PlanEndingEmail({
      firstName: email.firstName,
      planName,
      property: text(last.data.reference) ?? "",
      endsOn,
      planUrl: absoluteUrl(last.link ?? "/vendeur/formule"),
      siteUrl: siteUrl(),
    }),
    fr.legal.contactEmail,
  );
}

/** The email of a group, ready to leave; null when its type has none. */
export function renderNotificationEmail(email: PlannedEmail): Promise<RenderedEmail | null> {
  switch (email.type) {
    case "message.new":
      return newMessages(email);
    case "advisor.message":
    case "advisor.message_from_client":
      return advisorMessages(email);
    case "listing.pending":
      return listingsToReview(email);
    case "report.created":
      return reportsToReview(email);
    case "plan.withdrawn":
      return withdrawalsToProcess(email);
    case "plan.ending":
      return planEnding(email);
    case "account.created":
      return accountsCreated(email);
    case "case.created":
      return caseRequests(email);
    default:
      return Promise.resolve(null);
  }
}
