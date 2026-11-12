"use client";

import { AssistantSuggestion } from "@/components/shared/assistant-suggestion";
import { frAssistant } from "@/lib/i18n/sections/assistant";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

const t = fr.assistant.suggestion;
const nothing = () => {};

/** AssistantSuggestion (L1-29) in its three states, for the /design catalogue. */
export function SuggestionDemo({ text }: { text: string }) {
  const common = {
    loadingLabel: t.writing,
    useLabel: t.use,
    editLabel: t.edit,
    dismissLabel: t.dismiss,
    onUse: nothing,
    onEdit: nothing,
    onDismiss: nothing,
    autoFocus: false,
  };
  return (
    <div className="flex max-w-97.5 flex-col gap-3">
      <AssistantSuggestion title={t.replyTitle} state="ready" text={text} {...common} />
      <AssistantSuggestion title={t.descriptionTitle} state="loading" {...common} />
      <AssistantSuggestion
        title={t.replyTitle}
        state="error"
        error={<p>{fr.assistant.errors.unavailable}</p>}
        {...common}
      />
    </div>
  );
}
