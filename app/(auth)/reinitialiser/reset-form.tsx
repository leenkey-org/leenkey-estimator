"use client";

import { useActionState } from "react";
import { updatePassword } from "@/core/auth/actions";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";

const t = fr.auth.reset;

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  const errors = state?.ok === false ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <div aria-live="polite" className="empty:hidden">
        {state?.ok === false ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      </div>
      <Input
        name="password"
        type="password"
        label={t.password}
        placeholder={fr.auth.signup.passwordPlaceholder}
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        error={errors.password}
        required
      />
      <Input
        name="confirm"
        type="password"
        label={t.confirm}
        autoComplete="new-password"
        error={errors.confirm}
        required
      />
      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {t.submit}
      </Button>
    </form>
  );
}
