import { frFooter } from "@/lib/i18n/sections/footer";
import { frLegal } from "@/lib/i18n/sections/legal";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { footer: frFooter, legal: frLegal } as const;

const t = fr.footer.links;

// Permanent legal links of every footer (L1-36; legal file of 9 October:
// notice, terms, sales terms, privacy, cookies, reporting, contact, plus the
// AI notice of the SPEC).
export const FOOTER_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/mentions-legales", label: t.notice },
  { href: "/cgu", label: t.terms },
  { href: "/cgv", label: t.salesTerms },
  { href: "/confidentialite", label: t.privacy },
  { href: "/cookies", label: t.cookies },
  { href: "/signalement", label: t.reporting },
  { href: "/intelligence-artificielle", label: t.ai },
  { href: `mailto:${fr.legal.contactEmail}`, label: t.contact },
];
