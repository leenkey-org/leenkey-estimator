import type { ReactNode } from "react";
import { FacadeDrawing } from "./facade-drawing";
import { cn } from "@/lib/utils";

export type BrandPanelProps = {
  /** Anchor of the panel (« #valoriser » on the home page). */
  id?: string;
  /** blue: buyer home, end of a flow; navy: dark headers. */
  variant?: "blue" | "navy";
  title: string;
  /** HTML level, set by the page outline: h1 when the panel heads the page. */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  /**
   * hero: display 36 then 56 px, text 15 then 16 px and more room (public
   * home, DESIGN.md 13.1); page: display 36 px (buyer home, 36 to 44 px in
   * DESIGN.md 12.10).
   */
  titleSize?: "hero" | "page";
  description?: string;
  /** facade.svg on the right, white at 55 %, from 1024 px. */
  illustration?: boolean;
  /** Actions or content under the description. */
  children?: ReactNode;
  className?: string;
};

/**
 * Brand flat (docs/DESIGN.md 10.6): full width, square corners, display title
 * in white. A card may overlap its bottom edge; the overlap separates it, no
 * shadow needed.
 */
export function BrandPanel({
  id,
  variant = "blue",
  title,
  titleAs: Title = "h1",
  titleSize = "hero",
  description,
  illustration = false,
  children,
  className,
}: BrandPanelProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative overflow-hidden text-white",
        variant === "blue" ? "bg-lk-blue" : "bg-lk-navy",
        className,
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex min-h-52.5 max-w-lk-page flex-col justify-center px-5 md:px-10",
          titleSize === "hero" ? "py-12 lg:py-20" : "py-8",
        )}
      >
        <div
          className={cn("flex max-w-lk-prose flex-col gap-2", illustration && "lg:max-w-lk-form")}
        >
          <Title
            className={cn(
              "text-lk-display font-bold text-wide",
              titleSize === "hero" && "lg:text-lk-display-lg",
            )}
          >
            {title}
          </Title>
          {description ? (
            <p
              className={cn(
                titleSize === "hero"
                  ? "text-lk-body text-pretty lg:text-lk-body-lg"
                  : "text-lk-compact",
                variant === "blue" ? "text-lk-on-blue-2" : "text-white/72",
              )}
            >
              {description}
            </p>
          ) : null}
          {children ? (
            <div className={titleSize === "hero" ? "mt-6" : "mt-4"}>{children}</div>
          ) : null}
        </div>
        {illustration ? (
          <FacadeDrawing className="pointer-events-none absolute bottom-0 right-10 hidden h-52.5 w-95 opacity-55 lg:block" />
        ) : null}
      </div>
    </section>
  );
}
