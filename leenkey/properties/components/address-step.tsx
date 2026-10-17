"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { MapPin } from "lucide-react";
import { Button } from "@/components/shared/button";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { saveAddress, suggestAddresses, type AddressSuggestion } from "../actions";
import { CREATION_FORM_ID, intentOf, submitWithEnter } from "./creation-header";

const t = fr.properties.address;
const common = fr.properties.creation;

// Step 1 of the creation (SPEC-V2 section 8.3): the address, typed then
// chosen among the suggestions of the national address base (combobox,
// docs/DESIGN.md 13.1 « Création du bien, étapes 1, 3, 4 »: list of radius 6,
// shadow-float). Saved with « Continuer » or « Enregistrer ».

type Search =
  | { state: "idle" }
  | { state: "searching" }
  | { state: "done"; suggestions: AddressSuggestion[] }
  | { state: "error" };

export function AddressStep({
  propertyId,
  initial,
}: {
  /** Absent for a new property. */
  propertyId?: string;
  /** Label of the address already saved. */
  initial?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const helpId = useId();
  const field = useRef<HTMLInputElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<string | null>(initial ?? null);
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const request = useRef(0);
  // A second click before the first answer would create a second property.
  const submitting = useRef(false);

  // Suggestions 250 ms after the last key; an answer older than the last
  // request is dropped.
  useEffect(() => {
    // A new request, or none: an answer still on its way is dropped either way.
    const id = ++request.current;
    if (chosen !== null || text.trim().length < 3) return;
    const timer = window.setTimeout(async () => {
      setSearch({ state: "searching" });
      let result: Awaited<ReturnType<typeof suggestAddresses>> | null = null;
      try {
        result = await suggestAddresses(text);
      } catch {
        // Network, or a new deployment: said as unavailable.
      }
      if (id !== request.current) return;
      if (result?.ok || result?.error === "invalid") {
        // invalid: punctuation only, nothing to search.
        setSearch({ state: "done", suggestions: result.ok ? result.data : [] });
        setOpen(true);
        setActive(-1);
      } else {
        setSearch(result?.error === "auth" ? { state: "idle" } : { state: "error" });
        if (result?.error === "auth") setError(common.signedOut);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text, chosen]);

  const suggestions = search.state === "done" ? search.suggestions : [];

  const listOpen = open && suggestions.length > 0;

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function choose(suggestion: AddressSuggestion) {
    // The card replaces the field: the focus goes to « Continuer », the next
    // action, and the live region says the address chosen.
    flushSync(() => {
      setChosen(suggestion.label);
      close();
      setError(null);
    });
    next.current?.focus();
  }

  function change() {
    flushSync(() => {
      setChosen(null);
      setText("");
      setSearch({ state: "idle" });
    });
    field.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && listOpen && suggestions[active]) {
      // Chooses the address instead of sending the form.
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === "Escape" && listOpen) {
      event.preventDefault();
      close();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const intent = intentOf(event);
    if (!chosen) {
      setError(t.required);
      field.current?.focus();
      return;
    }
    setError(null);
    submitting.current = true;
    startSaving(async () => {
      let result: Awaited<ReturnType<typeof saveAddress>> | null = null;
      try {
        result = await saveAddress({ propertyId, label: chosen });
      } catch (caught) {
        console.error("[properties] address save failed", caught);
      }
      if (!result?.ok) {
        submitting.current = false;
        setError(
          !result
            ? common.error
            : result.error === "auth"
              ? common.signedOut
              : result.error === "not_found"
                ? common.notFound
                : result.error === "address_not_found"
                  ? t.notFound
                  : common.error,
        );
        return;
      }
      const target =
        intent === "save" ? "/vendeur" : `/vendeur/biens/${result.data.id}/caracteristiques`;
      // From « nouveau »: back would open the empty form again, for a second property.
      if (propertyId) router.push(target);
      else router.replace(target);
    });
  }

  const status =
    chosen !== null
      ? t.chosenStatus(chosen)
      : search.state === "searching"
        ? t.searching
        : search.state === "error"
          ? t.unavailable
          : search.state === "done"
            ? suggestions.length > 0
              ? t.count(suggestions.length)
              : t.noResult
            : "";

  return (
    <form
      id={CREATION_FORM_ID}
      onSubmit={submit}
      onKeyDown={(event) => submitWithEnter(event, event.currentTarget, next.current)}
      noValidate
      className="flex flex-1 flex-col"
    >
      <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.title}</h2>
      <p className="mt-2 text-lk-compact text-lk-ink-3">{t.lead}</p>

      <div className="mt-6">
        {chosen !== null ? (
          <div className="flex items-start gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4">
            <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-lk-blue" />
            <div className="min-w-0 flex-1">
              <p className="text-lk-caption text-lk-ink-3">{t.chosen}</p>
              <p className="text-lk-compact font-semibold text-lk-ink">{chosen}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={change}>
              {t.change}
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              ref={field}
              label={t.label}
              aria-describedby={helpId}
              placeholder={t.placeholder}
              value={text}
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={listOpen}
              aria-controls={listId}
              aria-activedescendant={
                listOpen && suggestions[active] ? `${listId}-${active}` : undefined
              }
              error={error ?? undefined}
              onChange={(event) => {
                setText(event.target.value);
                setError(null);
                setActive(-1);
                if (event.target.value.trim().length < 3) {
                  setSearch({ state: "idle" });
                  setOpen(false);
                }
              }}
              onKeyDown={onKeyDown}
              onBlur={close}
              onFocus={() => setOpen(suggestions.length > 0)}
            />
            <ul
              id={listId}
              role="listbox"
              aria-label={t.suggestions}
              hidden={!listOpen}
              className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface shadow-float"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${index}-${suggestion.label}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Keeps the focus in the field: the blur would close the list first.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(suggestion)}
                  className={cn(
                    "flex cursor-pointer flex-col px-4 py-3 text-left",
                    index === active ? "bg-lk-blue-tint" : "hover:bg-lk-stone-2",
                  )}
                >
                  <span className="text-lk-compact font-semibold text-lk-ink">
                    {suggestion.line}
                  </span>
                  <span className="text-lk-caption text-lk-ink-3">
                    {suggestion.postalCode} {suggestion.city}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {chosen === null ? (
          <p id={helpId} className="mt-1.5 text-lk-caption text-lk-ink-3">
            {search.state === "error" || (search.state === "done" && suggestions.length === 0)
              ? status
              : t.help}
          </p>
        ) : null}
        {/* Always in the page: a live region added with its text is not read. */}
        <p role="status" className="sr-only">
          {status}
        </p>
        {chosen !== null && error ? (
          <InlineAlert tone="danger" className="mt-3">
            {error}
          </InlineAlert>
        ) : null}
      </div>

      <FormActionBar>
        <Button ref={next} type="submit" name="intent" value="next" loading={saving}>
          {common.next}
        </Button>
      </FormActionBar>
    </form>
  );
}
