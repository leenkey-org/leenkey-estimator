import type { ReactElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { render } from "@react-email/components";
import { FacadeRoot } from "@/components/shared/facade-root";
import { AccountSuspendedEmail, accountSuspendedSubject } from "@/emails/account-suspended";
import { ListingDecisionEmail, listingDecisionSubject } from "@/emails/listing-decision";
import {
  ListingReceivedEmail,
  ListingToReviewEmail,
  listingReceivedSubject,
  listingToReviewSubject,
} from "@/emails/listing-submitted";
import { ListingsToReviewEmail, listingsToReviewSubject } from "@/emails/listings-to-review";
import { NewMessagesEmail, newMessagesSubject } from "@/emails/new-messages";
import { PlanActivatedEmail, planActivatedSubject } from "@/emails/plan-activated";
import { PlanEndingEmail, planEndingSubject } from "@/emails/plan-ending";
import { WithdrawalReceivedEmail, withdrawalReceivedSubject } from "@/emails/withdrawal-received";
import {
  WithdrawalsToProcessEmail,
  withdrawalsToProcessSubject,
} from "@/emails/withdrawals-to-process";
import { PlanPurchasedEmail, planPurchasedSubject } from "@/emails/plan-purchased";
import { ReportsToReviewEmail, reportsToReviewSubject } from "@/emails/reports-to-review";
import { AccountsCreatedEmail, accountsCreatedSubject } from "@/emails/accounts-created";
import { UserWarnedEmail, userWarnedSubject } from "@/emails/user-warned";
import { formatPrice } from "@/lib/format";
import { isProduction } from "@/lib/env";
import { frEmails } from "@/lib/i18n/sections/emails";
import { frLegal } from "@/lib/i18n/sections/legal";
import { siteUrl } from "@/lib/site";
import * as content from "../_content";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails, legal: frLegal } as const;

// Every email of the V2 with example data (SPEC-V2 section 18, « Aperçu de
// tous les emails », L1-22), as they leave: the same templates, the same
// rendering. Local and preprod only, like the catalogue.

const t = content.emails;

export const metadata: Metadata = isProduction()
  ? {}
  : { title: t.metaTitle, robots: { index: false, follow: false } };

type Preview = { name: string; subject: string; element: ReactElement };

function previews(): Preview[] {
  const site = siteUrl();
  const s = t.sample;
  const price = formatPrice(48_900_000);
  const decision = {
    firstName: s.seller,
    title: s.title,
    listingUrl: `${site}/annonce/maison-5-pieces-lk0042`,
    sellerUrl: `${site}/vendeur`,
    contactEmail: fr.legal.contactEmail,
    siteUrl: site,
  };
  const message = {
    firstName: s.seller,
    senderName: s.buyer,
    listingTitle: s.title,
    count: 1,
    recipient: "seller" as const,
    conversationUrl: `${site}/messages`,
    siteUrl: site,
  };
  return [
    {
      name: t.names.received,
      subject: listingReceivedSubject(s.reference),
      element: ListingReceivedEmail({
        firstName: s.seller,
        title: s.title,
        sellerUrl: `${site}/vendeur`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.toReview,
      subject: listingToReviewSubject(s.reference),
      element: ListingToReviewEmail({
        title: s.title,
        reference: s.reference,
        place: s.place,
        price,
        sellerName: s.seller,
        adminUrl: `${site}/admin/annonces`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.toReviewMany,
      subject: listingsToReviewSubject(s.others.length + 1),
      element: ListingsToReviewEmail({
        items: [{ title: s.title, reference: s.reference, place: s.place }, ...s.others].map(
          (item) => ({
            title: item.title,
            details: fr.emails.listingToReview.details(item.reference, item.place, price, null),
            adminUrl: `${site}/admin/annonces?ref=${item.reference}`,
          }),
        ),
        listUrl: `${site}/admin/annonces?statut=a-valider`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.published,
      subject: listingDecisionSubject("published", s.reference),
      element: ListingDecisionEmail({ ...decision, decision: "published" }),
    },
    {
      name: t.names.rejected,
      subject: listingDecisionSubject("rejected", s.reference),
      element: ListingDecisionEmail({ ...decision, decision: "rejected", reason: s.reason }),
    },
    {
      name: t.names.suspended,
      subject: listingDecisionSubject("suspended", s.reference),
      element: ListingDecisionEmail({ ...decision, decision: "suspended", reason: s.reason }),
    },
    {
      name: t.names.accountSuspended,
      subject: accountSuspendedSubject(),
      element: AccountSuspendedEmail({
        firstName: s.buyer,
        reason: s.reason,
        contactEmail: fr.legal.contactEmail,
        siteUrl: site,
      }),
    },
    {
      name: t.names.userWarned,
      subject: userWarnedSubject(),
      element: UserWarnedEmail({
        firstName: s.buyer,
        reason: s.warning,
        contactEmail: fr.legal.contactEmail,
        siteUrl: site,
      }),
    },
    {
      name: t.names.reportsToReview,
      subject: reportsToReviewSubject(1, s.reference),
      element: ReportsToReviewEmail({
        items: [{ reason: s.reportReason, reference: s.reference }],
        url: `${site}/admin/signalements`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.accountsCreated,
      subject: accountsCreatedSubject(1),
      element: AccountsCreatedEmail({
        items: [{ name: "Alice M.", roles: "Vendeur" }],
        url: `${site}/admin/utilisateurs`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.planActivated,
      subject: planActivatedSubject("Accompagné", s.reference),
      element: PlanActivatedEmail({
        firstName: "Bruno",
        planName: "Accompagné",
        property: s.reference,
        amount: formatPrice(99000),
        orderedOn: "2 novembre 2026",
        endsOn: "2 novembre 2027",
        contactFrom: "mardi 17 novembre",
        earlyStart: false,
        features: [
          "Un conseiller Leenkey dédié",
          "Un regard personnalisé sur votre prix et votre stratégie de vente",
          "Relecture et optimisation de votre annonce",
        ],
        cguVersion: "28 juin 2026",
        cgvVersion: "17 octobre 2026",
        withdrawalUntil: "16 novembre 2026",
        mediator: null,
        planUrl: `${site}/vendeur/formule`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.withdrawalReceived,
      subject: withdrawalReceivedSubject("Accompagné"),
      element: WithdrawalReceivedEmail({
        firstName: "Bruno",
        planName: "Accompagné",
        property: s.reference,
        requestedAt: "5 novembre 2026 à 14:05",
        orderedOn: "2 novembre 2026",
        amount: formatPrice(99000),
        earlyStart: false,
        replaced: null,
        planUrl: `${site}/vendeur/formule`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.withdrawalsToProcess,
      subject: withdrawalsToProcessSubject([
        {
          planName: "Accompagné",
          property: s.reference,
          amount: formatPrice(99000),
          requestedAt: "5 novembre 2026 à 14:05",
          earlyStart: false,
        },
      ]),
      element: WithdrawalsToProcessEmail({
        items: [
          {
            planName: "Accompagné",
            property: s.reference,
            amount: formatPrice(99000),
            requestedAt: "5 novembre 2026 à 14:05",
            earlyStart: false,
          },
        ],
        casesUrl: `${site}/admin/dossiers`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.planEnding,
      subject: planEndingSubject("Sérénité", "2 décembre 2026"),
      element: PlanEndingEmail({
        firstName: "Bruno",
        planName: "Sérénité",
        property: s.reference,
        endsOn: "2 décembre 2026",
        planUrl: `${site}/vendeur/formule`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.planPurchased,
      subject: planPurchasedSubject("Sérénité", s.reference, true),
      element: PlanPurchasedEmail({
        planName: "Sérénité",
        upgrade: true,
        property: s.reference,
        seller: "Bruno Lefèvre",
        amount: formatPrice(51000),
        earlyStart: true,
        casesUrl: `${site}/admin/dossiers`,
        siteUrl: site,
      }),
    },
    {
      name: t.names.messageSeller,
      subject: newMessagesSubject(s.buyer, 1),
      element: NewMessagesEmail({ ...message, excerpt: s.excerpt }),
    },
    {
      name: t.names.messagesBuyer,
      subject: newMessagesSubject(s.seller, 3),
      element: NewMessagesEmail({
        ...message,
        firstName: s.buyer,
        senderName: s.seller,
        excerpt: s.reply,
        count: 3,
        recipient: "buyer",
      }),
    },
    {
      name: t.names.messageLink,
      subject: newMessagesSubject(s.buyer, 1),
      element: NewMessagesEmail({ ...message, excerpt: null, excerptHidden: true }),
    },
  ];
}

export default async function EmailsPage() {
  if (isProduction()) notFound();
  const rendered = await Promise.all(
    previews().map(async (preview) => ({ ...preview, html: await render(preview.element) })),
  );
  return (
    <FacadeRoot className="min-h-dvh bg-lk-bg">
      <main className="lk-frame flex flex-col gap-8 py-10">
        <div className="flex flex-col gap-2">
          <Link href="/design" className="text-lk-secondary font-semibold text-lk-blue underline">
            {t.back}
          </Link>
          <h1 className="text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">{t.title}</h1>
          <p className="max-w-lk-prose text-lk-body text-lk-ink-2">{t.lead}</p>
        </div>
        {rendered.map((preview) => (
          <section key={preview.name} className="flex flex-col gap-2">
            <h2 className="text-lk-h3 font-bold text-wide text-lk-ink">{preview.name}</h2>
            <p className="text-lk-secondary text-lk-ink-2">
              {t.subject} : {preview.subject}
            </p>
            <iframe
              title={t.frame(preview.name)}
              srcDoc={preview.html}
              sandbox=""
              className="h-200 w-full max-w-150 rounded-lk-md border border-lk-line bg-lk-surface"
            />
          </section>
        ))}
      </main>
    </FacadeRoot>
  );
}
