"use client";

import { CONSENT_OPEN_EVENT } from "@/lib/consent";
import { fr } from "@/lib/i18n/fr";

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
