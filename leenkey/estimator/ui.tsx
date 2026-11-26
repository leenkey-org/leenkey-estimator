import { chipClassName } from "@/components/shared/chip-toggle";
import { cn } from "@/lib/utils";
import { createContext, useContext, useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, Check, type LucideIcon } from "lucide-react";
import type { ReactNode, InputHTMLAttributes } from "react";

// Building blocks of the steps of the wizard, in Façade since L1-44
// (docs/DESIGN.md 13.1): Sora, the tokens and the radii of DESIGN.md 2 and
// 5, the shapes of RoleCard, ChipToggle, SegmentedPicker and Field (10.1,
// 10.4), without the emoji of the V1 (DESIGN.md 1). Behaviour and texts are
// those of the V1.

/* ---------- Section header ---------- */
/**
 * The title of a step and its subtitle. Its name and its place (« Votre
 * bien », « Étape 1 sur 12 ») are said by the progress of the wizard, just
 * above: no label over the title (DESIGN.md 13.2, L1-44).
 */
export function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="space-y-3 fade-up">
      <h1 className="text-lk-h1 font-bold text-wide text-lk-ink lg:text-lk-h1-lg">{title}</h1>
      {subtitle && (
        <p className="max-w-2xl text-lk-body text-lk-ink-2 lg:text-lk-body-lg">{subtitle}</p>
      )}
    </header>
  );
}

/* ---------- Selectable cards ---------- */
// The shape of a choice card (design pass of 2026-11-26, DESIGN.md 13.1):
// white, a 2 px border so that nothing moves when it is chosen; hovered, the
// soft blue border and shadow of a ShortcutCard; chosen, the gradient outline
// of the charte (lk-gradient-border) and a check in the gradient.
const cardClassName = (selected: boolean) =>
  cn(
    "group relative flex w-full text-left",
    "transition-[border-color,box-shadow] duration-220 ease-out-lk",
    selected
      ? "lk-gradient-border shadow-lk-d-hover"
      : "border-2 border-lk-line bg-lk-surface hover:border-lk-indigo-line hover:shadow-lk-d-hover",
  );

/** The mark of a card: a circle (one choice) or a square (several), filled with the gradient and a check when chosen. */
function CardMark({ selected, shape }: { selected: boolean; shape: "round" | "square" }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center",
        shape === "round" ? "rounded-full" : "rounded-lk-xs",
        selected ? "lk-gradient" : "border-[1.5px] border-lk-field bg-lk-surface",
      )}
    >
      {selected && <Check aria-hidden="true" strokeWidth={3} className="size-3 text-white" />}
    </span>
  );
}

/* ---------- Selectable card (single) ---------- */
export function OptionCard({
  selected,
  onClick,
  title,
  description,
  compact,
  icon: Icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  compact?: boolean;
  /** Decorative: in a soft gradient tile before the title (the property types). */
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        cardClassName(selected),
        "items-start gap-3.5 rounded-lk-d-card p-4 md:p-5",
        (compact || Icon) && "items-center",
        compact && "rounded-lk-md md:p-4",
      )}
    >
      {Icon && (
        <span className="lk-gradient-soft flex size-11 shrink-0 items-center justify-center rounded-lk-lg md:size-12">
          <Icon
            aria-hidden="true"
            strokeWidth={1.9}
            className="lk-icon-gradient size-5.5 text-lk-blue md:size-6"
          />
        </span>
      )}
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block break-words text-lk-button-md leading-snug font-semibold text-lk-ink">
          {title}
        </span>
        {description && (
          <span className="block text-lk-secondary text-lk-ink-2">{description}</span>
        )}
      </span>
      <span className={cn(!compact && !Icon && "mt-0.5")}>
        <CardMark selected={selected} shape="round" />
      </span>
    </button>
  );
}

/* ---------- Toggle card (multi-select) ---------- */
export function ToggleCard({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        // The whole cell of its grid, even inside a wrapper (a button shrinks to its text).
        cardClassName(selected),
        "gap-3 rounded-lk-md px-4 py-3 text-lk-label font-medium text-lk-ink",
        desc ? "items-start" : "items-center",
      )}
    >
      <span className="min-w-0 flex-1">
        {title}
        {desc && (
          <span className="mt-0.5 block text-lk-caption font-normal text-lk-ink-2">{desc}</span>
        )}
      </span>
      <CardMark selected={selected} shape="square" />
    </button>
  );
}

/* ---------- Stepper (number row) ---------- */
export function Stepper({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (v: number) => void;
  options: (number | string)[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        // La valeur vient du libellé, pas de l'index : "8+" → 8, "RDC" → 0.
        // (avec l'index, "8+" en position 7 valait 7 et s'allumait avec le bouton "7")
        const parsed = typeof opt === "number" ? opt : Number.parseInt(opt, 10);
        const numeric = Number.isNaN(parsed) ? 0 : parsed;
        const active = value === numeric;
        return (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(numeric)}
            aria-pressed={active}
            className={cn(
              "h-11 min-w-13 rounded-lk-sm px-4 text-lk-button-md font-semibold",
              "transition-colors duration-140 ease-out-lk",
              active
                ? "lk-gradient text-white hover:brightness-108"
                : "bg-lk-stone-2 text-lk-ink-2 hover:bg-lk-stone",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Field ---------- */
/**
 * What a Field gives its control: the id that its label names, the id of its
 * error, and a way for a TextInput to say it is there. Without one, the
 * label names the group of buttons of the field (cards, chips, numbers).
 */
type FieldContextValue = { id: string; errorId?: string; markControl: () => void };
const FieldContext = createContext<FieldContextValue | undefined>(undefined);

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const labelId = useId();
  const errorId = useId();
  const [hasControl, setHasControl] = useState(false);
  const context = useMemo(
    () => ({ id, errorId: error ? errorId : undefined, markControl: () => setHasControl(true) }),
    [id, error, errorId],
  );
  return (
    <div className={cn("space-y-2 lk-field", error && "lk-field-error")}>
      <label
        id={labelId}
        htmlFor={hasControl ? id : undefined}
        className={cn(
          "flex items-baseline gap-1.5 text-lk-label font-medium transition-colors",
          error ? "text-lk-danger" : "text-lk-ink",
        )}
      >
        {label}
        {required && <span className={error ? "text-lk-danger" : "text-lk-blue"}>*</span>}
        {hint && <span className="text-lk-caption font-normal text-lk-ink-3">— {hint}</span>}
      </label>
      <div
        role={hasControl ? undefined : "group"}
        aria-labelledby={hasControl ? undefined : labelId}
        aria-describedby={!hasControl && error ? errorId : undefined}
        className="space-y-2"
      >
        <FieldContext.Provider value={context}>{children}</FieldContext.Provider>
      </div>
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-lk-caption text-lk-danger">
          <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Input ---------- */
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const field = useContext(FieldContext);
  const markControl = field?.markControl;
  useEffect(() => markControl?.(), [markControl]);
  return (
    <input
      id={field?.id}
      aria-invalid={field?.errorId ? true : undefined}
      aria-describedby={field?.errorId}
      {...props}
      className={cn(
        "h-12 w-full rounded-lk-sm border-[1.5px] border-lk-field bg-lk-surface px-3.5 text-lk-body text-lk-ink",
        "transition duration-140 ease-out-lk placeholder:text-lk-ink-3",
        "focus:border-lk-blue focus:outline-none focus:ring-3 focus:ring-lk-blue-line",
        props.className,
      )}
    />
  );
}

/* ---------- Section grouping for checkbox grids ---------- */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 text-lk-h3 font-semibold text-lk-ink first:mt-0 lg:text-lk-h3-lg">
      {children}
    </h3>
  );
}

/**
 * The pills of one or several choices: chips of DESIGN.md 10.1 (40 px, a
 * 44 px touch target), as plain buttons that keep the V1 behaviour.
 */
function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-state={active ? "on" : "off"}
      onClick={onClick}
      // A long label goes on two lines on a narrow screen: rounded corners
      // there rather than the pill of the chips (L1-54), which would be a capsule.
      className={cn(
        chipClassName(),
        "h-auto min-h-10 max-w-full rounded-lk-xl py-2 whitespace-normal",
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Pills : choix unique ---------- */
export function PillGroup({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Pill key={o} active={value === o} onClick={() => onChange(o)}>
          {o}
        </Pill>
      ))}
    </div>
  );
}

/* ---------- Pills : choix multiple ---------- */
export function PillMulti({
  values,
  onToggle,
  options,
}: {
  values: string[];
  onToggle: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Pill key={o} active={values.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </Pill>
      ))}
    </div>
  );
}
