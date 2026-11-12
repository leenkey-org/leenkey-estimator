"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { saveConsent } from "./actions";
import { AnalyticsTags } from "./analytics-tags";
import ConsentDialog from "./consent-dialog";

type View = "hidden" | "banner" | "panel";

function readConsent(): Consent | null {
  try {
    return parseConsent(cookieValue(document.cookie, CONSENT_COOKIE));
  } catch {
    return null;
  }
}

/** At once, for this page; saveConsent then makes it last six months. */
function writeConsent(consent: Consent) {
  try {
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${serializeConsent(consent)}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax${secure}`;
  } catch {
    // Storage refused (sandboxed frame): the choice applies to this page only.
  }
}

/** Google Analytics cookies are set on the site's host or its parent domain. */
function clearAnalyticsCookies() {
  try {
    const host = window.location.hostname;
    const domains = ["", host, `.${host.split(".").slice(-2).join(".")}`];
    for (const entry of document.cookie.split(";")) {
      const name = entry.split("=")[0]?.trim();
      if (!name || !isAnalyticsCookie(name)) continue;
      for (const domain of domains) {
        document.cookie = `${name}=; path=/; max-age=0${domain ? `; domain=${domain}` : ""}`;
      }
    }
  } catch {
    // Nothing to clear without cookie access.
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
  // The banner is in the page sent by the server (P-06): it shows with the
  // first paint instead of after the JavaScript, and the script of the
  // <head> hides it at once for a visitor who already chose
  // (consentHeadScript); the cookie is read again once hydrated.
  const [view, setView] = useState<View>("banner");
  // Button that opened the preferences: focus goes back to it afterwards.
  const opener = useRef<HTMLElement | null>(null);
  const tagsMounted = analyticsEnabled && consent?.analytics === true;

  useEffect(() => {
    const saved = readConsent();
    setConsent(saved);
    setView(saved ? "hidden" : "banner");
    // The script of the <head> and this reading disagree (two cookies, the
    // first malformed): the banner shows, as it would without the script.
    if (!saved) document.documentElement.removeAttribute("data-consent");
    const open = () => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setView("panel");
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  // A refusal made in another tab: this one stops measuring when shown again.
  useEffect(() => {
    if (!tagsMounted) return;
    const recheck = () => {
      if (document.visibilityState === "visible" && !readConsent()?.analytics) {
        window.location.reload();
      }
    };
    document.addEventListener("visibilitychange", recheck);
    return () => document.removeEventListener("visibilitychange", recheck);
  }, [tagsMounted]);

  const choose = useCallback(
    async (analytics: boolean) => {
      const next = { analytics, date: consentDay() };
      writeConsent(next);
      setView("hidden");
      opener.current?.focus();
      opener.current = null;
      const saved = saveConsent(analytics).catch(() => null);
      if (analytics) {
        setConsent(next);
        return;
      }
      // Refusal: Google's cookies go, whatever was chosen before (a choice
      // that expired, another tab). Scripts already running stop with a reload.
      clearAnalyticsCookies();
      if (tagsMounted) {
        window.gtag?.("consent", "update", { analytics_storage: "denied" });
        await saved;
        window.location.reload();
        return;
      }
      setConsent(next);
    },
    [tagsMounted],
  );

  return (
    <>
      {tagsMounted ? <AnalyticsTags gaId={gaId} gtmId={gtmId} /> : null}
      {view === "hidden" ? null : (
        <ConsentDialog
          key={view}
          view={view}
          analytics={consent?.analytics ?? false}
          onAccept={() => void choose(true)}
          onRefuse={() => void choose(false)}
          onCustomize={() => setView("panel")}
          onSave={(analytics) => void choose(analytics)}
        />
      )}
    </>
  );
}
