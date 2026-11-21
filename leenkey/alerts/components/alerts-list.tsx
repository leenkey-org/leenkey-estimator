"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { Switch } from "@/components/shared/switch";
import { frAlerts } from "@/lib/i18n/sections/alerts";
import { ALERT_NAME_MAX } from "@/lib/validations/alert";
import { deleteAlert, renameAlert, setAlertActive } from "../actions";
import type { Alert } from "../queries";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { alerts: frAlerts } as const;

const t = fr.alerts.page;

type Asked = { kind: "rename" | "delete"; alert: Alert };
type ErrorCode = keyof typeof t.errors;

const errorText = (code: ErrorCode | undefined) => {
  const text = t.errors[code ?? "unavailable"];
  return typeof text === "function" ? text(ALERT_NAME_MAX) : text;
};

/**
 * The alerts of a buyer (L3-06, SPEC-V2 16, docs/DESIGN.md 12 « lignes
 * d'alerte avec interrupteur »): the name, the criteria, the way to the
 * search, the switch that pauses it, its new name and its deletion, each
 * confirmed in a dialog.
 */
export function AlertsList({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  // The switch answers at once; the page then reads the alerts again.
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [asked, setAsked] = useState<Asked | null>(null);
  const [name, setName] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, start] = useTransition();
  // The alert whose switch is being saved: it waits for the answer.
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = (alert: Alert, next: boolean) => {
    setError(null);
    setActive((current) => ({ ...current, [alert.id]: next }));
    setSaving(alert.id);
    start(async () => {
      const result = await setAlertActive({ id: alert.id, active: next }).catch(() => null);
      setSaving(null);
      if (!result?.ok) {
        setActive((current) => ({ ...current, [alert.id]: !next }));
        setError(errorText(result?.error));
        return;
      }
      router.refresh();
    });
  };

  const confirm = () => {
    if (!asked) return;
    setDialogError(null);
    start(async () => {
      const result = await (
        asked.kind === "rename"
          ? renameAlert({ id: asked.alert.id, name })
          : deleteAlert(asked.alert.id)
      ).catch(() => null);
      if (!result?.ok) return setDialogError(errorText(result?.error));
      setAsked(null);
      router.refresh();
    });
  };

  return (
    <>
      <div aria-live="polite">
        {error ? (
          <InlineAlert tone="danger" live={false} className="mb-4">
            {error}
          </InlineAlert>
        ) : null}
      </div>
      <ul aria-label={t.list} className="flex flex-col gap-3">
        {alerts.map((alert) => {
          const on = active[alert.id] ?? alert.active;
          return (
            <li
              key={alert.id}
              className="flex flex-col gap-3 rounded-lk-xl border border-lk-line bg-lk-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="text-lk-body font-semibold break-words text-lk-ink">
                    {alert.name}
                  </h2>
                  <p className="text-lk-caption text-lk-ink-3">{on ? t.on : t.off}</p>
                </div>
                <Switch
                  checked={on}
                  // Its name is the alert it switches; « Active » or « En pause » beside.
                  aria-label={alert.name}
                  disabled={saving === alert.id}
                  onCheckedChange={(next) => toggle(alert, next)}
                  className="mt-0.5"
                />
              </div>
              {alert.summary.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {alert.summary.map((part) => (
                    <li
                      key={part}
                      className="rounded-full bg-lk-stone-2 px-2.5 py-1 text-lk-caption text-lk-ink-2"
                    >
                      {part}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-lk-caption text-lk-ink-3">{t.criteriaUnknown}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {alert.criteria ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={alert.href} aria-label={t.seeAbout(alert.name)}>
                      {t.see}
                    </Link>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-haspopup="dialog"
                  aria-label={t.renameAbout(alert.name)}
                  onClick={() => {
                    setName(alert.name);
                    setDialogError(null);
                    setAsked({ kind: "rename", alert });
                  }}
                >
                  {t.rename}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  muted
                  aria-haspopup="dialog"
                  aria-label={t.deleteAbout(alert.name)}
                  onClick={() => {
                    setDialogError(null);
                    setAsked({ kind: "delete", alert });
                  }}
                >
                  {t.delete}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={asked !== null}
        title={asked?.kind === "delete" ? t.deleteTitle : t.renameTitle}
        description={
          asked?.kind === "delete" ? t.deleteDescription(asked.alert.name) : t.renameDescription
        }
        confirmLabel={asked?.kind === "delete" ? t.deleteConfirm : t.renameConfirm}
        confirmVariant={asked?.kind === "delete" ? "danger" : "primary"}
        labels={fr.alerts.dialog}
        working={working}
        error={dialogError}
        onConfirm={confirm}
        onClose={() => setAsked(null)}
      >
        {asked?.kind === "rename" ? (
          <Input
            label={fr.alerts.create.name}
            name="name"
            value={name}
            maxLength={ALERT_NAME_MAX}
            required
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        ) : null}
      </ConfirmDialog>
    </>
  );
}
