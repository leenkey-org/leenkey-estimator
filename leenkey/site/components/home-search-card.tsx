"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { ChartLine, House, MapPin, Search, Tag } from "lucide-react";
import { Button } from "@/components/shared/button";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { SEARCH_PATH } from "@/lib/validations/search";
import { BuySearchBar } from "./home-buy-bar";
import { valuationHref, type ValuationAddress } from "../valuation-entry";

const t = fr.site.home.search;

type Tab = "buy" | "sell" | "valuation";

const TABS: ReadonlyArray<{ value: Tab; icon: typeof House }> = [
  { value: "buy", icon: House },
  { value: "sell", icon: Tag },
  { value: "valuation", icon: ChartLine },
];

/**
 * The search card of the home page of direction C (docs/design-handoff/SPECS.md
 * 2, 3): set over the bottom of the photo, three tabs, « Valoriser mon bien »
 * open first. Valoriser: the address of the property, then the estimator with
 * it already chosen. Vendre: the address, then the creation of the listing
 * (the seller sign-up first when signed out). Acheter: the segmented bar, then
 * the search. Tabs of Radix (arrows between them, the panel after them).
 */
export function HomeSearchCard({ signedIn }: { signedIn: boolean }) {
  return (
    <Tabs.Root
      defaultValue="valuation"
      className="relative rounded-lk-3xl bg-lk-surface px-4 pt-1 pb-4.5 shadow-lk-search md:rounded-lk-3xl md:px-7 md:pt-2 md:pb-7"
    >
      <Tabs.List aria-label={t.label} className="flex border-b border-lk-line md:gap-2">
        {TABS.map(({ value, icon: Icon }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            // The whole label for assistive technologies, on a phone too.
            aria-label={t.tabs[value]}
            className={cn(
              "-mb-px flex min-h-16 flex-1 flex-col items-center justify-center gap-1 border-b-3 border-transparent px-1 pt-3 pb-2.5 text-lk-compact font-bold text-lk-ink-2",
              "md:flex-none md:flex-row md:gap-2.5 md:px-4.5 md:pt-4.5 md:pb-4 md:text-lk-body-lg",
              "transition-colors duration-140 ease-out-lk hover:text-lk-ink",
              "data-[state=active]:border-lk-blue data-[state=active]:text-lk-blue",
              "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-blue focus-visible:outline-solid",
            )}
          >
            <Icon aria-hidden="true" strokeWidth={1.8} className="size-5.5" />
            <span className="md:hidden">{t.tabsShort[value]}</span>
            <span className="hidden md:inline">{t.tabs[value]}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {/* Kept mounted: an address typed stays when another tab is chosen. Out of
          the tab order: Tab goes from the tabs to the field of the panel. */}
      <Tabs.Content
        value="valuation"
        forceMount
        tabIndex={-1}
        className="pt-4 data-[state=inactive]:hidden md:pt-5.5"
      >
        <AddressForm
          label={t.valuation.label}
          action={t.valuation.action}
          target={(chosen) => valuationHref(chosen)}
          suggest
        />
        <p className="mt-2.5 text-center text-lk-secondary text-lk-ink-2 md:hidden">
          <Points points={t.valuation.pointsShort} />
        </p>
        <p className="mt-1 ml-6 hidden text-lk-compact text-lk-ink-2 md:block">
          <Points points={t.valuation.points} />
        </p>
      </Tabs.Content>
      <Tabs.Content
        value="sell"
        forceMount
        tabIndex={-1}
        className="pt-4 data-[state=inactive]:hidden md:pt-5.5"
      >
        <AddressForm
          label={t.sell.label}
          action={t.sell.action}
          target={(_chosen, text) => sellHref(signedIn, text || null)}
        />
        <p className="mt-2.5 text-center text-lk-secondary text-lk-ink-2 md:mt-1 md:ml-6 md:text-left md:text-lk-compact">
          {t.sell.note}
        </p>
      </Tabs.Content>
      <Tabs.Content
        value="buy"
        forceMount
        tabIndex={-1}
        className="pt-4 data-[state=inactive]:hidden md:pt-5.5"
      >
        <BuySearchBar />
        {/* Below 768 px, one button: the search page has the filters. */}
        <Link
          href={SEARCH_PATH}
          className="flex min-h-15 items-center gap-3 rounded-full border border-lk-line-strong bg-lk-surface py-2 pr-2 pl-5 shadow-lk-field md:hidden"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-lk-body font-bold text-lk-ink">{t.buy.mobileTitle}</span>
            <span className="block text-lk-secondary text-lk-ink-3">{t.buy.mobileText}</span>
          </span>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lk-blue text-white">
            <Search aria-hidden="true" strokeWidth={2.4} className="size-5" />
          </span>
        </Link>
      </Tabs.Content>
    </Tabs.Root>
  );
}

/** « Gratuit · 2 minutes · … », the first one in blue. */
function Points({ points }: { points: readonly string[] }) {
  return points.map((point, index) => (
    <span key={point} className={cn(index === 0 && "font-bold text-lk-blue")}>
      {index > 0 ? (
        <>
          <span aria-hidden="true" className="mx-2 md:mx-4">
            ·
          </span>
          <span className="sr-only">, </span>
        </>
      ) : null}
      {point}
    </span>
  ));
}

/** The listing straight away, its address taken over; the seller sign-up first when signed out. */
function sellHref(signedIn: boolean, address: string | null): string {
  const creation = address
    ? `${ROUTES.newProperty}?adresse=${encodeURIComponent(address)}`
    : ROUTES.newProperty;
  return signedIn ? creation : `${ROUTES.sellerSignUp}&next=${encodeURIComponent(creation)}`;
}

/** Addresses of the national base, from the browser (the estimator asks the same one). */
async function fetchAddresses(text: string, signal: AbortSignal): Promise<ValuationAddress[]> {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(text)}&limit=5`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("features" in body)) return [];
  const features = (body as { features: unknown }).features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature: unknown) => {
    const properties =
      typeof feature === "object" && feature !== null && "properties" in feature
        ? (feature as { properties: Record<string, unknown> }).properties
        : null;
    const { label, postcode, city, context } = properties ?? {};
    if (typeof label !== "string" || typeof postcode !== "string" || typeof city !== "string") {
      return [];
    }
    const department = typeof context === "string" ? (context.split(",")[0]?.trim() ?? "") : "";
    return [{ label, postalCode: postcode, city, department }];
  });
}

/**
 * The address field in a pill and its action. With suggestions (the
 * estimator): those of the national address base while typing (a combobox:
 * arrows, Enter, Escape), and the address chosen sent on; a text typed among
 * suggestions not chosen asks for one, a text without any goes on without it.
 * Without suggestions (the listing): the text typed sent on.
 */
function AddressForm({
  label,
  action,
  target,
  suggest = false,
}: {
  label: string;
  action: string;
  target: (chosen: ValuationAddress | null, text: string) => string;
  suggest?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<ValuationAddress | null>(null);
  const [options, setOptions] = useState<ValuationAddress[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!suggest || chosen || text.trim().length < 3) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchAddresses(text.trim(), controller.signal)
        .then((found) => {
          setOptions(found);
          setActive(-1);
          setOpen(found.length > 0);
        })
        .catch(() => setOptions([]));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [suggest, text, chosen]);

  const expanded = open && options.length > 0;

  function choose(address: ValuationAddress) {
    setChosen(address);
    setNeedsChoice(false);
    setText(address.label);
    setOpen(false);
    setActive(-1);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (suggest && !chosen && options.length > 0) {
      // Back in the field, its suggestions open again under it.
      setNeedsChoice(true);
      input.current?.focus();
      return;
    }
    router.push(target(chosen, text.trim()));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!expanded) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current <= 0 ? options.length - 1 : current - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      const option = options[active];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:gap-3"
    >
      <div className="relative md:min-w-90 md:flex-1">
        <label
          htmlFor={inputId}
          className="flex h-14 items-center gap-2.5 rounded-full border border-lk-line-strong bg-lk-surface px-4.5 shadow-lk-field focus-within:border-lk-blue has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-lk-blue has-[input:focus-visible]:outline-solid md:h-16 md:gap-3 md:px-6"
        >
          <span className="sr-only">{label}</span>
          <MapPin
            aria-hidden="true"
            strokeWidth={1.8}
            className="size-5 shrink-0 text-lk-blue md:size-5.5"
          />
          <input
            ref={input}
            id={inputId}
            type="text"
            value={text}
            autoComplete="street-address"
            maxLength={200}
            placeholder={t.addressPlaceholder}
            role={suggest ? "combobox" : undefined}
            aria-expanded={suggest ? expanded : undefined}
            aria-controls={suggest ? listId : undefined}
            aria-autocomplete={suggest ? "list" : undefined}
            aria-activedescendant={
              suggest && expanded && active >= 0 ? `${listId}-${active}` : undefined
            }
            aria-invalid={needsChoice || undefined}
            aria-describedby={needsChoice ? hintId : undefined}
            onChange={(event) => {
              setText(event.target.value);
              setChosen(null);
              setNeedsChoice(false);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
              setOpen(options.length > 0);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 120);
            }}
            className="min-w-0 flex-1 bg-transparent text-lk-body-lg text-lk-ink outline-none placeholder:text-lk-ink-3"
          />
        </label>
        {suggest ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={t.suggestionsLabel}
            hidden={!expanded}
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-lk-xl border border-lk-line bg-lk-surface py-1.5 shadow-lk-block"
          >
            {options.map((option, index) => (
              <li
                key={option.label}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  // Before the blur of the field, which would close the list.
                  event.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  choose(option);
                }}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 px-5 text-lk-body text-lk-ink",
                  index === active ? "bg-lk-blue-tint" : "hover:bg-lk-sand",
                )}
              >
                <MapPin aria-hidden="true" className="size-4 shrink-0 text-lk-ink-3" />
                <span className="truncate">{option.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {suggest ? (
          <p
            id={hintId}
            aria-live="polite"
            className={cn(
              "px-5 text-lk-compact font-medium text-lk-danger",
              needsChoice ? "mt-2" : "sr-only",
            )}
          >
            {needsChoice ? t.valuation.choose : ""}
          </p>
        ) : null}
      </div>
      <Button type="submit" shape="pill" size="xl" className="md:h-16 md:px-7.5">
        {action}
      </Button>
    </form>
  );
}
