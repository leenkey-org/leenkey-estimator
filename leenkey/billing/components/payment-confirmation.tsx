"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { formatDate } from "@/lib/format";
import { frBilling } from "@/lib/i18n/sections/billing";
import { checkoutStatus } from "../actions";
import { firstContactFrom } from "../orders";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { billing: frBilling } as const;

// The return from Stripe (SPEC-V2 section 11, step 4): the page activates
// nothing, it reads the state the webhook wrote. « Paiement en cours de
// confirmation » while the subscription is not there, read again every 2 s
// for 30 s; then « C'est activé. » with when the advisor gets in touch, or
// « Paiement reçu » when the team checks the order before activating it.

const t = fr.billing.confirmation;
const POLL_MS = 2_000;
const MAX_MS = 30_000;

type State =
  | { kind: "pending" }
  | { kind: "slow" }
  | { kind: "held" }
  | { kind: "done"; planName: string; contactFrom: string | null };

export function PaymentConfirmation({
  sessionId,
  planNames,
  backHref,
  reloadHref,
}: {
  sessionId: string;
  /** Names of the plans, by code (table plans). */
  planNames: Record<string, string>;
  backHref: string;
  reloadHref: string;
}) {
  const [state, setState] = useState<State>({ kind: "pending" });
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      let result;
      try {
        result = await checkoutStatus(sessionId);
      } catch {
        result = null;
      }
      if (stopped) return;
      if (result?.ok && result.data.state === "held") {
        setState({ kind: "held" });
        return;
      }
      if (result?.ok && result.data.state === "active") {
        const contact = firstContactFrom(new Date(result.data.activatedAt), result.data.earlyStart);
        setState({
          kind: "done",
          planName: planNames[result.data.plan] ?? result.data.plan,
          contactFrom: contact ? formatDate(contact) : null,
        });
        return;
      }
      if (Date.now() - started >= MAX_MS) {
        setState({ kind: "slow" });
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, planNames]);

  useEffect(() => {
    if (state.kind !== "pending") heading.current?.focus();
  }, [state.kind]);

  const done = state.kind === "done";
  return (
    <section
      aria-live="polite"
      aria-busy={state.kind === "pending" || undefined}
      className="lk-hero-bg flex flex-col gap-4 rounded-lk-xl px-6 py-10 text-white md:px-10"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-lk-h2 font-bold text-wide outline-none md:text-lk-h2-lg"
      >
        {done ? t.doneTitle : state.kind === "held" ? t.heldTitle : t.pendingTitle}
      </h2>
      <p className="text-lk-body text-white/85">
        {state.kind === "done"
          ? state.contactFrom
            ? t.doneLater(state.planName, state.contactFrom)
            : t.doneNow(state.planName)
          : state.kind === "held"
            ? t.heldText
            : state.kind === "slow"
              ? t.slowText
              : t.pendingText}
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        {state.kind === "slow" ? (
          <Button asChild variant="inverse">
            <Link href={reloadHref}>{t.reload}</Link>
          </Button>
        ) : null}
        {state.kind !== "pending" ? (
          <Button asChild variant={done ? "inverse" : "outline-inverse"}>
            <Link href={backHref}>{t.back}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
