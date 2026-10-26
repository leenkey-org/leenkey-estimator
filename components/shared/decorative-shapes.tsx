import { cn } from "@/lib/utils";

export type DecorativeShape = {
  kind: "halo" | "ring" | "dot";
  /** Position and size, in Tailwind classes (« -top-38 -right-28 size-120 »). */
  className: string;
  /** The slower float, backwards. */
  slow?: boolean;
};

/**
 * The light blue shapes of direction C behind a white section
 * (docs/design-handoff/SPECS.md 4.7): a halo, a ring, a dot, floating slowly,
 * still with reduced motion. The section is `relative isolate overflow-hidden`;
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
            shape.slow ? "lk-float-slow" : "lk-float",
            shape.className,
          )}
        />
      ))}
    </>
  );
}
