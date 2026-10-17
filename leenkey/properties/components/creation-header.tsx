import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/shared/button";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { ProgressBar } from "@/components/shared/progress-bar";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.properties.creation;

/** The form of the current step: the buttons of the header submit it. */
export const CREATION_FORM_ID = "bien-etape";

const STEPS = ["address", "characteristics", "price", "preview"] as const;
export type CreationStepName = (typeof STEPS)[number];

/**
 * Header of the creation of a property (docs/DESIGN.md 12.2): back, « Mon
 * bien », « Enregistrer » (saves the step and goes back to « Ma vente »),
 * « Étape 2 sur 4 · Caractéristiques ». `back`: a page to go back to, with
 * its name, or the previous step, saved first (the form, with the intent).
 */
export function CreationHeader({
  step,
  back,
  save = true,
}: {
  step: CreationStepName;
  back: { href: string; label: string } | "previous";
  /** false on a step without a form. */
  save?: boolean;
}) {
  const index = STEPS.indexOf(step) + 1;
  const backClass = cn(
    iconButtonVariants({ variant: "stone" }),
    "inline-flex items-center justify-center",
  );
  return (
    <AppHeader
      title={t.title}
      back={
        back === "previous" ? (
          <button
            type="submit"
            form={CREATION_FORM_ID}
            name="intent"
            value="previous"
            aria-label={t.previousStep}
            className={backClass}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        ) : (
          <Link href={back.href} aria-label={back.label} className={backClass}>
            <ChevronLeft aria-hidden="true" />
          </Link>
        )
      }
      action={
        save ? (
          <Button
            type="submit"
            form={CREATION_FORM_ID}
            name="intent"
            value="save"
            variant="ghost"
            size="sm"
          >
            {t.save}
          </Button>
        ) : undefined
      }
      progress={<ProgressBar label={t.step(index, t.steps[step])} value={index * 25} />}
    />
  );
}

/** Intent of a submit of the step: the button that sent it. */
export type StepIntent = "save" | "previous" | "next";

/**
 * Enter in a field of the step means « Continuer ». Without this, the browser
 * would use the first submit button of the form in the page, which is in the
 * header (« Étape précédente » or « Enregistrer »). A field that handles
 * Enter itself (a list of suggestions) prevents the default first.
 */
export function submitWithEnter(
  event: { key: string; target: EventTarget; defaultPrevented: boolean; preventDefault(): void },
  form: HTMLFormElement,
  next: HTMLButtonElement | null,
) {
  if (event.key !== "Enter" || event.defaultPrevented) return;
  if (!(event.target instanceof HTMLInputElement)) return;
  event.preventDefault();
  form.requestSubmit(next ?? undefined);
}

export function intentOf(event: { nativeEvent: Event }): StepIntent {
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  const value = submitter instanceof HTMLButtonElement ? submitter.value : "";
  return value === "save" || value === "previous" ? value : "next";
}
