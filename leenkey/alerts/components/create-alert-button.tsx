"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/shared/input";
import { loginPath } from "@/core/auth/next-path";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { useSearch } from "@/leenkey/search/components/search-context";
import { frAlerts } from "@/lib/i18n/sections/alerts";
import { cn } from "@/lib/utils";
import {
  ALERT_NAME_MAX,
  ALERTS_MAX,
  defaultAlertName,
  hasCriterion,
} from "@/lib/validations/alert";
import { searchHref } from "@/lib/validations/search";
import { createAlert } from "../actions";
import { alertSummary } from "../presentation";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { alerts: frAlerts } as const;

const t = fr.alerts.create;

const barClassName = cn(
  "relative flex size-12 shrink-0 items-center justify-center gap-2 rounded-full border border-lk-line-strong bg-lk-surface text-lk-ink shadow-lk-field",
  "transition-colors duration-140 ease-out-lk hover:bg-lk-sand",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
  // Beside « Filtres » (DESIGN.md 10.3): its label from 1 280 px, where the bar leaves it room.
  "lg:size-14 xl:w-auto xl:px-5 xl:text-lk-button-md xl:font-bold xl:whitespace-nowrap",
  "[&_svg]:size-5 lg:[&_svg]:size-4.5",
);

/**
 * « Créer une alerte » of the search page (L3-06, SPEC-V2 8.4 and 16): keeps
 * the criteria of the search shown under a name, proposed from them. A
 * visitor signs in first and comes back to the same search. Nothing without
 * a criterion: an alert on every listing is no alert. `bar`: beside
 * « Filtres », a round button on a phone; `button`: in the empty state.
 */
export function CreateAlertButton({
  signedIn,
  display,
}: {
  signedIn: boolean;
  display: "bar" | "button";
}) {
  const router = useRouter();
  const { query } = useSearch();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, start] = useTransition();

  if (!hasCriterion(query.filters)) return null;
  const summary = alertSummary(query.filters);
  const label = (
    <>
      <Bell aria-hidden="true" />
      <span className={display === "bar" ? "sr-only xl:not-sr-only" : undefined}>{t.button}</span>
    </>
  );

  if (!signedIn) {
    const href = loginPath(searchHref({ filters: query.filters, sort: query.sort }));
    return display === "bar" ? (
      <Link href={href} title={t.button} className={barClassName}>
        {label}
      </Link>
    ) : (
      <Button asChild variant="secondary">
        <Link href={href}>{label}</Link>
      </Button>
    );
  }

  const show = () => {
    setName(defaultAlertName(summary));
    setCreated(null);
    setError(null);
    setOpen(true);
  };
  const submit = () => {
    if (created) {
      router.push(ROUTES.buyerAlerts);
      return;
    }
    setError(null);
    start(async () => {
      const result = await createAlert({ name, criteria: query.filters }).catch(() => null);
      if (result?.ok) return setCreated(result.data.name);
      const code = result?.error ?? "unavailable";
      setError(code === "limit" ? t.errors.limit(ALERTS_MAX) : t.errors[code]);
    });
  };

  return (
    <>
      {display === "bar" ? (
        <button
          type="button"
          aria-haspopup="dialog"
          title={t.button}
          onClick={show}
          className={barClassName}
        >
          {label}
        </button>
      ) : (
        <Button type="button" variant="secondary" aria-haspopup="dialog" onClick={show}>
          {label}
        </Button>
      )}
      <ConfirmDialog
        open={open}
        title={created ? t.doneTitle : t.title}
        description={created ? t.done(created) : t.description}
        confirmLabel={created ? t.manage : t.confirm}
        labels={{
          ...fr.alerts.dialog,
          cancel: created ? fr.alerts.dialog.close : fr.alerts.dialog.cancel,
        }}
        working={working}
        error={error}
        onConfirm={submit}
        onClose={() => setOpen(false)}
      >
        {created ? null : (
          <>
            <p className="text-lk-secondary text-lk-ink-2">
              <span className="font-semibold text-lk-ink">{t.criteria} : </span>
              {summary.join(" · ")}
            </p>
            <Input
              label={t.name}
              name="name"
              value={name}
              maxLength={ALERT_NAME_MAX}
              required
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
