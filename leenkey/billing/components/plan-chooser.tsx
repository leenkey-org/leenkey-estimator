"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PlanCard } from "@/components/shared/plan-card";
import type { PlanView } from "@/core/billing/plan-text";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { Database } from "@/types/database";
import { startCheckout, type StartCheckoutError } from "../actions";
import { planChoice } from "../orders";

// The plans of a property and their order (SPEC-V2 8.8 and 11, DESIGN.md
// 12.4): the three cards, the plan in force ticked, a lower one not
// selectable; « Choisir » opens the summary of the order (plan, property,
// price, 12 months, withdrawal, mediator, what is included), the two boxes
// never ticked beforehand and « Commander et payer … € TTC », which sends
// to Stripe. Nothing is activated on this page: the webhook does it.

const t = fr.billing;
const r = t.recap;

type PlanCode = Database["public"]["Enums"]["plan_code"];

export type PlanChooserProps = {
  propertyId: string;
  propertyName: string;
  plans: readonly PlanView[];
  /** The price of every plan, on sale or not: what a passage costs. */
  prices: readonly { code: PlanCode; name: string; priceCents: number }[];
  current: PlanCode;
  /** « Active depuis le 3 nov., jusqu'au 3 nov. 2027. » for the plan in force. */
  activeNote: string | null;
  /** Paid plans can be ordered (production: final CGV and mediator). */
  orderable: boolean;
  /**
   * Versions of the CGU and CGV accepted: sent with the order (refused when
   * newer ones were published meanwhile), and shown (« 28 juin 2026 »).
   */
  versions: { cgu: { id: string; date: string }; cgv: { id: string; date: string } };
  mediator: string | null;
};

const ERRORS: Record<StartCheckoutError, string> = {
  session: t.errors.session,
  suspended: t.errors.suspended,
  invalid: t.errors.invalid,
  terms_changed: t.errors.termsChanged,
  not_found: t.errors.notFound,
  sold: t.errors.sold,
  current: t.errors.current,
  withdrawn: t.errors.withdrawn,
  lower: t.errors.lower,
  closed: t.errors.closed,
  unavailable: t.errors.unavailable,
};

function CurrentLine({ note }: { note: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-2 text-lk-caption font-semibold text-lk-success">
        <Check aria-hidden="true" className="size-4" />
        {t.current}
      </p>
      {note ? <p className="text-lk-caption text-lk-ink-3">{note}</p> : null}
    </div>
  );
}

export function PlanChooser({
  propertyId,
  propertyName,
  plans,
  prices,
  current,
  activeNote,
  orderable,
  versions,
  mediator,
}: PlanChooserProps) {
  const [selected, setSelected] = useState<PlanCode | null>(null);
  const [terms, setTerms] = useState(false);
  const [earlyStart, setEarlyStart] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // On its way to Stripe: the button stays busy until the page is left.
  const [redirecting, setRedirecting] = useState(false);
  const busy = pending || redirecting;
  const recapTitle = useRef<HTMLHeadingElement>(null);
  const termsBox = useRef<HTMLInputElement>(null);
  // The dearest plan is put forward (SPEC 8.8: « Le plus complet »).
  const dearest = plans.reduce<PlanView | null>(
    (best, plan) => (best && best.priceCents >= plan.priceCents ? best : plan),
    null,
  );
  const currentPlan = prices.find((plan) => plan.code === current);

  useEffect(() => {
    if (selected) recapTitle.current?.focus();
  }, [selected]);

  // Back from Stripe with the back button, the page comes out of the cache
  // as it was left: the button is free again.
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  // Each order starts with its two boxes unticked (no box ticked
  // beforehand, decision of 2026-10-15): a box ticked for one plan never
  // carries over to another.
  const select = (code: PlanCode | null) => {
    setSelected(code);
    setTerms(false);
    setEarlyStart(false);
    setTermsError(false);
    setError(null);
  };

  const target = selected ? plans.find((plan) => plan.code === selected) : undefined;
  const choice = target ? planChoice(prices, current, target.code) : null;

  if (target && choice?.status === "order") {
    const price = formatPrice(choice.amountCents);
    const submit = () => {
      setError(null);
      if (!terms) {
        setTermsError(true);
        termsBox.current?.focus();
        return;
      }
      startTransition(async () => {
        let result;
        try {
          result = await startCheckout({
            propertyId,
            plan: target.code,
            acceptedTerms: true,
            cguVersion: versions.cgu.id,
            cgvVersion: versions.cgv.id,
            earlyStart,
          });
        } catch {
          setError(t.errors.network);
          return;
        }
        if (!result.ok) {
          setError(ERRORS[result.error]);
          return;
        }
        setRedirecting(true);
        window.location.assign(result.data.url);
      });
    };
    const facts = [
      { label: r.plan, value: target.name },
      { label: r.property, value: propertyName },
      {
        label: r.price,
        value:
          choice.kind === "upgrade" && currentPlan
            ? r.upgradeValue(price, currentPlan.name)
            : r.priceValue(price),
      },
      { label: r.duration, value: r.durationValue },
      { label: r.withdrawal, value: r.withdrawalValue },
      { label: r.mediator, value: mediator ?? r.mediatorPending },
    ];
    return (
      <section aria-labelledby="recapitulatif" className="flex flex-col gap-5">
        <h2
          id="recapitulatif"
          ref={recapTitle}
          tabIndex={-1}
          className="text-lk-h3 font-bold text-wide text-lk-ink outline-none"
        >
          {r.title}
        </h2>
        <dl className="flex flex-col divide-y divide-lk-line rounded-lk-md border border-lk-line bg-lk-surface">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
              <dt className="shrink-0 text-lk-caption text-lk-ink-3 sm:w-36 sm:pt-0.5">
                {fact.label}
              </dt>
              <dd className="text-lk-secondary font-semibold text-lk-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {target.features.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-lk-label font-semibold text-lk-ink">{r.includes}</h3>
            {target.intro ? (
              <p className="text-lk-secondary text-lk-ink-2">{target.intro}</p>
            ) : null}
            <ul className="flex flex-col gap-2">
              {target.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-lk-secondary text-lk-ink">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lk-blue" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {target.outro ? (
              <p className="text-lk-secondary text-lk-ink-2">{target.outro}</p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          <Checkbox
            ref={termsBox}
            name="terms"
            checked={terms}
            onChange={(event) => {
              setTerms(event.target.checked);
              if (event.target.checked) setTermsError(false);
            }}
            error={termsError ? r.termsRequired : undefined}
            label={
              <>
                {r.terms.before}
                <Link
                  href="/cgu"
                  target="_blank"
                  className="font-semibold text-lk-blue underline underline-offset-2"
                >
                  {r.terms.cgu}
                </Link>
                {r.terms.and}
                <Link
                  href="/cgv"
                  target="_blank"
                  className="font-semibold text-lk-blue underline underline-offset-2"
                >
                  {r.terms.cgv}
                </Link>
                {r.terms.after(versions.cgu.date, versions.cgv.date)}
              </>
            }
          />
          <div className="flex flex-col gap-1">
            <Checkbox
              name="earlyStart"
              checked={earlyStart}
              onChange={(event) => setEarlyStart(event.target.checked)}
              aria-describedby="demarrage-aide"
              label={r.earlyStart}
            />
            <p id="demarrage-aide" className="pl-8 text-lk-caption text-lk-ink-3">
              {r.earlyStartHelp}
            </p>
          </div>
        </div>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <div className="flex flex-col gap-3">
          <Button size="lg" loading={busy} onClick={submit} className="w-full">
            {r.pay(price)}
          </Button>
          <Button
            variant="ghost"
            className="self-center"
            disabled={busy}
            onClick={() => select(null)}
          >
            {r.change}
          </Button>
        </div>
        <Reassurance />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul aria-label={t.header} className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-4">
        {plans.map((plan) => {
          const free = plan.priceCents === 0;
          const status = planChoice(prices, current, plan.code);
          const featured = !free && dearest?.code === plan.code;
          let action;
          if (status.status === "current") {
            action = <CurrentLine note={free ? null : activeNote} />;
          } else if (status.status === "order") {
            action = orderable ? (
              <Button
                variant={featured ? "primary" : "secondary"}
                className="w-full"
                onClick={() => select(plan.code)}
              >
                {status.kind === "upgrade"
                  ? t.upgrade(plan.name, formatPrice(status.amountCents))
                  : t.choose(plan.name)}
              </Button>
            ) : undefined;
          } else if (!free) {
            action = <p className="text-lk-caption font-semibold text-lk-ink-3">{t.included}</p>;
          }
          return (
            <li key={plan.code} className={featured ? "flex pt-3 lg:pt-0" : "flex"}>
              <PlanCard
                className="flex-1"
                nameAs="h2"
                name={plan.name}
                price={free ? t.free : formatPrice(plan.priceCents)}
                priceSuffix={free ? undefined : t.taxes}
                featuresIntro={plan.intro ?? undefined}
                features={plan.features}
                featuresOutro={plan.outro ?? undefined}
                badge={featured ? t.badge : undefined}
                action={action}
              />
            </li>
          );
        })}
      </ul>
      <Reassurance />
    </div>
  );
}

function Reassurance() {
  return (
    <p className="flex items-start gap-3 rounded-lk-md border border-lk-line bg-lk-surface px-4 py-3.5 text-lk-caption text-lk-ink-2">
      <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-lk-success" />
      {t.reassurance}
    </p>
  );
}
