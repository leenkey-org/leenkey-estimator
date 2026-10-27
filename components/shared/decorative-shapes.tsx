import { cn } from "@/lib/utils";

export type DecorativeShape = {
  kind:
    | "halo"
    | "ring"
    | "dot"
    | "orb"
    | "orb-solid"
    | "dots"
    | "dots-white"
    | "halo-blue"
    | "halo-violet";
  /** Position and size, in Tailwind classes (« -top-38 -right-28 size-120 »). */
  className: string;
  /** The slower float, backwards. */
  slow?: boolean;
};

/**
 * The light blue shapes of direction C behind a white section
 * (docs/design-handoff/SPECS.md 4.7): a halo, a ring, a dot, floating slowly,
 * still with reduced motion. Those of the redesign D: the orbs and the grid of
 * dots floating, the halos of the night breathing (their grid of white dots
 * still). The section is `relative isolate overflow-hidden`;
 * the shapes sit under its content (z-index -1) and say nothing.
 */
export function DecorativeShapes({ shapes }: { shapes: readonly DecorativeShape[] }) {
  return (
    <>
      {shapes.map((shape, index) => (
        <span
          key={index}
          aria-hidden="true"
          data-shape={shape.kind}
          className={cn(
            "pointer-events-none absolute -z-10 rounded-full",
            shape.kind === "halo" && "bg-radial from-lk-blue/10 to-transparent to-70%",
            shape.kind === "ring" && "border-2 border-lk-blue/14",
            shape.kind === "dot" && "bg-lk-blue/30",
            // Redesign D (SPECS.md 1): the orb of the charte, blurred or
            // solid, its grid of blue dots, the halos of the night.
            shape.kind === "orb" && "lk-gradient-brand opacity-14 blur-[30px]",
            shape.kind === "orb-solid" && "lk-gradient-brand opacity-85",
            shape.kind === "dots" && "lk-dots-blue rounded-none",
            shape.kind === "dots-white" && "lk-dots-white rounded-none opacity-80",
            shape.kind === "halo-blue" && "lk-halo-blue lk-glow",
            shape.kind === "halo-violet" && "lk-halo-violet lk-glow",
            shape.kind.startsWith("halo-") || shape.kind === "dots-white"
              ? null
              : shape.slow
                ? "lk-float-slow"
                : "lk-float",
            shape.className,
          )}
        />
      ))}
    </>
  );
}
