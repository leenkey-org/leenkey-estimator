import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { getUser, requireProfile } from "@/core/auth/session";
import { Payments } from "@/leenkey/billing/components/payments";
import { PaymentConfirmation } from "@/leenkey/billing/components/payment-confirmation";
import { planFeatures } from "@/core/billing/plans";
import { PlanComparison } from "@/leenkey/billing/components/plan-comparison";
import { PlanChooser } from "@/leenkey/billing/components/plan-chooser";
import { WithdrawalPanel } from "@/leenkey/billing/components/withdrawal-panel";
import { withdrawalView } from "@/leenkey/billing/withdrawal-view";
import { planPage } from "@/leenkey/billing/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { paidPlansOrderable, SALES_TERMS } from "@/lib/config/sales";
import { formatDate, formatDateShort } from "@/lib/format";
import { frBilling } from "@/lib/i18n/sections/billing";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { cn } from "@/lib/utils";
import { planCode, sessionIdSchema } from "@/lib/validations/billing";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { billing: frBilling } as const;

const t = fr.billing;

export const metadata: Metadata = { title: t.metaTitle };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** A published version (« 2026-10-17 ») as a date of the summary (« 17 octobre 2026 »). */
const versionDate = (version: string) =>
  formatDate(`${version}T12:00:00Z`, "1970-01-01T00:00:00Z").replace(/^\S+ /, "");

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-lk-form flex-1 flex-col gap-6 px-5 pt-6 pb-12 md:pt-10 lg:max-w-275 lg:px-8">
      {children}
    </div>
  );
}

// L1-26: the plan of a property (SPEC-V2 8.8 and 11, DESIGN.md 12.4): the
// three plans read in the table, the summary of the order and its two boxes,
// the payment on Stripe, and the return from it (?paiement=ok: the state the
// webhook wrote; ?paiement=annule). A plan is chosen per property: the one of
// ?bien=, else the one of « Ma vente »; under them, the comparison table of
// 11 bis (L1-33). L1-40: « Renoncer au contrat » during the 14 days, above the
// plans (« visible, directe et accessible »), with the choice a passage opens
// (DECISIONS.md 2026-11-26), then the request recorded and its refund to come.
// Under the plans, « Mes factures et paiements » (DECISIONS.md 2026-11-26):
// every payment of the seller, its invoice and the credit notes of its
// refunds (?document=indisponible: a download that could not be served).
export default async function PlanPage({ searchParams }: Props) {
  const profile = await requireProfile();
  const query = await searchParams;
  const requested = first(query.bien) ?? null;
  const [result, features] = await Promise.all([planPage(profile.id, requested), planFeatures()]);
  const data = result.ok ? result.data : null;
  const backHref = data ? `${ROUTES.seller}?bien=${data.property.id}` : ROUTES.seller;
  const header = (
    <AppHeader
      title={t.header}
      titleAs="p"
      back={
        <Link
          href={backHref}
          aria-label={t.back}
          className={cn(
            iconButtonVariants({ variant: "stone" }),
            "inline-flex items-center justify-center",
          )}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
      }
    />
  );

  if (!result.ok) {
    return (
      <>
        {header}
        <Body>
          <h1 className="text-lk-h2 font-bold text-wide text-lk-ink md:text-lk-h2-lg">{t.title}</h1>
          <InlineAlert
            tone="danger"
            action={
              <Link
                href={
                  requested
                    ? `/vendeur/formule?bien=${encodeURIComponent(requested)}`
                    : "/vendeur/formule"
                }
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {t.retry}
              </Link>
            }
          >
            {t.error}
          </InlineAlert>
        </Body>
      </>
    );
  }
  if (!data) {
    return (
      <>
        {header}
        <Body>
          <h1 className="sr-only">{t.title}</h1>
          <EmptyState
            className="py-10"
            title={t.noProperty.title}
            description={t.noProperty.text}
            action={
              <Button asChild>
                <Link href={ROUTES.newProperty}>{t.noProperty.action}</Link>
              </Button>
            }
          />
        </Body>
      </>
    );
  }

  const planHref = `/vendeur/formule?bien=${data.property.id}`;
  const payment = first(query.paiement);
  const session = sessionIdSchema.safeParse(first(query.session_id));
  if (payment === "ok" && session.success) {
    return (
      <>
        {header}
        <Body>
          <h1 className="sr-only">{t.title}</h1>
          <PaymentConfirmation
            sessionId={session.data}
            planNames={Object.fromEntries(data.prices.map((plan) => [plan.code, plan.name]))}
            backHref={backHref}
            reloadHref={`${planHref}&paiement=ok&session_id=${session.data}`}
          />
        </Body>
      </>
    );
  }

  const now = new Date();
  const sold = data.property.status === "sold";
  // What may be renounced within the 14 days, and the requests still to refund.
  const withdrawal = withdrawalView(data, features, now);
  const withdrawn = withdrawal.recorded.length > 0;
  const user = withdrawal.current ? await getUser() : null;
  // Nothing else is ordered while a plan is being renounced (L1-40).
  const orderable = paidPlansOrderable() && !sold && !withdrawn;
  const activeNote = data.active?.endsAt
    ? t.activeSince(
        formatDateShort(data.active.activatedAt, now),
        formatDateShort(data.active.endsAt, now),
      )
    : null;
  return (
    <>
      {header}
      <Body>
        {payment === "annule" ? <InlineAlert tone="info">{t.cancelled}</InlineAlert> : null}
        <div className="flex flex-col gap-2">
          <h1 className="text-lk-h2 font-bold text-wide text-lk-ink md:text-lk-h2-lg">{t.title}</h1>
          <p className="text-lk-secondary text-lk-ink-2 md:text-lk-body">{t.lead}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-lk-label font-semibold text-lk-ink">
            {t.property(data.property.name)}
          </p>
          {data.others.length > 0 ? (
            // Folded: a seller of seven properties would push the plans down.
            <details className="group">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-lk-caption font-semibold text-lk-blue underline-offset-2 hover:underline">
                {t.otherProperties(data.others.length + 1)}
              </summary>
              <nav aria-label={t.otherPropertiesLabel} className="flex flex-col pb-1">
                {data.others.map((other) => (
                  <Link
                    key={other.id}
                    href={`/vendeur/formule?bien=${other.id}`}
                    className="inline-flex min-h-11 items-center text-lk-secondary text-lk-ink underline-offset-2 hover:underline"
                  >
                    {other.name}
                  </Link>
                ))}
              </nav>
            </details>
          ) : null}
        </div>
        {withdrawal.current || withdrawn ? (
          <WithdrawalPanel
            {...withdrawal}
            propertyName={
              data.property.reference
                ? `${data.property.name} · ${data.property.reference}`
                : data.property.name
            }
            name={data.sellerName}
            email={user?.email ?? null}
          />
        ) : null}
        {sold ? <InlineAlert tone="info">{t.sold}</InlineAlert> : null}
        {!sold && !paidPlansOrderable() ? (
          <InlineAlert
            tone="info"
            action={
              <Link
                href={ROUTES.contact}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {t.closed.action}
              </Link>
            }
          >
            <strong className="block font-semibold">{t.closed.title}</strong>
            {t.closed.text}
          </InlineAlert>
        ) : null}
        <PlanChooser
          propertyId={data.property.id}
          propertyName={
            data.property.reference
              ? `${data.property.name} · ${data.property.reference}`
              : data.property.name
          }
          plans={data.plans}
          prices={data.prices}
          current={data.current}
          // From « Choisir Accompagné » of /tarifs (?formule=): that order open.
          initialPlan={planCode.safeParse(first(query.formule)).data ?? null}
          activeNote={activeNote}
          orderable={orderable}
          versions={{
            cgu: { id: LEGAL_VERSIONS.cgu, date: versionDate(LEGAL_VERSIONS.cgu) },
            cgv: { id: SALES_TERMS.cgvVersion, date: versionDate(SALES_TERMS.cgvVersion) },
          }}
          mediator={
            SALES_TERMS.mediator
              ? `${SALES_TERMS.mediator.name}, ${SALES_TERMS.mediator.url}`
              : null
          }
        />
        <Payments
          payments={data.payments}
          documentUnavailable={first(query.document) === "indisponible"}
        />
        {features ? <PlanComparison plans={data.plans} features={features} /> : null}
      </Body>
    </>
  );
}
