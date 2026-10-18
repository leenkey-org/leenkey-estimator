"use client";

import { useState } from "react";
import Image from "next/image";
import { FacadeDrawing } from "./facade-drawing";
import { cn } from "@/lib/utils";

/**
 * A photo filling its frame (docs/DESIGN.md 7.1): on stone while it loads,
 * then a fade of 160 ms; facade.svg if it fails (a listing withdrawn while
 * the page was open). The frame is the parent, positioned.
 */
export function Photo({
  src,
  alt,
  sizes,
  priority,
  fit = "cover",
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  if (state === "failed") {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-lk-stone-2">
        <FacadeDrawing className="w-2/5 text-lk-ink-3" />
        {alt ? <span className="sr-only">{alt}</span> : null}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onLoad={() => setState("loaded")}
      onError={() => setState("failed")}
      className={cn(
        fit === "cover" ? "object-cover" : "object-contain",
        "transition-opacity duration-160 ease-linear motion-reduce:transition-none",
        state === "loaded" ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
