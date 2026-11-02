"use client";

import { useRef } from "react";
import { Sparkles } from "lucide-react";
import { AssistantSuggestion } from "@/components/shared/assistant-suggestion";
import { Button } from "@/components/shared/button";
import { fr } from "@/lib/i18n/fr";
import { draftDescriptionAction } from "../actions";
import { SuggestionErrorText, useSuggestion } from "./use-suggestion";

const t = fr.assistant.suggestion;

/**
 * « Rédiger avec l'assistant » (SPEC-V2 8.3, L1-29), under the description of
 * the price step: the assistant writes a description from the property and
 * what the seller already wrote in the field (`notes`), in an
 * AssistantSuggestion. « Utiliser » replaces the text of the field,
 * « Modifier » too, the focus in the field; nothing is saved before
 * « Enregistrer » or « Continuer ». « Ignorer » closes it.
 */
export function DescriptionSuggestion({
  propertyId,
  notes,
  onUse,
  onEdit,
}: {
  propertyId: string;
  /** What the field holds when the seller asks. */
  notes: string;
  onUse: (text: string) => void;
  onEdit: (text: string) => void;
}) {
  const { suggestion, ask, reset } = useSuggestion();
  const button = useRef<HTMLButtonElement>(null);

  if (suggestion.state === "idle") {
    return (
      <div>
        <Button
          ref={button}
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void ask(() => draftDescriptionAction({ propertyId, notes }))}
        >
          <Sparkles aria-hidden="true" />
          {t.draftDescription}
        </Button>
      </div>
    );
  }

  /** The box closes; the focus goes back to the button that asked for it. */
  const close = () => {
    reset();
    requestAnimationFrame(() => button.current?.focus());
  };
  return (
    <AssistantSuggestion
      title={t.descriptionTitle}
      state={suggestion.state}
      text={suggestion.state === "ready" ? suggestion.text : undefined}
      error={suggestion.state === "error" ? <SuggestionErrorText error={suggestion.error} /> : null}
      loadingLabel={t.writing}
      useLabel={t.use}
      editLabel={t.edit}
      dismissLabel={t.dismiss}
      onUse={(text) => {
        onUse(text);
        close();
      }}
      onEdit={(text) => {
        reset();
        onEdit(text);
      }}
      onDismiss={close}
    />
  );
}
