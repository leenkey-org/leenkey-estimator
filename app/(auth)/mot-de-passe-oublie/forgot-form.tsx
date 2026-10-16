"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/core/auth/actions";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";
import { AuthLink } from "../_components/auth-shell";

const t = fr.auth.forgot;

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.sentTitle}</h2>
        <p className="text-lk-body text-lk-ink-2">{t.sentText}</p>
        <p className="text-lk-compact">
          <AuthLink href="/connexion">{t.backToLogin}</AuthLink>
        </p>
      </div>
    );
  }

  const errors = state?.ok === false ? (state.fieldErrors ?? {}) : {};
  const values = state?.ok === false ? (state.values ?? {}) : {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <div aria-live="polite" className="empty:hidden">
        {state?.ok === false ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      </div>
      <Input
        name="email"
        type="email"
        label={fr.auth.email}
        placeholder={fr.auth.emailPlaceholder}
        autoComplete="email"
        inputMode="email"
        defaultValue={values.email}
        error={errors.email}
        required
      />
      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {t.submit}
      </Button>
      <p className="text-center text-lk-compact">
        <AuthLink href="/connexion">{t.backToLogin}</AuthLink>
      </p>
    </form>
  );
}
