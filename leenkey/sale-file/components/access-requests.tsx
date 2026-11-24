"use client";

import { useState } from "react";
import {
  FinancingBadge,
  FinancingMention,
  type FinancingStatus,
} from "@/components/shared/financing-badge";
import { InlineAlert } from "@/components/shared/inline-alert";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { cn } from "@/lib/utils";
import { RequestButtons } from "./seller-controls";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.seller;

type Request = { id: string; firstName: string | null; financingStatus: FinancingStatus };
type Answered = { id: string; firstName: string | null; text: string };

/**
 * « Demandes d'accès »: the requests of buyers that wait for an answer, and
 * those answered since the tab was opened, each with what came of it
 * (« 1 document partagé. », « Demande refusée. »). An answered request
 * leaves the list the server reads: its confirmation is kept here, so that
 * it does not vanish with the card it was said in when the tab reads itself
 * again.
 */
export function AccessRequests({
  propertyId,
  requests,
  cardClassName,
  titleClassName,
}: {
  propertyId: string;
  /** The requests that wait, as the server reads them. */
  requests: readonly Request[];
  cardClassName: string;
  titleClassName: string;
}) {
  const [answered, setAnswered] = useState<Answered[]>([]);
  const waiting = requests.filter((request) => !answered.some((item) => item.id === request.id));
  if (waiting.length === 0 && answered.length === 0) return null;
  return (
    <section aria-labelledby="file-requests" className="flex flex-col gap-3">
      <h3 id="file-requests" className={titleClassName}>
        {t.requests.title}
      </h3>
      <ul className="flex flex-col gap-3">
        {answered.map((request) => (
          <li key={request.id} className={cn(cardClassName, "flex flex-col gap-3")}>
            <p className="text-lk-body font-semibold text-lk-ink">
              {t.requests.asks(request.firstName)}
            </p>
            <InlineAlert tone="success">{request.text}</InlineAlert>
          </li>
        ))}
        {waiting.map((request) => (
          <li key={request.id} className={cn(cardClassName, "flex flex-col gap-3")}>
            <div className="flex flex-col gap-1">
              <p className="text-lk-body font-semibold text-lk-ink">
                {t.requests.asks(request.firstName)}
              </p>
              <FinancingBadge status={request.financingStatus} className="self-start" />
              <p className="text-lk-caption text-lk-ink-3">{t.requests.grantHelp}</p>
            </div>
            <RequestButtons
              propertyId={propertyId}
              requestId={request.id}
              name={request.firstName ?? t.share.someone}
              onAnswered={(text) =>
                setAnswered((before) => [
                  ...before,
                  { id: request.id, firstName: request.firstName, text },
                ])
              }
            />
          </li>
        ))}
      </ul>
      {waiting.length > 0 ? <FinancingMention /> : null}
    </section>
  );
}
