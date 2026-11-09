"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validations/auth";
import { changePassword } from "../actions";

const t = fr.account.password;

/** The current password, then the new one twice (L1-39). */
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const failed = state?.ok === false ? state : null;
  const errors = failed?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="mt-6 flex flex-col gap-4">
      <div aria-live="polite" className="empty:hidden">
        {failed ? <InlineAlert tone="danger">{failed.error}</InlineAlert> : null}
      </div>
      <div className="flex flex-col gap-2">
        <Input
          name="current"
          type="password"
          label={t.current}
          autoComplete="current-password"
          error={errors.current}
          required
        />
        <Link
          href="/mot-de-passe-oublie"
          className="self-start rounded-lk-sm text-lk-secondary font-medium text-lk-blue underline-offset-2 hover:underline focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue"
        >
          {t.forgot}
        </Link>
      </div>
      <Input
        name="password"
        type="password"
        label={t.next}
        placeholder={fr.auth.signup.passwordPlaceholder}
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
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
      <InfoNote>
        <p>{t.note}</p>
      </InfoNote>
      <div>
        <Button type="submit" size="lg" loading={pending} className="mt-2 w-full md:w-auto">
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
