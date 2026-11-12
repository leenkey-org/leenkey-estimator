"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { InfoNote } from "@/components/shared/info-note";
import { claimFor, forgetClaim } from "@/leenkey/estimator/listing-link";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frProperties } from "@/lib/i18n/sections/properties";
import { claimEstimation } from "../estimation-actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { properties: frProperties } as const;

/**
 * An analysis of value made before the account (L1-13b): attached with the
 * token of this browser, then the page reads it again. Without the token
 * (another browser) or once used, the creation goes on without the answers.
 */
export function EstimationClaim({ estimationId }: { estimationId: string }) {
  const router = useRouter();
  // Once: a token works once (and React may run an effect twice).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = claimFor(estimationId);
    const withoutAnswers = () => router.replace(ROUTES.newProperty);
    if (!token) {
      withoutAnswers();
      return;
    }
    claimEstimation({ estimationId, token })
      .then((result) => {
        // Kept after a passing failure (signed out, database): it may serve again.
        if (result.ok || result.error === "used" || result.error === "invalid") forgetClaim();
        if (result.ok) router.refresh();
        else withoutAnswers();
      })
      .catch(withoutAnswers);
  }, [estimationId, router]);

  return (
    <InfoNote className="mb-5">
      <p role="status">{fr.properties.claimingEstimation}</p>
    </InfoNote>
  );
}
