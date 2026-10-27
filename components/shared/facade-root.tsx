import type { ComponentProps } from "react";
import { sora } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * Classes of the Façade scope (Sora and the base styles of app/globals.css).
 * Also for the container of a portal (dialog, sheet) rendered outside the root.
 */
export const facadeScope = cn(sora.variable, "facade");

/**
 * Root of every V2 screen: the Façade design system applies to its subtree
 * only, so that the V1 pages ported in L1-01 keep their own styles.
 */
export function FacadeRoot({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(facadeScope, className)} {...props} />;
}
