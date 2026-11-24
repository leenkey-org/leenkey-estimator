import "server-only";
import type { ReactElement } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/components";
import type { EmailPolicy, PlannedEmail, QueuedNotification } from "@/core/notifications/batch";
import type { EmailAttachment } from "@/core/notifications/email";
import { emailSafeText } from "@/core/notifications/user-text";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { AccountNoticeEmail } from "@/emails/account-notice";
import { AccountsCreatedEmail, accountsCreatedSubject } from "@/emails/accounts-created";
import { CaseRequestsEmail, caseRequestsSubject } from "@/emails/case-requests";
import {
  DocumentAccessRequestedEmail,
  documentAccessRequestedSubject,
} from "@/emails/document-access-requested";
import {
  DocumentNeedsAttentionEmail,
  documentNeedsAttentionSubject,
} from "@/emails/document-needs-attention";
import { DocumentsSharedEmail, documentsSharedSubject } from "@/emails/documents-shared";
import {
  OffersAcceptedEmail,
  offersAcceptedSubject,
  offersReceivedSubject,
} from "@/emails/offers-accepted";
import { ListingToReviewEmail, listingToReviewSubject } from "@/emails/listing-submitted";
import { ListingsToReviewEmail, listingsToReviewSubject } from "@/emails/listings-to-review";
import { NewMessagesEmail, newMessagesSubject } from "@/emails/new-messages";
import { OfferAnsweredEmail, offerAnsweredSubject } from "@/emails/offer-answered";
import { OfferExpiredEmail, offerExpiredSubject } from "@/emails/offer-expired";
import { OfferReceivedEmail, offerReceivedSubject } from "@/emails/offer-received";
import { OfferWithdrawnEmail, offerWithdrawnSubject } from "@/emails/offer-withdrawn";
import { ReportsToReviewEmail, reportsToReviewSubject } from "@/emails/reports-to-review";
import { VisitBookedEmail, visitBookedSubject } from "@/emails/visit-booked";
import { VisitCancelledEmail, visitCancelledSubject } from "@/emails/visit-cancelled";
import { VisitFeedbackEmail, visitFeedbackSubject } from "@/emails/visit-feedback";
import { VisitInvitedEmail, visitInvitedSubject } from "@/emails/visit-invited";
import { VisitReminderEmail, visitReminderSubject } from "@/emails/visit-reminder";
import { formatAmount, formatHour, formatPrice } from "@/lib/format";
import { PlanEndingEmail, planEndingSubject } from "@/emails/plan-ending";
import {
  WithdrawalsToProcessEmail,
  withdrawalsToProcessSubject,
} from "@/emails/withdrawals-to-process";
import { legalDate, legalDateTime } from "@/leenkey/billing/withdrawal";
import { formatNumericDateTime } from "@/leenkey/offers/document";
import { gapLabel, offerGap } from "@/leenkey/offers/figures";
import { visitDateTime } from "@/leenkey/visits/dates";
import { visitIcs } from "@/leenkey/visits/ics";
import { visitSheetPath } from "@/leenkey/visits/sheet";
import { frAdminUsers } from "@/lib/i18n/sections/adminUsers";
import { frEmails } from "@/lib/i18n/sections/emails";
import { frFinancingDocument } from "@/lib/i18n/sections/financingDocument";
import { frFinancingStatus } from "@/lib/i18n/sections/financingStatus";
import { frLegal } from "@/lib/i18n/sections/legal";
import { roleLabels } from "./catalog";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { adminListingsHref } from "@/lib/validations/admin";
import type { Database } from "@/types/database";

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
  // L2-04a: an offer received (the seller), its answer (the buyer): at once,
  // unless the account turned the emails of the offers off.
  "offer.received": { audience: "recipient", preference: "email_offers", throttleMinutes: 0 },
  "offer.answered": { audience: "recipient", preference: "email_offers", throttleMinutes: 0 },
  // L2-04b: an offer withdrawn (the seller), an offer expired (its buyer, its seller).
  "offer.withdrawn": { audience: "recipient", preference: "email_offers", throttleMinutes: 0 },
  "offer.expired": { audience: "recipient", preference: "email_offers", throttleMinutes: 0 },
  // L2-07: an offer accepted on a sale with an adviser, to the team: the first at once, the
  // next ones together.
  "offer.accepted_team": { audience: "team", throttleMinutes: 20 },
  // 2026-11-21 (answers of Cédric of 2026-11-19): an offer received on a sale with an adviser,
  // to the team, grouped as the offers accepted; a proof of financing checked (its buyer) and
  // a report handled (its author): at once, always sent, the account asked for them.
  "offer.received_team": { audience: "team", throttleMinutes: 20 },
  "financing.checked": { audience: "recipient", throttleMinutes: 0 },
  "report.handled": { audience: "recipient", throttleMinutes: 0 },
  // 2026-11-23: an identity document checked or refused (its buyer): at once, always sent,
  // the booking of a visit depends on it.
  "identity.checked": { audience: "recipient", throttleMinutes: 0 },
  "identity.refused": { audience: "recipient", throttleMinutes: 0 },
  // L3-02: an invitation to visit (the buyer), at once, unless the account turned the emails
  // of its conversations off: the invitation is also a notice of the conversation.
  "visit.invited": { audience: "recipient", preference: "email_messages", throttleMinutes: 0 },
  // A visit booked, cancelled, and its reminder the day before: always sent, a party must
  // know where and when it is expected, or that it no longer is.
  "visit.booked": { audience: "recipient", throttleMinutes: 0 },
  "visit.cancelled": { audience: "recipient", throttleMinutes: 0 },
  "visit.reminder": { audience: "recipient", throttleMinutes: 0 },
  // L3-03: the request for feedback the day after a visit: once, unless the account turned
  // the emails of its conversations off (as the invitation: it is about the other party).
  "visit.feedback_requested": {
    audience: "recipient",
    preference: "email_messages",
    throttleMinutes: 0,
  },
  // L3-04: documents shared (the buyer): « un email par bien et par jour », the shares that
  // come meanwhile go together in the next one; a request to read the documents (the seller):
  // at once. Both follow the preference of the messages: they come from the other party.
  // 23 hours, not 24: a share made right after an email would be a day old when its turn
  // comes, and an email of an event a day old never leaves (core/notifications/batch.ts).
  "document.shared": { audience: "recipient", preference: "email_messages", throttleMinutes: 1380 },
  "document.access_requested": {
    audience: "recipient",
    preference: "email_messages",
    throttleMinutes: 0,
  },
  // L3-05: a document to check (illegible, incomplete, not what its type says), to its
  // seller: the first at once, those found in the hour that follows together (a seller
  // files several documents in a row).
  "document.needs_attention": { audience: "recipient", throttleMinutes: 60 },
  // DECISIONS.md 2026-11-22: a request to bring a listing into line, its reminder, the
  // deletion once the deadline passed: at once, always sent (it is about their listing).
  "listing.compliance_requested": { audience: "recipient", throttleMinutes: 0 },
  "listing.compliance_reminder": { audience: "recipient", throttleMinutes: 0 },
  "listing.deleted": { audience: "recipient", throttleMinutes: 0 },
};

export function emailPolicy(type: string): EmailPolicy | null {
  return POLICIES[type] ?? null;
}

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

/** The base an email reads when it leaves (the service role client of the cron). */
export type EmailDatabase = Pick<SupabaseClient<Database>, "rpc">;

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
  const latest = email.items.at(-1);
  if (!latest) return null;
  const count = email.items.length;
  const team = email.audience === "team";
  // A request for an intervention of the adviser is a message of the seller
  // (DECISIONS.md 2026-11-23): the email of the team says so, shows it and
  // leads to it, even when another message followed it (« PS : … »).
  const request = team
    ? [...email.items].reverse().find((item) => item.data.intervention === true)
    : undefined;
  const intervention = request !== undefined;
  const last = request ?? latest;
  const words = text(last.data.excerpt);
  const excerpt = emailSafeText(words);
  const senderName = team
    ? emailSafeText(last.data.sender_first_name)
    : fr.emails.newMessages.advisorSender;
  const reference = text(last.data.reference);
  const teamSubject = intervention
    ? fr.emails.newMessages.advisorTeamInterventionSubject(senderName, reference)
    : fr.emails.newMessages.advisorTeamSubject(senderName, reference, count);
  return rendered(
    team ? teamSubject : newMessagesSubject(senderName, count),
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
      subject: team ? teamSubject : undefined,
      intervention,
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

/**
 * Offers accepted on sales with an adviser (L2-07), to the team: one line
 * each. The same for the offers received on such sales (`received`).
 */
async function offersAccepted(
  email: PlannedEmail,
  received = false,
): Promise<RenderedEmail | null> {
  const [first] = email.items;
  if (!first) return null;
  const count = email.items.length;
  const items = email.items.map((item) => {
    const price = Number(item.data.price_cents);
    return {
      reference: text(item.data.reference) ?? "",
      property:
        [text(item.data.listing_reference), emailSafeText(item.data.city)]
          .filter(Boolean)
          .join(" · ") || null,
      price: Number.isFinite(price) && price > 0 ? formatAmount(price) : null,
    };
  });
  const reference = text(first.data.listing_reference);
  return rendered(
    received ? offersReceivedSubject(count, reference) : offersAcceptedSubject(count, reference),
    OffersAcceptedEmail({
      items,
      url: absoluteUrl(
        count > 1
          ? received
            ? "/admin/offres?statut=en-attente"
            : "/admin/offres?statut=acceptees"
          : (first.link ?? "/admin/offres"),
      ),
      siteUrl: siteUrl(),
      received,
    }),
  );
}

const isFinancingDocumentType = (value: unknown): value is keyof typeof frFinancingDocument.types =>
  typeof value === "string" && value in frFinancingDocument.types;

/**
 * A proof of financing checked by the team, to its buyer: « vérifié », never
 * « validé »; what a seller sees of it, the file deleted, what the check does
 * not guarantee.
 */
async function financingChecked(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  const t = fr.emails.financingChecked;
  const type = last.data.document_type;
  return rendered(
    t.subject,
    AccountNoticeEmail({
      firstName: email.firstName,
      title: t.title,
      paragraphs: [
        t.text(isFinancingDocumentType(type) ? frFinancingDocument.types[type] : null),
        t.next,
        t.scope,
      ],
      action: { href: absoluteUrl(last.link ?? "/acquereur/profil"), label: t.action },
      why: t.why,
      siteUrl: siteUrl(),
    }),
  );
}

/**
 * An identity document checked or refused by the team, to its buyer:
 * « vérifiée », never « validée »; the reason of a refusal as the team wrote
 * it for them; never anything of the document itself.
 */
async function identityDecided(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  const link = absoluteUrl(last.link ?? "/acquereur/profil#identite");
  if (email.type === "identity.checked") {
    const t = fr.emails.identityChecked;
    return rendered(
      t.subject,
      AccountNoticeEmail({
        firstName: email.firstName,
        title: t.title,
        paragraphs: [t.text, t.next],
        action: { href: link, label: t.action },
        why: t.why,
        siteUrl: siteUrl(),
      }),
    );
  }
  const t = fr.emails.identityRefused;
  // Written by the team: made safe for a mail client all the same.
  const reason = emailSafeText(last.data.reason);
  return rendered(
    t.subject,
    AccountNoticeEmail({
      firstName: email.firstName,
      title: t.title,
      paragraphs: [t.text, ...(reason ? [t.reason(reason)] : []), t.next],
      action: { href: link, label: t.action },
      why: t.why,
      siteUrl: siteUrl(),
    }),
  );
}

/** A report handled by the team, to its author: never what was decided, nor its note. */
async function reportHandled(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  const t = fr.emails.reportHandled;
  return rendered(
    t.subject,
    AccountNoticeEmail({
      firstName: email.firstName,
      title: t.title,
      // Written by a seller: made safe for a mail client.
      paragraphs: [t.text(emailSafeText(last.data.listing_title)), t.next],
      action: { href: absoluteUrl(last.link ?? "/messages"), label: t.action },
      why: t.why,
      siteUrl: siteUrl(),
    }),
  );
}

/**
 * The request to bring a listing into line, its reminder, the deletion once
 * the deadline passed (DECISIONS.md 2026-11-22), to its seller: the reason of
 * the team, the deadline, a link; an answer goes to Leenkey.
 */
async function listingCompliance(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  const reference = text(last?.data.reference);
  if (!last || !reference) return null;
  const t = fr.emails.listingCompliance;
  // Written by the seller: made safe for a mail client.
  const listing = t.listing(emailSafeText(last.data.title));
  const reason = text(last.data.reason);
  const dueAt = text(last.data.due_at);
  const due = dueAt && !Number.isNaN(Date.parse(dueAt)) ? legalDateTime(dueAt) : null;
  const deleted = email.type === "listing.deleted";
  const kind = deleted
    ? t.deleted
    : email.type === "listing.compliance_reminder"
      ? t.reminder
      : t.requested;
  if (!deleted && !due) return null;
  const first = deleted
    ? t.deleted.text(listing)
    : kind === t.reminder
      ? t.reminder.text(listing, due ?? "")
      : t.requested.text(listing, due ?? "");
  return rendered(
    kind.subject(reference),
    AccountNoticeEmail({
      firstName: email.firstName,
      title: kind.title,
      paragraphs: [first, ...(reason ? [t.reason(reason)] : []), kind.next],
      action: {
        href: absoluteUrl(last.link ?? "/vendeur"),
        label: kind.action,
      },
      why: t.why,
      siteUrl: siteUrl(),
    }),
    fr.legal.contactEmail,
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

const cents = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

const isFinancingStatus = (value: unknown): value is keyof typeof frFinancingStatus =>
  typeof value === "string" && value in frFinancingStatus;

/** An offer received (L2-04a), to its seller: amount, gap, financing status, a link; no PDF. */
async function offerReceived(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  const price = cents(last?.data.price_cents);
  const reference = text(last?.data.reference);
  if (!last || !price || !reference) return null;
  const asking = cents(last.data.asking_price_cents);
  const gap = asking ? offerGap(price, asking) : null;
  const status = last.data.financing_status;
  const validUntil = text(last.data.validity_until);
  return rendered(
    offerReceivedSubject(reference, formatPrice(price)),
    OfferReceivedEmail({
      firstName: email.firstName,
      buyerFirstName: emailSafeText(last.data.buyer_first_name),
      property: emailSafeText(last.data.title) ?? reference,
      price: formatPrice(price),
      asking: asking ? formatPrice(asking) : null,
      gap: gap ? gapLabel(gap) : null,
      financing: frFinancingStatus[isFinancingStatus(status) ? status : "not_provided"],
      validUntil: validUntil ? formatNumericDateTime(validUntil) : null,
      offerUrl: absoluteUrl(last.link ?? "/vendeur"),
      siteUrl: siteUrl(),
    }),
  );
}

/** The answer of the seller (L2-04a), to the buyer of the offer, with its message. */
async function offerAnswered(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  const price = cents(last?.data.price_cents);
  const reference = text(last?.data.reference);
  if (!last || !price || !reference) return null;
  const accepted = last.data.accepted === true;
  return rendered(
    offerAnsweredSubject(accepted, reference),
    OfferAnsweredEmail({
      firstName: email.firstName,
      accepted,
      property: emailSafeText(last.data.title) ?? reference,
      price: formatPrice(price),
      message: emailSafeText(last.data.message),
      offerUrl: absoluteUrl(last.link ?? "/acquereur"),
      siteUrl: siteUrl(),
    }),
  );
}

/** An offer withdrawn by its buyer (L2-04b), to the seller: the date and the time of the withdrawal. */
async function offerWithdrawn(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  const price = cents(last?.data.price_cents);
  const reference = text(last?.data.reference);
  if (!last || !price || !reference) return null;
  const withdrawnAt = text(last.data.withdrawn_at);
  return rendered(
    offerWithdrawnSubject(reference),
    OfferWithdrawnEmail({
      firstName: email.firstName,
      buyerFirstName: emailSafeText(last.data.buyer_first_name),
      property: emailSafeText(last.data.title) ?? reference,
      price: formatPrice(price),
      withdrawnAt: withdrawnAt ? formatNumericDateTime(withdrawnAt) : null,
      offerUrl: absoluteUrl(last.link ?? "/vendeur"),
      siteUrl: siteUrl(),
    }),
  );
}

/** An offer past its validity (L2-04b), to its buyer or to its seller (`role`). */
async function offerExpired(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  const price = cents(last?.data.price_cents);
  const reference = text(last?.data.reference);
  if (!last || !price || !reference) return null;
  const seller = last.data.role === "seller";
  const expiredAt = text(last.data.expired_at);
  return rendered(
    offerExpiredSubject(reference),
    OfferExpiredEmail({
      firstName: email.firstName,
      seller,
      property: emailSafeText(last.data.title) ?? reference,
      price: formatPrice(price),
      expiredAt: expiredAt ? formatNumericDateTime(expiredAt) : null,
      offerUrl: absoluteUrl(last.link ?? (seller ? "/vendeur" : "/acquereur")),
      siteUrl: siteUrl(),
    }),
  );
}

/** « Maison 5 pièces » and its town, said once: the titles often carry it already. */
function visitPlace(item: QueuedNotification): { property: string | null; city: string | null } {
  const property = emailSafeText(item.data.title);
  const city = emailSafeText(item.data.city);
  const said =
    property && city
      ? property.toLocaleLowerCase("fr-FR").includes(city.toLocaleLowerCase("fr-FR"))
      : false;
  return { property, city: said ? null : city };
}

function instant(value: unknown): string | null {
  const iso = text(value);
  return iso && !Number.isNaN(Date.parse(iso)) ? iso : null;
}

/** An invitation to visit (L3-02), to the buyer: the link to book, until when. Never the address. */
async function visitInvited(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  // Without its link (the token), the invitation leads nowhere.
  if (!last?.link) return null;
  const { property, city } = visitPlace(last);
  const expiresAt = instant(last.data.expires_at);
  return rendered(
    visitInvitedSubject(emailSafeText(last.data.city)),
    VisitInvitedEmail({
      firstName: email.firstName,
      sellerFirstName: emailSafeText(last.data.seller_first_name),
      property,
      city,
      validUntil: expiresAt ? visitDateTime(expiresAt) : null,
      bookingUrl: absoluteUrl(last.link),
      siteUrl: siteUrl(),
    }),
  );
}

type VisitNow = {
  startsAt: string;
  endsAt: string;
  /** « 12 rue des Lilas, 91600 Savigny-sur-Orge » */
  address: string | null;
  city: string | null;
};

/**
 * A visit as it is when its email leaves (visit_email_facts, service role):
 * its slot and the exact address. Null when it is no longer confirmed, or is
 * not found: nothing to confirm, nothing to remind. Throws when the base does
 * not answer: the email is tried again later.
 */
async function confirmedVisit(
  item: QueuedNotification,
  supabase: EmailDatabase | undefined,
): Promise<VisitNow | null> {
  const id = text(item.data.visit_id);
  if (!id || !supabase) return null;
  const { data, error } = await supabase.rpc("visit_email_facts", { p_visit: id });
  if (error) throw new Error(`visit_email_facts: ${error.code} ${error.message}`);
  const facts = data?.[0];
  if (!facts || facts.status !== "confirmed") return null;
  const line = text(facts.address_line);
  const town = [text(facts.postal_code), text(facts.city)].filter(Boolean).join(" ");
  return {
    startsAt: facts.starts_at,
    endsAt: facts.ends_at,
    address: line ? [line, town].filter(Boolean).join(", ") : null,
    city: text(facts.city),
  };
}

const ICS_FILENAME = "visite-leenkey.ics";

/** The calendar file of a visit: the exact address, the town without it. */
function visitAttachment(
  item: QueuedNotification,
  visit: VisitNow,
  seller: boolean,
  url: string,
): EmailAttachment {
  const t = fr.emails.visit;
  const ics = visitIcs({
    id: text(item.data.visit_id) ?? item.id,
    startsAt: visit.startsAt,
    endsAt: visit.endsAt,
    summary: t.icsSummary(text(item.data.title)),
    location: visit.address ?? visit.city ?? text(item.data.city) ?? "",
    description: seller ? t.icsSeller(text(item.data.buyer_first_name)) : t.icsBuyer,
    url,
  });
  return { filename: ICS_FILENAME, content: Buffer.from(ics, "utf8").toString("base64") };
}

/**
 * A visit booked (L3-02), to its buyer and to the seller, with its calendar
 * file. The exact address is read when the email leaves and written for the
 * buyer only; nothing leaves for a visit cancelled meanwhile.
 */
async function visitBooked(
  email: PlannedEmail,
  supabase: EmailDatabase | undefined,
): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  const visit = await confirmedVisit(last, supabase);
  if (!visit) return null;
  const seller = last.data.role === "seller";
  const date = visitDateTime(visit.startsAt);
  const url = absoluteUrl(last.link ?? (seller ? "/vendeur" : "/acquereur"));
  const visitId = text(last.data.visit_id);
  const content = await rendered(
    visitBookedSubject(date),
    VisitBookedEmail({
      firstName: email.firstName,
      seller,
      buyerFirstName: emailSafeText(last.data.buyer_first_name),
      property: emailSafeText(last.data.title),
      date,
      address: seller ? null : visit.address,
      // Read on the site, signed in (DECISIONS.md 2026-11-24): never a file here.
      sheetUrl:
        !seller && visitId ? absoluteUrl(visitSheetPath(encodeURIComponent(visitId))) : null,
      visitUrl: url,
      siteUrl: siteUrl(),
    }),
  );
  return { ...content, attachments: [visitAttachment(last, visit, seller, url)] };
}

/** A visit cancelled (L3-02), to the party who did not cancel: no address. */
async function visitCancelled(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  const startsAt = instant(last?.data.starts_at);
  if (!last || !startsAt) return null;
  const seller = last.data.role === "seller";
  const date = visitDateTime(startsAt);
  return rendered(
    visitCancelledSubject(date),
    VisitCancelledEmail({
      firstName: email.firstName,
      seller,
      buyerFirstName: emailSafeText(last.data.buyer_first_name),
      property: emailSafeText(last.data.title),
      date,
      visitUrl: absoluteUrl(last.link ?? (seller ? "/vendeur" : "/acquereur")),
      siteUrl: siteUrl(),
    }),
  );
}

/** The reminder of a visit (L3-02), the day before: as its confirmation. */
async function visitReminder(
  email: PlannedEmail,
  supabase: EmailDatabase | undefined,
): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  const visit = await confirmedVisit(last, supabase);
  if (!visit) return null;
  const seller = last.data.role === "seller";
  const url = absoluteUrl(last.link ?? (seller ? "/vendeur" : "/acquereur"));
  const content = await rendered(
    visitReminderSubject(formatHour(visit.startsAt)),
    VisitReminderEmail({
      firstName: email.firstName,
      seller,
      buyerFirstName: emailSafeText(last.data.buyer_first_name),
      property: emailSafeText(last.data.title),
      date: visitDateTime(visit.startsAt),
      address: seller ? null : visit.address,
      visitUrl: url,
      siteUrl: siteUrl(),
    }),
  );
  return { ...content, attachments: [visitAttachment(last, visit, seller, url)] };
}

/** The request for feedback (L3-03), the day after a visit, to each party: no address. */
async function visitFeedbackRequested(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  const startsAt = instant(last?.data.starts_at);
  if (!last || !startsAt) return null;
  const seller = last.data.role === "seller";
  return rendered(
    visitFeedbackSubject(seller),
    VisitFeedbackEmail({
      firstName: email.firstName,
      seller,
      buyerFirstName: emailSafeText(last.data.buyer_first_name),
      property: emailSafeText(last.data.title),
      date: visitDateTime(startsAt),
      visitUrl: absoluteUrl(last.link ?? (seller ? "/vendeur" : "/acquereur")),
      siteUrl: siteUrl(),
    }),
  );
}

/**
 * Documents shared (L3-04), to the buyer: one email per property and per day,
 * with the number shared by every row it covers. Never the name of a document.
 */
async function documentsShared(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  // A row whose facts carry no number still says one document at least.
  const count = email.items.reduce((sum, item) => {
    const shared = item.data.count;
    return (
      sum + (typeof shared === "number" && Number.isInteger(shared) && shared > 0 ? shared : 1)
    );
  }, 0);
  const { property, city } = visitPlace(last);
  return rendered(
    documentsSharedSubject(count, emailSafeText(last.data.city)),
    DocumentsSharedEmail({
      firstName: email.firstName,
      count,
      property,
      city,
      documentsUrl: absoluteUrl(last.link ?? "/acquereur/documents"),
      siteUrl: siteUrl(),
    }),
  );
}

/**
 * A request to read the documents (L3-04), to the seller: the first name of
 * the buyer, the status of the financing in its exact words, a link. Never an
 * amount, never a contact detail of the buyer.
 */
async function documentAccessRequested(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  const buyerFirstName = emailSafeText(last.data.buyer_first_name);
  const status = last.data.financing_status;
  return rendered(
    documentAccessRequestedSubject(buyerFirstName),
    DocumentAccessRequestedEmail({
      firstName: email.firstName,
      buyerFirstName,
      property: emailSafeText(last.data.title),
      financing: frFinancingStatus[isFinancingStatus(status) ? status : "not_provided"],
      requestUrl: absoluteUrl(last.link ?? "/vendeur"),
      siteUrl: siteUrl(),
    }),
  );
}

/**
 * Documents to check (L3-05), to their seller: each by the name the seller gave it (when it
 * can go in an email) and what is wrong in fixed words. Never what the assistant wrote about
 * it: read from a file, it does not go in an email.
 */
async function documentsNeedAttention(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  const problems: Record<string, string> = fr.emails.documents.needsAttention.problems;
  const documents = email.items.flatMap((item) => {
    const problem = typeof item.data.quality === "string" ? problems[item.data.quality] : null;
    return problem ? [{ title: emailSafeText(item.data.document_title), problem }] : [];
  });
  if (documents.length === 0) return null;
  return rendered(
    documentNeedsAttentionSubject(documents.length),
    DocumentNeedsAttentionEmail({
      firstName: email.firstName,
      property: emailSafeText(last.data.title),
      documents,
      documentsUrl: absoluteUrl(last.link ?? "/vendeur"),
      siteUrl: siteUrl(),
    }),
  );
}

/**
 * The email of a group, ready to leave; null when its type has none. The
 * emails of a visit read it when they leave (its address, whether it is still
 * confirmed): they need the client of the cron, and send nothing without it.
 */
export function renderNotificationEmail(
  email: PlannedEmail,
  supabase?: EmailDatabase,
): Promise<RenderedEmail | null> {
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
    case "offer.received":
      return offerReceived(email);
    case "offer.answered":
      return offerAnswered(email);
    case "offer.withdrawn":
      return offerWithdrawn(email);
    case "offer.expired":
      return offerExpired(email);
    case "offer.accepted_team":
      return offersAccepted(email);
    case "offer.received_team":
      return offersAccepted(email, true);
    case "financing.checked":
      return financingChecked(email);
    case "report.handled":
      return reportHandled(email);
    case "identity.checked":
    case "identity.refused":
      return identityDecided(email);
    case "visit.invited":
      return visitInvited(email);
    case "visit.booked":
      return visitBooked(email, supabase);
    case "visit.cancelled":
      return visitCancelled(email);
    case "visit.reminder":
      return visitReminder(email, supabase);
    case "visit.feedback_requested":
      return visitFeedbackRequested(email);
    case "document.shared":
      return documentsShared(email);
    case "document.access_requested":
      return documentAccessRequested(email);
    case "document.needs_attention":
      return documentsNeedAttention(email);
    case "listing.compliance_requested":
    case "listing.compliance_reminder":
    case "listing.deleted":
      return listingCompliance(email);
    default:
      return Promise.resolve(null);
  }
}
