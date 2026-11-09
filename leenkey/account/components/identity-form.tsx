"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";
import { updateIdentity } from "../actions";
import { focusFirstInvalid } from "./focus";

const t = fr.account.identity;

/** First name, last name, phone (L1-39); back to « Mon compte » once saved. */
export function IdentityForm({
  initial,
}: {
  initial: { firstName: string; lastName: string; phone: string };
}) {
  const [state, action, pending] = useActionState(updateIdentity, null);
  const failed = state?.ok === false ? state : null;
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (failed) focusFirstInvalid(formRef.current);
  }, [failed]);
  const errors = failed?.fieldErrors ?? {};
  const value = (key: keyof typeof initial) => failed?.values?.[key] ?? initial[key];
  return (
    <form ref={formRef} action={action} noValidate className="mt-6 flex flex-col gap-4">
      <div aria-live="polite" className="empty:hidden">
        {failed ? <InlineAlert tone="danger">{failed.error}</InlineAlert> : null}
      </div>
      <Input
        name="firstName"
        label={t.firstName}
        help={t.firstNameHint}
        autoComplete="given-name"
        maxLength={80}
        defaultValue={value("firstName")}
        error={errors.firstName}
        required
      />
      <Input
        name="lastName"
        label={t.lastName}
        autoComplete="family-name"
        maxLength={80}
        defaultValue={value("lastName")}
        error={errors.lastName}
        optional
      />
      <Input
        name="phone"
        type="tel"
        label={t.phone}
        placeholder={fr.auth.signup.phonePlaceholder}
        autoComplete="tel"
        maxLength={30}
        defaultValue={value("phone")}
        error={errors.phone}
        optional
      />
      <div>
        <Button type="submit" size="lg" loading={pending} className="mt-2 w-full md:w-auto">
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
