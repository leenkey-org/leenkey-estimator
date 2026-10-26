import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AddressStep } from "@/leenkey/properties/components/address-step";
import { CreationHeader } from "@/leenkey/properties/components/creation-header";
import { CreationBody } from "@/leenkey/properties/components/creation-page";
import { EstimationClaim } from "@/leenkey/properties/components/estimation-claim";
import { estimationStart } from "@/leenkey/properties/estimation";
import { formatDate } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.properties.creation;

export const metadata: Metadata = { title: t.metaTitle(t.steps.address) };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const estimationParam = z.string().uuid();
const addressParam = z.string().trim().min(3).max(200);

// L1-11, step 1 of 4: the address of a new property (SPEC-V2 section 8.3).
// The property is saved as a draft with « Continuer » or « Enregistrer ».
// L1-13b: ?estimation= starts it from an analysis of value of the seller,
// its address searched again and its characteristics taken over.
// ?adresse=: the address typed in the tab « Vendre » of the home page
// (DECISIONS 2026-10-26), searched at once in the same way.
export default async function NewPropertyPage({ searchParams }: Props) {
  const params = await searchParams;
  const parsed = estimationParam.safeParse(params.estimation);
  const typed = addressParam.safeParse(params.adresse);
  const estimationId = parsed.success ? parsed.data : null;
  const start = estimationId ? await estimationStart(estimationId) : null;
  if (start?.state === "resume") redirect(start.href);
  const fromEstimation = start?.state === "new" ? start : null;
  return (
    <>
      <CreationHeader step="address" back={{ href: "/vendeur", label: t.leave }} />
      <CreationBody>
        {estimationId && start?.state === "claim" ? (
          <EstimationClaim estimationId={estimationId} />
        ) : null}
        <AddressStep
          // Taken over once the analysis is attached: the field starts again.
          key={fromEstimation ? "estimation" : "new"}
          estimationId={fromEstimation && estimationId ? estimationId : undefined}
          initialText={
            fromEstimation?.address ?? (!estimationId && typed.success ? typed.data : undefined)
          }
          note={
            fromEstimation
              ? fr.properties.fromEstimation(formatDate(fromEstimation.madeAt))
              : undefined
          }
        />
      </CreationBody>
    </>
  );
}
