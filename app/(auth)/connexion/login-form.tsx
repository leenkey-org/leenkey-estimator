"use client";

import { useActionState, type ReactNode } from "react";
import { resendConfirmation, signIn } from "@/leenkey/auth/actions";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";
import { AuthLink } from "../_components/auth-shell";

const t = fr.auth.login;

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const [resent, resendAction, resending] = useActionState(resendConfirmation, null);
  const errors = state?.ok === false ? (state.fieldErrors ?? {}) : {};
  const values = state?.ok === false ? (state.values ?? {}) : {};
  const unconfirmed = state?.ok === false && state.unconfirmed === true;
  const signupHref = next ? `/inscription?next=${encodeURIComponent(next)}` : "/inscription";

  let alert: ReactNode = null;
  if (unconfirmed && resent?.ok) {
    alert = <InlineAlert tone="success">{fr.auth.signup.resent}</InlineAlert>;
  } else if (unconfirmed && resent?.ok === false) {
    alert = <InlineAlert tone="danger">{resent.error}</InlineAlert>;
  } else if (state?.ok === false) {
    alert = (
      <InlineAlert
        tone="danger"
        action={
          unconfirmed ? (
            // Same form, other action: the email typed above is resent a link.
            <button
              type="submit"
              formAction={resendAction}
              disabled={resending}
              className="rounded-lk-sm font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue disabled:opacity-60"
            >
              {fr.auth.signup.resend}
            </button>
          ) : undefined
        }
      >
        {state.error}
      </InlineAlert>
    );
  } else if (notice) {
    alert = <InlineAlert tone="info">{notice}</InlineAlert>;
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <div aria-live="polite" className="empty:hidden">
        {alert}
      </div>
      <input type="hidden" name="next" value={next ?? ""} />
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
      <Input
        name="password"
        type="password"
        label={fr.auth.password}
        autoComplete="current-password"
        error={errors.password}
        required
      />
      <p className="text-lk-compact">
        <AuthLink href="/mot-de-passe-oublie">{t.forgot}</AuthLink>
      </p>
      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {t.submit}
      </Button>
      <p className="text-center text-lk-compact text-lk-ink-2">
        {t.noAccount} <AuthLink href={signupHref}>{t.signup}</AuthLink>
      </p>
    </form>
  );
}
