"use client";

import { useActionState } from "react";
import { signIn } from "@/core/auth/actions";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";
import { AuthLink } from "../_components/auth-shell";

const t = fr.auth.login;

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const errors = state?.ok === false ? (state.fieldErrors ?? {}) : {};
  const values = state?.ok === false ? (state.values ?? {}) : {};
  const signupHref = next ? `/inscription?next=${encodeURIComponent(next)}` : "/inscription";

  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <div aria-live="polite" className="empty:hidden">
        {state?.ok === false ? (
          <InlineAlert tone="danger">{state.error}</InlineAlert>
        ) : notice ? (
          <InlineAlert tone="info">{notice}</InlineAlert>
        ) : null}
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
