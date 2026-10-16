"use client";

import { useActionState, useEffect, useState } from "react";
import { resendConfirmation, signUp } from "@/core/auth/actions";
import { passwordStrength } from "@/core/auth/identity";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { RoleCards } from "@/components/shared/role-cards";
import { LEGAL_PATHS } from "@/lib/legal/versions";
import { fr } from "@/lib/i18n/fr";
import { AuthLink } from "../_components/auth-shell";

const t = fr.auth.signup;

const ROLE_OPTIONS = [
  { value: "seller", title: t.roleSeller, hint: t.roleSellerHint },
  { value: "buyer", title: t.roleBuyer, hint: t.roleBuyerHint },
] as const;

function legalLink(href: string, label: string) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="text-lk-blue underline underline-offset-2"
    >
      {label}
    </a>
  );
}

export function SignupForm({
  defaultRole,
  next,
}: {
  defaultRole: "seller" | "buyer";
  next?: string;
}) {
  const [state, action, pending] = useActionState(signUp, null);
  const [strength, setStrength] = useState<ReturnType<typeof passwordStrength>>(null);
  // The form is reset after each submission (React 19): the indicator follows.
  useEffect(() => setStrength(null), [state]);

  if (state?.ok) return <EmailSent email={state.data.email} />;

  const errors = state?.ok === false ? (state.fieldErrors ?? {}) : {};
  const values = state?.ok === false ? (state.values ?? {}) : {};
  const loginHref = next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion";

  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <div aria-live="polite">
        {state?.ok === false ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      </div>
      <input type="hidden" name="next" value={next ?? ""} />
      <RoleCards
        name="role"
        legend={t.roleLegend}
        options={ROLE_OPTIONS}
        defaultValue={values.role ?? defaultRole}
        error={errors.role}
        className="mb-1"
      />
      <Input
        name="fullName"
        label={t.fullName}
        placeholder={t.fullNamePlaceholder}
        autoComplete="name"
        defaultValue={values.fullName}
        error={errors.fullName}
        required
      />
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
        name="phone"
        type="tel"
        label={t.phone}
        optional
        placeholder={t.phonePlaceholder}
        autoComplete="tel"
        defaultValue={values.phone}
        error={errors.phone}
      />
      <Input
        name="password"
        type="password"
        label={fr.auth.password}
        placeholder={t.passwordPlaceholder}
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        help={strength ? t.strength[strength] : undefined}
        error={errors.password}
        onChange={(event) => setStrength(passwordStrength(event.currentTarget.value))}
        required
      />
      <Checkbox
        name="acceptTerms"
        defaultChecked={values.acceptTerms === "on"}
        error={errors.acceptTerms}
        containerClassName="mt-1"
        label={
          <>
            {t.termsBefore}
            {legalLink(LEGAL_PATHS.cgu, t.termsCgu)}
            {t.termsMiddle}
            {legalLink(LEGAL_PATHS.privacy, t.termsPrivacy)}
            {t.termsAfter}
          </>
        }
      />
      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        {t.submit}
      </Button>
      <p className="text-center text-lk-compact text-lk-ink-2">
        {t.hasAccount} <AuthLink href={loginHref}>{t.login}</AuthLink>
      </p>
    </form>
  );
}

function EmailSent({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, null);
  return (
    <div className="flex flex-col gap-4" role="status">
      <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.sentTitle}</h2>
      <p className="text-lk-body text-lk-ink-2">{t.sentText(email)}</p>
      <p className="text-lk-secondary text-lk-ink-3">{t.sentHint}</p>
      <form action={action}>
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="secondary" loading={pending}>
          {t.resend}
        </Button>
      </form>
      <div aria-live="polite">
        {state?.ok ? <InlineAlert tone="success">{t.resent}</InlineAlert> : null}
        {state?.ok === false ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      </div>
    </div>
  );
}
