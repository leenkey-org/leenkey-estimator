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
import { MapPin } from "lucide-react";
import { Button } from "@/components/shared/button";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { saveAddress, suggestAddresses, type AddressSuggestion } from "../actions";
import { CREATION_FORM_ID, intentOf } from "./creation-header";

const t = fr.properties.address;
const common = fr.properties.creation;

// Step 1 of the creation (SPEC-V2 section 8.3): the address, typed then
// chosen among the suggestions of the national address base (combobox,
// docs/DESIGN.md 12 « Création du bien, étapes 1, 3, 4 »: list of radius 6,
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
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<string | null>(initial ?? null);
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const request = useRef(0);

  // Suggestions 250 ms after the last key; an answer older than the last
  // request is dropped.
  useEffect(() => {
    if (chosen !== null || text.trim().length < 3) return;
    const id = ++request.current;
    const timer = window.setTimeout(async () => {
      setSearch({ state: "searching" });
      let result: Awaited<ReturnType<typeof suggestAddresses>> | null = null;
      try {
        result = await suggestAddresses(text);
      } catch {
        // Network, or a new deployment: said as unavailable.
      }
      if (id !== request.current) return;
      if (result?.ok) {
        setSearch({ state: "done", suggestions: result.data });
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

  function choose(suggestion: AddressSuggestion) {
    setChosen(suggestion.label);
    setOpen(false);
    setError(null);
  }

  function change() {
    setChosen(null);
    setText("");
    setSearch({ state: "idle" });
    // After the render that shows the field again.
    window.setTimeout(() => field.current?.focus(), 0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && open && active >= 0) {
      // Chooses the address instead of sending the form.
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const intent = intentOf(event);
    if (!chosen) {
      setError(t.required);
      field.current?.focus();
      return;
    }
    setError(null);
    startSaving(async () => {
      let result: Awaited<ReturnType<typeof saveAddress>> | null = null;
      try {
        result = await saveAddress({ propertyId, label: chosen });
      } catch (caught) {
        console.error("[properties] address save failed", caught);
      }
      if (!result?.ok) {
        setError(
          !result
            ? common.error
            : result.error === "auth"
              ? common.signedOut
              : result.error === "not_found"
                ? propertyId
                  ? common.notFound
                  : t.notFound
                : common.error,
        );
        return;
      }
      router.push(
        intent === "save" ? "/vendeur" : `/vendeur/biens/${result.data.id}/caracteristiques`,
      );
    });
  }

  const status =
    search.state === "searching"
      ? t.searching
      : search.state === "error"
        ? t.unavailable
        : search.state === "done"
          ? suggestions.length > 0
            ? t.count(suggestions.length)
            : t.noResult
          : "";

  return (
    <form id={CREATION_FORM_ID} onSubmit={submit} noValidate className="flex flex-col">
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
              aria-expanded={open && suggestions.length > 0}
              aria-controls={listId}
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              error={error ?? undefined}
              onChange={(event) => {
                setText(event.target.value);
                setError(null);
                if (event.target.value.trim().length < 3) {
                  setSearch({ state: "idle" });
                  setOpen(false);
                }
              }}
              onKeyDown={onKeyDown}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(suggestions.length > 0)}
            />
            <ul
              id={listId}
              role="listbox"
              aria-label={t.suggestions}
              hidden={!open || suggestions.length === 0}
              className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lk-md border border-lk-line bg-lk-surface shadow-float"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.label}
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
          <>
            <p id={helpId} className="mt-1.5 text-lk-caption text-lk-ink-3">
              {search.state === "error" || (search.state === "done" && suggestions.length === 0)
                ? status
                : t.help}
            </p>
            <p role="status" className="sr-only">
              {status}
            </p>
          </>
        ) : null}
        {chosen !== null && error ? (
          <InlineAlert tone="danger" className="mt-3">
            {error}
          </InlineAlert>
        ) : null}
      </div>

      <FormActionBar>
        <Button type="submit" name="intent" value="next" loading={saving}>
          {common.next}
        </Button>
      </FormActionBar>
    </form>
  );
}
