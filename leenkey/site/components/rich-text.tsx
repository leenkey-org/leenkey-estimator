import Link from "next/link";
import type { Rich } from "@/lib/i18n/rich";

// A text of fr.site or fr.legal with its bold parts and links (lib/i18n/rich.ts).

export type { Rich } from "@/lib/i18n/rich";

const linkClassName =
  "rounded-lk-sm text-lk-blue underline underline-offset-2 hover:text-lk-blue-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue";

export function RichText({
  parts,
  strongClassName = "font-semibold text-lk-ink",
}: {
  parts: Rich;
  /** Style of the bold parts: ink 600 by default. */
  strongClassName?: string;
}) {
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
            <Link key={index} href={part.href} className={linkClassName}>
              {part.link}
            </Link>
          );
        }
        const external = part.href.startsWith("http");
        return (
          <a
            key={index}
            href={part.href}
            className={linkClassName}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {part.link}
          </a>
        );
      })}
    </>
  );
}
