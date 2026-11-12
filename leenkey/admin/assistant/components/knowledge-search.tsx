"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";
import type { KnowledgeCard } from "@/core/ai/knowledge";
import { frAdminAssistant } from "@/lib/i18n/sections/adminAssistant";
import { testKnowledgeSearch } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminAssistant: frAdminAssistant } as const;

const t = fr.adminAssistant.faq;

/**
 * « Recherche test » of /admin/assistant (L1-30d): a question as a seller or
 * a buyer would ask it, and the 5 cards the assistant would read, the
 * closest first. Nothing is logged nor counted: the model is not called.
 */
export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<"seller" | "buyer">("seller");
  const [results, setResults] = useState<KnowledgeCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [searching, start] = useTransition();
  const field = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 3) {
      flushSync(() => setInvalid(true));
      field.current?.focus();
      return;
    }
    start(async () => {
      setError(null);
      let result: Awaited<ReturnType<typeof testKnowledgeSearch>> | null = null;
      try {
        result = await testKnowledgeSearch({ query, audience });
      } catch {
        // Network lost: the message below.
      }
      if (result?.ok) {
        setResults(result.data);
      } else {
        setResults(null);
        setError(result?.error === "auth" ? t.errors.auth : t.errors.unavailable);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 md:flex-row md:items-end">
        <Input
          ref={field}
          label={t.search.query}
          value={query}
          maxLength={500}
          error={invalid ? t.search.invalid : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            if (invalid) setInvalid(false);
          }}
          compact
          containerClassName="flex-1"
        />
        <Select
          label={t.search.audience}
          value={audience}
          onChange={(event) => setAudience(event.target.value as "seller" | "buyer")}
          compact
          containerClassName="md:w-48"
        >
          <option value="seller">{t.search.audiences.seller}</option>
          <option value="buyer">{t.search.audiences.buyer}</option>
        </Select>
        <Button type="submit" variant="secondary" className="h-11" loading={searching}>
          {searching ? t.search.searching : t.search.submit}
        </Button>
      </form>
      <div aria-live="polite" className="flex flex-col gap-2">
        {error ? (
          <InlineAlert tone="danger" live={false}>
            {error}
          </InlineAlert>
        ) : null}
        {results && results.length === 0 ? (
          <p className="text-lk-secondary text-lk-ink-3">{t.search.none}</p>
        ) : null}
        {results && results.length > 0 ? (
          <ol aria-label={t.search.results} className="flex flex-col gap-2">
            {results.map((card) => (
              <li key={card.id} className="rounded-lk-sm border border-lk-line bg-lk-surface p-3">
                <p className="text-lk-label font-semibold text-lk-ink">{card.question}</p>
                <p className="text-lk-caption text-lk-ink-3">
                  {[card.category, t.search.score(card.similarity)].join(" · ")}
                </p>
                <p className="mt-1 line-clamp-3 text-lk-caption text-lk-ink-2">{card.answer}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
