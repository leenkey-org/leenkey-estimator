import type { ReactNode } from "react";
import { FacadeDrawing } from "./facade-drawing";
import { NEXT_MS, StillAccent, delay, heroTitle } from "./hero-title";
import { cn } from "@/lib/utils";

export type BrandPanelProps = {
  /** Anchor of the panel (« #valoriser » on the home page). */
  id?: string;
  /** blue: buyer home, end of a flow; navy: dark headers. */
  variant?: "blue" | "navy";
  title: string;
  /**
   * The words of the title with the dimension line of the brand drawing
   * under them (« votre vente. »), as the V1 titles set them apart.
   */
  titleAccent?: string;
  /** HTML level, set by the page outline: h1 when the panel heads the page. */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  /**
   * hero: display 36, 44 then 56 px, text 15 then 16 px and more room
   * (public pages, DESIGN.md 13.1), rising into place word by word on the
   * first paint; page: display 36 px (buyer home, 36 to 44 px in DESIGN.md
   * 12.10).
   */
  titleSize?: "hero" | "page";
  description?: string;
  /**
   * facade.svg on the right, white at 55 %, from 1024 px; it traces itself
   * on the first paint (hero) or when it enters the screen.
   */
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
  titleAccent,
  titleAs: Title = "h1",
  titleSize = "hero",
  description,
  illustration = false,
  children,
  className,
}: BrandPanelProps) {
  const hero = titleSize === "hero";
  const words = hero ? heroTitle(title, titleAccent) : null;
  const last = words?.last ?? 0;
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
          hero ? "py-12 lg:py-20" : "py-8",
        )}
      >
        <div
          className={cn(
            "flex max-w-lk-prose flex-col",
            // Room for the dimension line under the title.
            hero ? "gap-4 lg:gap-5" : titleAccent ? "gap-3" : "gap-2",
            illustration && "lg:max-w-lk-form",
          )}
        >
          <Title
            // Word by word, the title is read whole: by its name, the words
            // hidden from assistive technologies (some read them one by one).
            aria-label={words ? title : undefined}
            className={cn(
              "text-lk-display font-bold text-wide",
              hero && "md:text-lk-display-md lg:text-lk-display-lg",
            )}
          >
            {words ? (
              <span aria-hidden="true">{words.content}</span>
            ) : (
              <StillAccent text={title} accent={titleAccent} />
            )}
          </Title>
          {description ? (
            <p
              style={hero ? delay(last + NEXT_MS) : undefined}
              className={cn(
                hero ? "lk-rise text-lk-body text-pretty lg:text-lk-body-lg" : "text-lk-compact",
                variant === "blue" ? "text-lk-on-blue-2" : "text-white/72",
              )}
            >
              {description}
            </p>
          ) : null}
          {children ? (
            <div
              style={hero ? delay(last + 2 * NEXT_MS) : undefined}
              className={cn("mt-4", hero && "lk-rise")}
            >
              {children}
            </div>
          ) : null}
        </div>
        {illustration ? (
          <FacadeDrawing
            data-reveal-draw={hero ? undefined : ""}
            className={cn(
              "lk-drawing pointer-events-none absolute bottom-0 right-10 hidden h-52.5 w-95 opacity-55 lg:block",
              hero && "lk-drawing-in",
            )}
          />
        ) : null}
      </div>
    </section>
  );
}
