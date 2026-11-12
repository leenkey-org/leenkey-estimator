"use client";

import { CONSENT_OPEN_EVENT } from "@/lib/consent";
import { frFooter } from "@/lib/i18n/sections/footer";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { footer: frFooter } as const;

/** « Gérer mes cookies »: reopens the consent preferences (ConsentManager). */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      {fr.footer.manageCookies}
    </button>
  );
}
