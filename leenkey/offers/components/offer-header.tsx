import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { ProgressBar } from "@/components/shared/progress-bar";
import { OFFER_STEPS } from "@/lib/validations/offer";
import { frOffer } from "@/lib/i18n/sections/offer";
import { cn } from "@/lib/utils";
import type { OfferFormStep } from "../paths";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer;

/**
 * Header of the offer form (docs/DESIGN.md 13.3): back to the previous step
 * (to the listing from the first one), « Faire une offre », « Étape 3 sur 7 ·
 * Mon offre ». Each step is saved by its « Continuer »: going back saves
 * nothing.
 */
export function OfferHeader({
  step,
  back,
}: {
  step: OfferFormStep;
  back: { href: string; label: string };
}) {
  const label = step === "review" ? t.reviewStep : t.step(step, t.steps[OFFER_STEPS[step - 1]]);
  const value = step === "review" ? 100 : (step / OFFER_STEPS.length) * 100;
  return (
    <AppHeader
      title={t.header.title}
      back={
        <Link
          href={back.href}
          aria-label={back.label}
          className={cn(
            iconButtonVariants({ variant: "stone" }),
            "inline-flex items-center justify-center",
          )}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
      }
      progress={<ProgressBar label={label} value={value} />}
    />
  );
}
