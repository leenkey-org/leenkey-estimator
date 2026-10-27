import Link from "next/link";
import type { Rich } from "@/lib/i18n/rich";

// A text of fr.site or fr.legal with its bold parts and links (lib/i18n/rich.ts).

export type { Rich } from "@/lib/i18n/rich";

const linkClassName = {
  light:
    "rounded-lk-sm text-lk-blue underline underline-offset-2 hover:text-lk-blue-hover focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue",
  // On navy (L1-50): the light blue (6.9:1), white on hover and for the focus ring.
  dark: "rounded-lk-sm text-lk-blue-light underline underline-offset-2 hover:text-white focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white",
} as const;

export function RichText({
  parts,
  tone = "light",
  strongClassName = tone === "dark" ? "font-semibold text-white" : "font-semibold text-lk-ink",
}: {
  parts: Rich;
  /** dark: on navy, bold parts in white and links in the light blue. */
  tone?: "light" | "dark";
  /** Style of the bold parts: ink 600 by default (white on navy). */
  strongClassName?: string;
}) {
  const link = linkClassName[tone];
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === "string") return part;
        if ("strong" in part) {
          return (
            <strong key={index} className={strongClassName}>
              {part.strong}
            </strong>
          );
        }
        // A page of the site through the router; an address or another site
        // as a plain link, another site in a new tab.
        if (part.href.startsWith("/")) {
          return (
            <Link key={index} href={part.href} className={link}>
              {part.link}
            </Link>
          );
        }
        const external = part.href.startsWith("http");
        return (
          <a
            key={index}
            href={part.href}
            className={link}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {part.link}
          </a>
        );
      })}
    </>
  );
}
