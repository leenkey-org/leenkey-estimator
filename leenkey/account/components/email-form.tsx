"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/shared/button";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { frAccount } from "@/lib/i18n/sections/account";
import { frAuth } from "@/lib/i18n/sections/auth";
import { changeEmail } from "../actions";
import { focusFirstInvalid } from "./focus";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { account: frAccount, auth: frAuth } as const;

const t = fr.account.email;

/**
 * A new address (L1-39): Supabase Auth sends a link to each of the two
 * addresses; the change is done once both are opened.
 */
export function EmailForm({ pending: waiting }: { pending: string | null }) {
  const [state, action, pending] = useActionState(changeEmail, null);
  const sentRef = useRef<HTMLDivElement>(null);
  const sent = state?.ok ? state.data : null;
  const failed = state?.ok === false ? state : null;
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);
  useEffect(() => {
    if (failed) focusFirstInvalid(formRef.current);
  }, [failed]);
  return (
    <form ref={formRef} action={action} noValidate className="mt-6 flex flex-col gap-4">
      <div aria-live="polite" className="empty:hidden">
        {failed ? <InlineAlert tone="danger">{failed.error}</InlineAlert> : null}
      </div>
      {sent ? (
        <div ref={sentRef} tabIndex={-1} className="outline-none">
          <InlineAlert tone="success" live={false}>
            <span className="[overflow-wrap:anywhere]">{t.sent(sent.current, sent.next)}</span>
          </InlineAlert>
        </div>
      ) : waiting ? (
        // The request before this one, until a new one replaces it.
        <InlineAlert tone="warning" live={false}>
          <span className="[overflow-wrap:anywhere]">{t.pending(waiting)}</span>
        </InlineAlert>
      ) : null}
      <Input
        name="email"
        type="email"
        label={t.field}
        placeholder={fr.auth.emailPlaceholder}
        autoComplete="email"
        maxLength={254}
        defaultValue={failed?.values?.email ?? ""}
        error={failed?.fieldErrors?.email}
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
