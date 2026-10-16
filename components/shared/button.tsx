import type { ComponentProps, ReactNode } from "react";
import { Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// docs/DESIGN.md 10.1. Extends components/ui/button.tsx: its own variants are
// switched off (null) and its base classes overridden below.
export const buttonVariants = cva(
  [
    "relative rounded-lk-sm font-semibold shadow-none",
    "transition-colors duration-140 ease-out-lk",
    "focus-visible:ring-0 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
    // Disabled: 0.45 opacity, "not allowed" cursor, no hover (not-disabled: below).
    "disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-lk-blue text-white not-disabled:hover:bg-lk-blue-hover not-disabled:active:bg-lk-blue-hover",
        secondary:
          "border-[1.5px] border-lk-blue-line bg-lk-surface text-lk-blue not-disabled:hover:bg-lk-blue-tint not-disabled:active:bg-lk-blue-tint",
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
      },
      size: {
        lg: "h-13 px-5 text-lk-button-lg",
        md: "h-11 px-4 text-lk-button-md",
        // 40 px high, 44 px touch target (DESIGN.md 15).
        sm: "h-10 px-3.5 text-lk-button-sm after:absolute after:inset-x-0 after:-inset-y-0.5",
      },
      muted: { true: "", false: "" },
    },
    compoundVariants: [
      {
        variant: "ghost",
        muted: true,
        className:
          "text-lk-ink-3 not-disabled:hover:bg-lk-stone-2 not-disabled:active:bg-lk-stone-2",
      },
    ],
    defaultVariants: { variant: "primary", size: "md", muted: false },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

export type ButtonProps = Omit<ComponentProps<"button">, "children"> & {
  variant?: NonNullable<ButtonVariants["variant"]>;
  size?: NonNullable<ButtonVariants["size"]>;
  /** Grey ghost button, for « Ignorer ». */
  muted?: boolean;
  /** Lucide icon on the left, 16 px. */
  icon?: LucideIcon;
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
  icon: Icon,
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
      className={cn(buttonVariants({ variant, size, muted }), className)}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="motion-safe:animate-spin" />
      ) : Icon ? (
        <Icon aria-hidden="true" />
      ) : null}
      <Slottable>{children}</Slottable>
    </UiButton>
  );
}
