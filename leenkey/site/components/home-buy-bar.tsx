"use client";

import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Building2, Check, House, LandPlot, LayoutGrid, Search } from "lucide-react";
import { facadeScope } from "@/components/shared/facade-root";
import { suggestCommunes, locationFromText } from "@/leenkey/search/location";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { searchHref, type SearchFilters } from "@/lib/validations/search";

const t = fr.site.home.search.buy;

type BuyType = NonNullable<SearchFilters["type"]> | null;

const TYPES: ReadonlyArray<{ value: BuyType; label: string; icon: typeof House }> = [
  { value: null, label: fr.site.home.listings.category.all, icon: LayoutGrid },
  { value: "maison", label: fr.propertyType.maison, icon: House },
  { value: "appartement", label: fr.propertyType.appartement, icon: Building2 },
  { value: "terrain", label: fr.propertyType.terrain, icon: LandPlot },
];

/** Budgets offered, in euros: the usual steps of the launch zone. */
const BUDGETS = [200_000, 300_000, 400_000, 500_000, 700_000] as const;

const panelClassName = cn(
  facadeScope,
  // Opened out of the page: the charte of the home page (redesign D).
  "lk-d",
  "z-50 rounded-lk-xl border border-lk-line bg-lk-surface p-2 shadow-lk-block",
  "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none",
);
const optionClassName =
  "flex min-h-11 w-full items-center gap-3 rounded-lk-lg px-3 text-left text-lk-body text-lk-ink hover:bg-lk-sand focus-visible:bg-lk-sand focus-visible:outline-none";

/**
 * The segmented bar of the « Acheter » tab, from 768 px (docs/design-handoff/
 * SPECS.md 2): « Où ? | Type de bien | Budget max » in one pill, then
 * « Rechercher ». The place suggests the communes of the launch zone (a
 * combobox: arrows, Enter, Escape); the type and the budget open a small
 * panel each. The search page takes them
 * over (its own filters for the rest).
 */
export function BuySearchBar() {
  const router = useRouter();
  const id = useId();
  const [place, setPlace] = useState("");
  const [placeSlug, setPlaceSlug] = useState<string | undefined>(undefined);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [type, setType] = useState<BuyType>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const suggestions = useMemo(() => suggestCommunes(place, 6), [place]);
  const listId = `${id}-communes`;
  const expanded = placeOpen && suggestions.length > 0;

  function choose(commune: (typeof suggestions)[number]) {
    setPlace(commune.name);
    setPlaceSlug(commune.slug);
    setPlaceOpen(false);
    setActive(-1);
  }

  function onPlaceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setPlaceOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && expanded && active >= 0) {
      // The commune, not the search yet.
      event.preventDefault();
      const commune = suggestions[active];
      if (commune) choose(commune);
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setPlaceOpen(false);
      setActive(-1);
    }
  }

  function search() {
    const location = placeSlug ?? locationFromText(place);
    router.push(
      searchHref({
        filters: {
          ...(location ? { location } : {}),
          ...(type ? { type } : {}),
          ...(budget ? { priceMaxCents: budget * 100 } : {}),
        },
      }),
    );
  }

  const typeLabel = TYPES.find((option) => option.value === type && type !== null)?.label;
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        search();
      }}
      className="hidden items-center rounded-full border border-lk-line-strong bg-lk-surface py-1.5 pr-1.5 shadow-lk-field md:flex"
    >
      <Popover.Root open={expanded} onOpenChange={setPlaceOpen}>
        <Popover.Anchor asChild>
          <label
            htmlFor={`${id}-place`}
            className="min-w-0 flex-[1.3] cursor-text rounded-full px-7 py-2.5 hover:bg-lk-sand has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-lk-blue has-[input:focus-visible]:outline-solid"
          >
            <span className="block text-lk-label font-bold text-lk-ink">{t.where}</span>
            <input
              id={`${id}-place`}
              value={place}
              placeholder={t.wherePlaceholder}
              autoComplete="off"
              role="combobox"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
              onKeyDown={onPlaceKeyDown}
              onChange={(event) => {
                setPlace(event.target.value);
                setPlaceSlug(undefined);
                setPlaceOpen(true);
                setActive(-1);
              }}
              onFocus={() => setPlaceOpen(true)}
              className="block w-full bg-transparent text-lk-body text-lk-ink outline-none placeholder:text-lk-ink-3"
            />
          </label>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={10}
            onOpenAutoFocus={(event) => event.preventDefault()}
            className={cn(panelClassName, "w-80")}
          >
            <ul id={listId} role="listbox" aria-label={t.suggestions}>
              {suggestions.map((commune, index) => (
                <li
                  key={commune.slug}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Before the blur of the field, which would close the list.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(commune);
                  }}
                  className={cn(
                    optionClassName,
                    "cursor-pointer",
                    index === active && "bg-lk-blue-tint",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lk-lg bg-lk-blue-tint text-lk-blue"
                  >
                    <Search aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{commune.name}</span>
                    <span className="block text-lk-secondary text-lk-ink-3">
                      {commune.postalCodes.join(", ")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Divider />
      <Segment label={t.type} value={typeLabel} placeholder={t.typeAny}>
        {(close) => (
          <ul className="w-64">
            {TYPES.map(({ value, label, icon: Icon }) => (
              <li key={label}>
                <button
                  type="button"
                  aria-pressed={type === value}
                  className={optionClassName}
                  onClick={() => {
                    setType(value);
                    close();
                  }}
                >
                  <Icon aria-hidden="true" strokeWidth={1.8} className="size-5 text-lk-blue" />
                  <span className="flex-1">{label}</span>
                  {type === value ? (
                    <Check aria-hidden="true" className="size-4 text-lk-blue" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Segment>
      <Divider />
      <Segment
        label={t.budget}
        value={budget ? formatPrice(budget * 100) : undefined}
        placeholder={t.budgetAny}
      >
        {(close) => (
          <ul className="w-56">
            {[...BUDGETS, null].map((value) => (
              <li key={value ?? "none"}>
                <button
                  type="button"
                  aria-pressed={budget === value}
                  className={optionClassName}
                  onClick={() => {
                    setBudget(value);
                    close();
                  }}
                >
                  <span className="flex-1 tabular">
                    {value ? formatPrice(value * 100) : t.budgetNone}
                  </span>
                  {budget === value ? (
                    <Check aria-hidden="true" className="size-4 text-lk-blue" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Segment>
      <button
        type="submit"
        className={cn(
          "lk-gradient ml-1 flex h-13.5 shrink-0 items-center gap-2 rounded-full pr-6 pl-5 text-lk-title font-semibold text-white",
          "transition-[filter] duration-140 ease-out-lk hover:brightness-108",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue focus-visible:outline-solid",
        )}
      >
        <Search aria-hidden="true" strokeWidth={2.4} className="size-5" />
        {t.action}
      </button>
    </form>
  );
}

function Divider() {
  return <span aria-hidden="true" className="h-8.5 w-px shrink-0 bg-lk-line" />;
}

/** A segment of the bar: its label, its value or placeholder, its panel. */
function Segment({
  label,
  value,
  placeholder,
  children,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 rounded-full px-6 py-2.5 text-left hover:bg-lk-sand",
            "focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-lk-blue focus-visible:outline-solid",
          )}
        >
          <span className="block text-lk-label font-bold text-lk-ink">{label}</span>
          <span
            className={cn("block truncate text-lk-body", value ? "text-lk-ink" : "text-lk-ink-3")}
          >
            {value ?? placeholder}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={10} className={panelClassName}>
          {children(() => setOpen(false))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
