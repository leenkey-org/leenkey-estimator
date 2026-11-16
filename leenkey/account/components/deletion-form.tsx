"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { frAccount } from "@/lib/i18n/sections/account";
import { closeAccount } from "../actions";
import { focusFirstInvalid } from "./focus";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { account: frAccount } as const;

const t = fr.account.deletion;

/** The password, the box ticked, then the deletion (L2-10). */
export function DeletionForm() {
  const [state, action, pending] = useActionState(closeAccount, null);
  const failed = state?.ok === false ? state : null;
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (failed) focusFirstInvalid(formRef.current);
  }, [failed]);
  const errors = failed?.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} noValidate className="mt-8 flex flex-col gap-4">
      <div aria-live="polite" className="empty:hidden">
        {failed ? <InlineAlert tone="danger">{failed.error}</InlineAlert> : null}
      </div>
      <Input
        name="password"
        type="password"
        label={t.password}
        autoComplete="current-password"
        error={errors.password}
        required
      />
      <Checkbox name="confirm" label={t.confirm} error={errors.confirm} required />
      <div>
        <Button
          type="submit"
          variant="danger"
          size="lg"
          loading={pending}
          className="mt-2 w-full md:w-auto"
        >
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
