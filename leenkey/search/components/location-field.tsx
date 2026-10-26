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
 * in the filters panel); while typing, the commune alone. A pill on a phone;
 * from 1024 px the « Où ? » part of the rounded search bar, its name above
 * it (direction C, DECISIONS 2026-10-26).
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
      <div
        // The whole part of the bar takes the pointer to the field.
        onMouseDown={(event) => {
          // Anywhere but the field itself and the clear button.
          const target = event.target as HTMLElement;
          if (target !== inputRef.current && !target.closest("button")) {
            event.preventDefault();
            inputRef.current?.focus();
          }
        }}
        className={cn(
          "flex h-12 cursor-text items-center gap-2.5 rounded-full border-[1.5px] border-lk-line-strong bg-lk-surface pl-4 pr-1 shadow-lk-field",
          "transition duration-140 ease-out-lk",
          "has-[input:focus-visible]:border-lk-blue has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-lk-blue-line",
          // A part of the bar: no frame of its own, sand under the pointer.
          "lg:min-h-14 lg:h-auto lg:border-transparent lg:pl-5 lg:shadow-none lg:hover:bg-lk-sand",
          "lg:has-[input:focus-visible]:border-transparent lg:has-[input:focus-visible]:bg-lk-surface lg:has-[input:focus-visible]:shadow-lk-field lg:has-[input:focus-visible]:ring-0",
          "lg:has-[input:focus-visible]:outline-3 lg:has-[input:focus-visible]:outline-offset-2 lg:has-[input:focus-visible]:outline-lk-blue lg:has-[input:focus-visible]:outline-solid",
        )}
      >
        <Search aria-hidden="true" className="size-4.5 shrink-0 text-lk-ink-3 lg:hidden" />
        <div className="flex min-w-0 flex-1 flex-col justify-center lg:py-1.5">
          <label
            htmlFor={inputId}
            className="sr-only lg:not-sr-only lg:cursor-text lg:text-lk-caption lg:font-bold lg:text-lk-ink"
          >
            {/* « Où ? » shown from 1024 px, the full name read everywhere. */}
            <span className="hidden lg:inline">{`${fr.search.bar.where} `}</span>
            <span className="lg:sr-only">{t.label}</span>
          </label>
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
            className="h-full min-w-0 flex-1 bg-transparent text-lk-compact font-medium text-lk-ink outline-none placeholder:font-normal placeholder:text-lk-ink-3 lg:h-auto lg:flex-none text-ellipsis"
          />
        </div>
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
              "relative flex size-10 shrink-0 items-center justify-center rounded-full text-lk-ink-3",
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
        className="absolute inset-x-0 top-full z-40 mt-2.5 max-h-80 overflow-y-auto rounded-lk-xl border border-lk-line bg-lk-surface p-2 shadow-lk-block lg:right-auto lg:w-80"
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
              "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lk-lg px-3 py-2",
              // The option reached with the arrows: the ring of DESIGN.md 15, inside.
              index === active &&
                "bg-lk-sand outline-3 -outline-offset-3 outline-lk-blue outline-solid",
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
          className="absolute inset-x-0 top-full z-40 mt-2.5 rounded-lk-xl border border-lk-line bg-lk-surface px-4 py-3 text-lk-caption text-lk-ink-2 shadow-lk-block lg:right-auto lg:w-80"
        >
          {t.noSuggestion}
        </p>
      ) : null}
    </div>
  );
}
