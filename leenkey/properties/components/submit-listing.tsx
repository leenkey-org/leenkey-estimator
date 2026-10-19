"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InlineAlert } from "@/components/shared/inline-alert";
import { fr } from "@/lib/i18n/fr";
import { submitListing, type SubmitListingResult } from "../listing-actions";

const t = fr.properties.preview;
const common = fr.properties.creation;

type Failure = Extract<SubmitListingResult, { ok: false }>["error"] | "network";

/** The message of a refusal, and the step that completes the listing. */
function failure(error: Failure, propertyId: string): { text: string; href: string | null } {
  const step = (name: string) => `/vendeur/biens/${propertyId}/${name}`;
  switch (error) {
    case "auth":
      return { text: common.signedOut, href: null };
    case "characteristics":
      return { text: t.errors.characteristics, href: step("caracteristiques") };
    case "listing":
      return { text: t.errors.listing, href: step("prix") };
    case "invalid":
    case "not_found":
      return { text: t.errors.notFound, href: "/vendeur" };
    default:
      return { text: t.errors.unavailable, href: null };
  }
}

/**
 * « Précédent » and « Envoyer en validation » under the preview (step 4,
 * SPEC-V2 8.3). Sent, the listing waits for the review of Leenkey (pending):
 * the end screen tells the seller what comes next.
 */
export function SubmitListing({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [sending, startSending] = useTransition();
  const [error, setError] = useState<{ text: string; href: string | null } | null>(null);
  // One sending at a time: a second click would only race the first.
  const submitting = useRef(false);

  function send() {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    startSending(async () => {
      let result: SubmitListingResult | null = null;
      try {
        result = await submitListing({ propertyId });
      } catch (caught) {
        console.error("[properties] listing submit failed", caught);
      }
      if (!result?.ok) {
        submitting.current = false;
        setError(failure(result ? result.error : "network", propertyId));
        return;
      }
      // In the transition: the button stays busy until the end screen shows.
      startSending(() => router.push(`/vendeur/biens/${propertyId}/envoye`));
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-lk-page flex-1 flex-col gap-4 px-5 pt-5 md:px-10 md:pb-16">
      {error ? (
        <InlineAlert
          tone="danger"
          className="md:max-w-lk-form md:self-end"
          action={
            error.href ? (
              <Link
                href={error.href}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {error.href === "/vendeur" ? common.leave : t.fix}
              </Link>
            ) : undefined
          }
        >
          {error.text}
        </InlineAlert>
      ) : null}
      <FormActionBar className="md:mt-2 md:w-full md:max-w-lk-form md:self-end">
        {sending ? (
          <Button variant="secondary" disabled>
            {common.previous}
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={`/vendeur/biens/${propertyId}/prix`}>{common.previous}</Link>
          </Button>
        )}
        <Button type="button" loading={sending} onClick={send}>
          {t.submit}
        </Button>
      </FormActionBar>
    </div>
  );
}
