"use client";

import { useActionState } from "react";
import { acceptTerms } from "@/core/auth/actions";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { InlineAlert } from "@/components/shared/inline-alert";
import { LEGAL_PATHS } from "@/lib/legal/versions";
import { fr } from "@/lib/i18n/fr";

const t = fr.auth.signup;

export function TermsForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(acceptTerms, null);
  const errors = state?.ok === false ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div aria-live="polite" className="empty:hidden">
        {state?.ok === false ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      </div>
      <input type="hidden" name="next" value={next ?? ""} />
      <Checkbox
        name="acceptTerms"
        error={errors.acceptTerms}
        label={
          <>
            {t.termsBefore}
            <a
              href={LEGAL_PATHS.cgu}
              target="_blank"
              rel="noopener"
              className="text-lk-blue underline underline-offset-2"
            >
              {t.termsCgu}
            </a>
            {t.termsMiddle}
            <a
              href={LEGAL_PATHS.privacy}
              target="_blank"
              rel="noopener"
              className="text-lk-blue underline underline-offset-2"
            >
              {t.termsPrivacy}
            </a>
            {t.termsAfter}
          </>
        }
      />
      <Button type="submit" size="lg" loading={pending} className="w-full">
        {fr.auth.terms.submit}
      </Button>
    </form>
  );
}
