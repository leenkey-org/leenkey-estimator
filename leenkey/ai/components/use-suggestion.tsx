"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { AssistantSuggestionState } from "@/components/shared/assistant-suggestion";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import type { SuggestionError, SuggestionResult } from "../types";

const t = fr.assistant;

// A suggestion of the assistant asked from a screen (L1-29): nothing, then
// the assistant writing, then its text or why there is none. One request at
// a time: an answer that comes after « Ignorer » or after a newer request is
// left out.

export type Suggestion =
  | { state: "idle" }
  | { state: Exclude<AssistantSuggestionState, "error">; text?: string }
  | { state: "error"; error: SuggestionError };

export function useSuggestion() {
  const [suggestion, setSuggestion] = useState<Suggestion>({ state: "idle" });
  const request = useRef(0);

  const ask = useCallback(async (call: () => Promise<SuggestionResult>) => {
    const id = ++request.current;
    setSuggestion({ state: "loading" });
    let result: SuggestionResult | null = null;
    try {
      result = await call();
    } catch (caught) {
      // Network lost, or a page older than the last deployment.
      console.error("[ai] suggestion failed", caught);
    }
    if (id !== request.current) return;
    setSuggestion(
      result?.ok
        ? { state: "ready", text: result.data.text }
        : { state: "error", error: result ? result.error : "unavailable" },
    );
  }, []);

  const reset = useCallback(() => {
    request.current += 1;
    setSuggestion({ state: "idle" });
  }, []);

  return { suggestion, ask, reset };
}

/** Why there is no suggestion, as the seller reads it. */
export function SuggestionErrorText({ error }: { error: SuggestionError }) {
  if (error === "quota") {
    return (
      <p>
        {t.errors.quota}{" "}
        <Link
          href={ROUTES.contact}
          className="font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
        >
          {t.errors.quotaAction}
        </Link>
      </p>
    );
  }
  const text =
    error === "nothing"
      ? t.suggestion.nothing
      : error === "refused"
        ? t.errors.refused
        : error === "auth"
          ? t.errors.auth
          : error === "conditions"
            ? t.errors.conditions
            : t.errors.unavailable;
  return <p>{text}</p>;
}
