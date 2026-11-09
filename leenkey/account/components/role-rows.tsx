"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import type { AddableRole } from "@/lib/validations/account";
import { addRole } from "../actions";
import { AccountRowText, accountRowClass } from "./account-list";

const t = fr.account.roles;

const ROLES: {
  role: AddableRole;
  href: string;
  copy: { label: string; open: string; hint: string };
}[] = [
  { role: "seller", href: ROUTES.seller, copy: t.seller },
  { role: "buyer", href: ROUTES.buyer, copy: t.buyer },
];

/**
 * « Mes espaces » (SPEC-V2 8.14, DECISIONS Q41): « Je vends » and « J'achète »,
 * each a way to its space once held, else « Ajouter ». The rows of a list
 * section (AccountSection); the outcome under the list.
 */
export function RoleRows({ roles }: { roles: readonly string[] }) {
  const router = useRouter();
  const [held, setHeld] = useState<readonly string[]>(roles);
  const [outcome, setOutcome] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [adding, setAdding] = useState<AddableRole | null>(null);
  const [, startAdding] = useTransition();
  const outcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => setHeld(roles), [roles]);
  useEffect(() => {
    if (outcome) outcomeRef.current?.focus();
  }, [outcome]);

  const add = (role: AddableRole, label: string) => {
    setOutcome(null);
    setAdding(role);
    startAdding(async () => {
      const result = await addRole(role).catch(() => null);
      setAdding(null);
      if (!result?.ok) {
        setOutcome({ tone: "danger", text: result?.error ?? t.error });
        return;
      }
      setHeld(result.data.roles);
      setOutcome({ tone: "success", text: t.added(label) });
      router.refresh();
    });
  };

  return (
    <>
      {ROLES.map(({ role, href, copy }) =>
        held.includes(role) ? (
          <li key={role} className="border-t border-lk-line first:border-t-0">
            <Link href={href} className={accountRowClass}>
              <AccountRowText label={copy.label} value={copy.open} />
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-lk-ink-3" />
            </Link>
          </li>
        ) : (
          <li
            key={role}
            className="flex min-h-14 items-center gap-3 border-t border-lk-line px-4 py-3 first:border-t-0"
          >
            <AccountRowText label={copy.label} value={copy.hint} wrap />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={t.addLabel(copy.label)}
              loading={adding === role}
              disabled={adding !== null}
              onClick={() => add(role, copy.label)}
            >
              {t.add}
            </Button>
          </li>
        ),
      )}
      {outcome ? (
        <li className="border-t border-lk-line p-3">
          <div ref={outcomeRef} tabIndex={-1} className="outline-none">
            <InlineAlert tone={outcome.tone}>{outcome.text}</InlineAlert>
          </div>
        </li>
      ) : null}
    </>
  );
}
