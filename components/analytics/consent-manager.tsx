"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_OPEN_EVENT,
  consentDay,
  cookieValue,
  isAnalyticsCookie,
  parseConsent,
  serializeConsent,
  type Consent,
} from "@/lib/consent";
import { AnalyticsTags } from "./analytics-tags";

const ConsentDialog = dynamic(() => import("./consent-dialog"), { ssr: false });

type View = "hidden" | "banner" | "panel";

function readConsent(): Consent | null {
  try {
    return parseConsent(cookieValue(document.cookie, CONSENT_COOKIE));
  } catch {
    return null;
  }
}

function writeConsent(consent: Consent) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(consent)}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax${secure}`;
}

/** Google Analytics cookies are set on the site's domain and its parent domain. */
function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host.split(".").slice(-2).join(".")}`];
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (!name || !isAnalyticsCookie(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

/**
 * Cookie consent and the trackers it governs (L1-37, Q23). Asked on the first
 * visit, kept six months, reopened by « Gérer mes cookies » (CONSENT_OPEN_EVENT).
 * GA4 and GTM are mounted only after « Accepter » and only in production.
 */
export function ConsentManager({
  analyticsEnabled,
  gaId,
  gtmId,
}: {
  analyticsEnabled: boolean;
  gaId: string;
  gtmId: string;
}) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [view, setView] = useState<View>("hidden");

  useEffect(() => {
    const saved = readConsent();
    setConsent(saved);
    setView(saved ? "hidden" : "banner");
    const open = () => setView("panel");
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  const choose = useCallback(
    (analytics: boolean) => {
      const next = { analytics, date: consentDay() };
      writeConsent(next);
      setView("hidden");
      if (consent?.analytics && !analytics) {
        // Withdrawal: Google stops at once, its cookies go, and the page
        // reloads without the scripts.
        window.gtag?.("consent", "update", { analytics_storage: "denied" });
        clearAnalyticsCookies();
        window.location.reload();
        return;
      }
      setConsent(next);
    },
    [consent],
  );

  return (
    <>
      {analyticsEnabled && consent?.analytics ? <AnalyticsTags gaId={gaId} gtmId={gtmId} /> : null}
      {view === "hidden" ? null : (
        <ConsentDialog
          key={view}
          view={view}
          analytics={consent?.analytics ?? false}
          onAccept={() => choose(true)}
          onRefuse={() => choose(false)}
          onCustomize={() => setView("panel")}
          onSave={choose}
        />
      )}
    </>
  );
}
