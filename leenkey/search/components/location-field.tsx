"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { useSearch } from "./search-context";
import { locationFromText, suggestCommunes, type CommuneOption } from "../location";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.search.location;

/**
 * « Ville ou code postal » (SPEC 8.4, docs/DESIGN.md 10.1 SearchInput): a
 * combobox that suggests the communes of the launch zone (Mapbox later,
 * DECISIONS proposal of L1-15). Choosing a commune applies the search at once;
 * Enter without a choice takes the best suggestion, a postal code or the typed
 * name. At rest the field reads « Savigny-sur-Orge · 5 km » (the radius is set
 * in the filters panel); while typing, the commune alone.
 */
export function LocationField({ className }: { className?: string }) {
  const { query, placeLabel, applyFilters } = useSearch();
  const { filters } = query;
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const radius = filters.location && filters.radiusKm ? filters.radiusKm : undefined;
  const atRest = (label: string | null) =>
    label ? (radius ? `${label} · ${t.radius(radius)}` : label) : "";

  const [text, setText] = useState(atRest(placeLabel));
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Label of a place just chosen, shown until the new results arrive.
  const chosenLabel = useRef<string | null>(null);

  // A new search (back button, chip, link, radius) shows its own place.
  useEffect(() => {
    chosenLabel.current = null;
    setEditing(false);
    setText(placeLabel ? (radius ? `${placeLabel} · ${t.radius(radius)}` : placeLabel) : "");
  }, [placeLabel, radius]);

  const suggestions = useMemo(() => suggestCommunes(editing ? text : ""), [editing, text]);
  const expanded = open && suggestions.length > 0;

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function apply(location: string | undefined, label: string) {
    close();
    setEditing(false);
    setText(location ? atRest(label) : "");
    if (location === filters.location) return;
    chosenLabel.current = label;
    applyFilters({
      ...filters,
      location,
      radiusKm: location ? filters.radiusKm : undefined,
    });
  }

  function choose(commune: CommuneOption) {
    apply(commune.slug, commune.name);
  }

  function submitText() {
    const location = locationFromText(text);
    if (!location) {
      apply(undefined, "");
      return;
    }
    const commune = suggestCommunes(text, 1)[0];
    apply(location, commune && commune.slug === location ? commune.name : text.trim());
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setActive((index) => (suggestions.length ? (index + 1) % suggestions.length : -1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setOpen(true);
        setActive((index) =>
          suggestions.length ? (index <= 0 ? suggestions.length - 1 : index - 1) : -1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (expanded && active >= 0) choose(suggestions[active]);
        else submitText();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          close();
        }
        break;
    }
  }

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={inputId} className="sr-only">
        {t.label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-lk-sm border-[1.5px] border-lk-field bg-lk-surface pl-3.5 pr-1 lg:h-11",
          "transition duration-140 ease-out-lk",
          "has-[input:focus-visible]:border-lk-blue has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-lk-blue-line",
        )}
      >
        <Search aria-hidden="true" className="size-4.5 shrink-0 text-lk-ink-3" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={t.placeholder}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setEditing(true);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setEditing(true);
            setOpen(true);
            // While typing, the commune alone, selected: typing replaces it.
            setText(chosenLabel.current ?? placeLabel ?? "");
            requestAnimationFrame(() => inputRef.current?.select());
          }}
          onBlur={() => {
            close();
            setEditing(false);
            setText(atRest(chosenLabel.current ?? placeLabel));
          }}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-lk-compact font-medium text-lk-ink outline-none placeholder:font-normal placeholder:text-lk-ink-3"
        />
        {filters.location ? (
          <button
            type="button"
            aria-label={t.clear}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              apply(undefined, "");
              inputRef.current?.focus();
            }}
            className={cn(
              "relative flex size-10 shrink-0 items-center justify-center rounded-lk-sm text-lk-ink-3",
              "transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2 hover:text-lk-ink",
              "after:absolute after:-inset-0.5",
            )}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <span className="w-2.5 shrink-0" />
        )}
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={t.suggestions}
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-lk-md border border-lk-line bg-lk-surface py-1 shadow-float"
      >
        {suggestions.map((commune, index) => (
          <li
            key={commune.slug}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(commune)}
            onMouseMove={() => setActive(index)}
            className={cn(
              "flex cursor-pointer items-baseline justify-between gap-3 px-3.5 py-2.5",
              index === active && "bg-lk-blue-tint",
            )}
          >
            <span className="text-lk-compact text-lk-ink">{commune.name}</span>
            <span className="text-lk-caption tabular text-lk-ink-3">
              {commune.postalCodes.join(", ")}
            </span>
          </li>
        ))}
      </ul>
      {open && editing && text.trim() && suggestions.length === 0 ? (
        <p
          role="status"
          className="absolute inset-x-0 top-full z-40 mt-1 rounded-lk-md border border-lk-line bg-lk-surface px-3.5 py-3 text-lk-caption text-lk-ink-2 shadow-float"
        >
          {t.noSuggestion}
        </p>
      ) : null}
    </div>
  );
}
