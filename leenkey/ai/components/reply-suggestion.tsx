"use client";

import { useRef } from "react";
import { Sparkles } from "lucide-react";
import { AssistantSuggestion } from "@/components/shared/assistant-suggestion";
import { Button } from "@/components/shared/button";
import { frAssistant } from "@/lib/i18n/sections/assistant";
import { suggestReplyAction } from "../actions";
import { SuggestionErrorText, useSuggestion } from "./use-suggestion";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { assistant: frAssistant } as const;

const t = fr.assistant.suggestion;

/** At the bottom of the thread, on its background, just above the field (DESIGN 12.9). */
const WRAPPER = "bg-lk-bg px-4 pt-1 pb-3";

/**
 * « Suggérer une réponse » (SPEC-V2 8.6, L1-29), for the seller, above the
 * field of the conversation while the last message is the buyer's (the
 * conversation renders it only then, keyed by that message: a newer one, or
 * the seller's own reply, puts an end to a suggestion written for the
 * previous one): the assistant writes a reply in an AssistantSuggestion.
 * « Utiliser » puts it in the field (never sends it), « Modifier » too, the
 * focus in the field; « Ignorer » closes it. The message sent from it says
 * so (ai_suggested).
 */
export function ReplySuggestion({
  conversationId,
  onUse,
  onEdit,
}: {
  conversationId: string;
  onUse: (text: string) => void;
  onEdit: (text: string) => void;
}) {
  const { suggestion, ask, reset } = useSuggestion();
  const button = useRef<HTMLButtonElement>(null);

  if (suggestion.state === "idle") {
    return (
      <div className={WRAPPER}>
        <Button
          ref={button}
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void ask(() => suggestReplyAction({ conversationId }))}
        >
          <Sparkles aria-hidden="true" />
          {t.suggestReply}
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
    <div className={WRAPPER}>
      <AssistantSuggestion
        title={t.replyTitle}
        state={suggestion.state}
        text={suggestion.state === "ready" ? suggestion.text : undefined}
        error={
          suggestion.state === "error" ? <SuggestionErrorText error={suggestion.error} /> : null
        }
        loadingLabel={t.writing}
        useLabel={t.use}
        editLabel={t.edit}
        dismissLabel={t.dismiss}
        // Above the field, which stays in view: a long reply scrolls inside.
        textClassName="max-h-32 overflow-y-auto"
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
    </div>
  );
}
