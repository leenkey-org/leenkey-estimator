"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { FacadeDrawing } from "./facade-drawing";
import { cn } from "@/lib/utils";

const noSubscription = () => () => {};

/**
 * A photo filling its frame (docs/DESIGN.md 7.1): on stone while it loads,
 * then a fade of 160 ms; facade.svg if it fails (a listing withdrawn while
 * the page was open). The frame is the parent, positioned. A photo of the
 * page sent by the server shows as soon as it arrives, without waiting for
 * the JavaScript (the largest paint of the listing and of the search): only
 * a photo shown later fades in.
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
  // True while the page sent by the server is hydrated, kept by the photos it holds.
  const hydrating = useSyncExternalStore(
    noSubscription,
    () => false,
    () => true,
  );
  const [fromServer] = useState(hydrating);
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
      // next/image 15 preloads a priority image without saying it is urgent.
      fetchPriority={priority ? "high" : undefined}
      onLoad={() => setState("loaded")}
      onError={() => setState("failed")}
      className={cn(
        fit === "cover" ? "object-cover" : "object-contain",
        !fromServer && "transition-opacity duration-160 ease-linear motion-reduce:transition-none",
        fromServer || state === "loaded" ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
