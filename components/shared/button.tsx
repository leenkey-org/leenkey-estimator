import type { ComponentProps, ReactNode } from "react";
import { Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// docs/DESIGN.md 10.1. Extends components/ui/button.tsx: its own variants are
// switched off (null) and its base classes overridden below. In the charte D
// since L1-58 (docs/design-handoff-d/SPECS.md 2): every button is a pill, the
// primary one in the gradient of the charte.

/** The gradient of an action, white text (AA), a little brighter on hover. */
const GRADIENT = [
  "lk-gradient text-white",
  "transition-[color,filter,scale,translate,box-shadow]",
  "not-disabled:hover:brightness-108",
];

export const buttonVariants = cva(
  [
    "relative rounded-full font-semibold shadow-none",
    // Pressed, it gives a little (DESIGN.md 9), as the V1 buttons did.
    "transition-[color,background-color,border-color,scale] duration-140 ease-out-lk not-disabled:active:scale-[0.98]",
    "focus-visible:ring-0 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
    // Disabled: 0.45 opacity, "not allowed" cursor, no hover (not-disabled: below).
    "disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-45",
    // Loading is disabled too, but keeps its colours: the spinner says it is working.
    "aria-busy:cursor-progress aria-busy:opacity-100",
  ],
  {
    variants: {
      variant: {
        primary: GRADIENT,
        // The main call to action of a screen (SPECS.md 2, « Un seul par
        // écran »): the gradient in its violet shadow, rising a little on
        // hover (still with reduced motion).
        cta: [
          ...GRADIENT,
          "shadow-lk-cta",
          "not-disabled:hover:-translate-y-px not-disabled:hover:shadow-lk-cta-hover not-disabled:active:translate-y-0 motion-reduce:not-disabled:hover:translate-y-0",
        ],
        secondary:
          "border-[1.5px] border-lk-blue-line bg-lk-surface text-lk-blue not-disabled:hover:bg-lk-blue-tint not-disabled:active:bg-lk-blue-tint",
        // A secondary button outlined in the blue of the actions.
        "outline-blue":
          "border-[1.5px] border-lk-blue bg-lk-surface text-lk-blue not-disabled:hover:bg-lk-blue-tint not-disabled:active:bg-lk-blue-tint",
        "outline-ink":
          "border-[1.5px] border-lk-ink bg-lk-surface text-lk-ink not-disabled:hover:bg-lk-stone-2 not-disabled:active:bg-lk-stone-2",
        ghost:
          "bg-transparent text-lk-blue not-disabled:hover:bg-lk-blue-tint not-disabled:active:bg-lk-blue-tint",
        "on-dark":
          "bg-lk-ink text-white not-disabled:hover:bg-lk-navy not-disabled:active:bg-lk-navy",
        success:
          "bg-lk-success text-white not-disabled:hover:bg-lk-success-fg not-disabled:active:bg-lk-success-fg",
        danger:
          "border-[1.5px] border-lk-danger bg-lk-surface text-lk-danger not-disabled:hover:bg-lk-danger-bg not-disabled:active:bg-lk-danger-bg",
        // On a blue flat only: the focus ring turns white to stay visible.
        inverse:
          "bg-lk-surface text-lk-blue not-disabled:hover:bg-lk-blue-tint not-disabled:active:bg-lk-blue-tint focus-visible:outline-white",
        // The secondary button on the night (SPECS.md 2), of glass with a
        // white line.
        night:
          "border border-white/35 bg-lk-night/55 text-white not-disabled:hover:bg-white/10 not-disabled:active:bg-white/10",
        // White outline on a blue flat, beside an inverse button (hero of the
        // home page, DESIGN.md 13.1).
        "outline-inverse":
          "border-[1.5px] border-white bg-transparent text-white not-disabled:hover:bg-white/12 not-disabled:active:bg-white/12 focus-visible:outline-white",
      },
      size: {
        // The main call to action of a screen, 56 then 64 px.
        "2xl": "h-16 px-7.5 text-lk-body-lg",
        xl: "h-14 px-6 text-lk-body-lg",
        lg: "h-13 px-5 text-lk-button-lg",
        md: "h-11 px-4 text-lk-button-md",
        // 40 px high, 44 px touch target (DESIGN.md 15).
        sm: "h-10 px-3.5 text-lk-button-sm after:absolute after:inset-x-0 after:-inset-y-0.5",
      },
      muted: { true: "", false: "" },
      // pill: the bold label of a call to action (every button is rounded).
      shape: { default: "", pill: "font-bold" },
    },
    compoundVariants: [
      // The primary pill in its violet shadow (SPECS.md 1).
      { variant: "primary", shape: "pill", className: "shadow-lk-primary" },
      {
        variant: "ghost",
        muted: true,
        className:
          "text-lk-ink-3 not-disabled:hover:bg-lk-stone-2 not-disabled:active:bg-lk-stone-2",
      },
    ],
    defaultVariants: { variant: "primary", size: "md", muted: false, shape: "default" },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

export type ButtonProps = Omit<ComponentProps<"button">, "children"> & {
  variant?: NonNullable<ButtonVariants["variant"]>;
  size?: NonNullable<ButtonVariants["size"]>;
  /** Grey ghost button, for « Ignorer ». */
  muted?: boolean;
  /** pill: a bold label (and the shadow of a primary button), a call to action. */
  shape?: NonNullable<ButtonVariants["shape"]>;
  /** Lucide icon on the left, 16 px. */
  icon?: LucideIcon;
  /**
   * Lucide icon after the label, 16 px, moving forward on hover: the arrow of
   * the calls to action of the showcase pages (L1-49, L1-50).
   */
  trailingIcon?: LucideIcon;
  /** Keeps the label, shows a spinning Loader2 and disables the button. */
  loading?: boolean;
  /** Gives the button styles to its only child, a link. */
  asChild?: boolean;
  children: ReactNode;
};

export function Button({
  variant,
  size,
  muted,
  shape,
  icon: Icon,
  trailingIcon: TrailingIcon,
  loading = false,
  asChild = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <UiButton
      variant={null}
      size={null}
      asChild={asChild}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        buttonVariants({ variant, size, muted, shape }),
        TrailingIcon && "group/button",
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="motion-safe:animate-spin" />
      ) : Icon ? (
        <Icon aria-hidden="true" />
      ) : null}
      <Slottable>{children}</Slottable>
      {TrailingIcon ? (
        <TrailingIcon
          aria-hidden="true"
          className="transition-transform duration-220 ease-out-lk group-hover/button:translate-x-0.75"
        />
      ) : null}
    </UiButton>
  );
}
