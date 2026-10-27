import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// docs/DESIGN.md 10.1 (IconButton) and 10.6 (transparent, top navigation).
export const iconButtonVariants = cva(
  [
    // Round (charte D, SPECS.md 2).
    "relative shrink-0 rounded-full p-0 shadow-none [&_svg]:size-5",
    "transition-colors duration-140 ease-out-lk",
    "focus-visible:ring-0 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue",
    "disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        stone: "bg-lk-stone-2 text-lk-ink not-disabled:hover:bg-lk-stone",
        "white-float": "bg-lk-surface text-lk-ink shadow-float not-disabled:hover:bg-lk-stone-2",
        tint: "bg-lk-blue-tint text-lk-blue not-disabled:hover:bg-lk-blue-line",
        "on-dark":
          "bg-white/12 text-white not-disabled:hover:bg-white/20 focus-visible:outline-white",
        outline:
          "rounded-full border-[1.5px] border-lk-ink bg-lk-surface text-lk-ink not-disabled:hover:bg-lk-stone-2",
        transparent: "bg-transparent text-lk-ink not-disabled:hover:bg-lk-stone-2",
        // The round button of direction C (SPECS.md 2): arrows of a carousel,
        // the microphone; disabled, its icon takes the colour of « Désactivé ».
        round: [
          "rounded-full border border-lk-line-strong bg-lk-surface text-lk-ink not-disabled:not-aria-disabled:hover:bg-lk-sand",
          "disabled:text-lk-disabled disabled:opacity-100 aria-disabled:cursor-default aria-disabled:text-lk-disabled",
        ],
      },
      size: {
        md: "size-11",
        // 40 × 40 in the notifications panel, 44 px touch target.
        sm: "size-10 after:absolute after:-inset-0.5",
      },
    },
    defaultVariants: { variant: "stone", size: "md" },
  },
);

type IconButtonVariants = VariantProps<typeof iconButtonVariants>;

export type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Required: the button has no visible text (DESIGN.md 6). */
  "aria-label": string;
  icon: LucideIcon;
  variant?: NonNullable<IconButtonVariants["variant"]>;
  size?: NonNullable<IconButtonVariants["size"]>;
};

export function IconButton({ icon: Icon, variant, size, className, ...props }: IconButtonProps) {
  return (
    <UiButton
      variant={null}
      size={null}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      <Icon aria-hidden="true" />
    </UiButton>
  );
}
