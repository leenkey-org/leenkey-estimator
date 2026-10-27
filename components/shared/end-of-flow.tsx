import type { ReactNode } from "react";
import { FacadeDrawing } from "./facade-drawing";
import { cn } from "@/lib/utils";

export type EndOfFlowProps = {
  title: string;
  /** h1 on its page; lower on the design board. */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  text: string;
  /** The way on: one button, variant cta (the gradient on the night). */
  action: ReactNode;
  className?: string;
};

/**
 * End of a flow (docs/DESIGN.md 10.8, G8): « C'est envoyé », « C'est activé ».
 * The night of the charte D and its halos, the whole screen on a phone, 60 %
 * of its height from 768 px; display title, text 15 px, one button.
 * facade.svg fades in (360 ms): the one orchestrated moment of the product
 * (DESIGN.md 9), still when motion is reduced.
 */
export function EndOfFlow({
  title,
  titleAs: Title = "h1",
  text,
  action,
  className,
}: EndOfFlowProps) {
  return (
    <section
      className={cn(
        "lk-hero-bg relative flex min-h-dvh flex-col overflow-hidden text-white md:min-h-[60dvh]",
        className,
      )}
    >
      <div className="lk-frame relative flex flex-1 flex-col justify-center gap-8 py-12">
        <FacadeDrawing className="h-auto w-44 opacity-55 duration-360 ease-out-lk motion-safe:animate-in motion-safe:fade-in-0 md:absolute md:right-(--lk-gutter) md:bottom-0 md:w-95" />
        <div className="flex max-w-lk-form flex-col gap-3">
          <Title className="text-lk-display font-bold tracking-lk-d-tight lg:text-lk-display-lg">
            {title}
          </Title>
          <p className="text-lk-body text-lk-night-muted">{text}</p>
          <div className="mt-5">{action}</div>
        </div>
      </div>
    </section>
  );
}
