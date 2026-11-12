import Image from "next/image";
import { frNav } from "@/lib/i18n/sections/nav";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { nav: frNav } as const;

/** Size of public/brand/logo.svg: the logo of leenkey.fr cut to its drawing. */
const WIDTH = 309;
const HEIGHT = 80;

/**
 * The logo of Leenkey (DECISIONS 2026-10-18), the one of leenkey.fr: the
 * house with its key, then « leenkey ». White on a dark ground (the admin
 * sidebar). Its height comes from the class, its width follows.
 */
export function Logo({
  tone = "color",
  className,
}: {
  tone?: "color" | "white";
  className?: string;
}) {
  return (
    <Image
      src={tone === "white" ? "/brand/logo-white.svg" : "/brand/logo.svg"}
      alt={fr.nav.brand}
      width={WIDTH}
      height={HEIGHT}
      unoptimized
      loading="eager"
      className={cn("h-7 w-auto", className)}
    />
  );
}
