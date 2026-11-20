"use client";

import Script from "next/script";
import { Suspense } from "react";
import { GaPageView } from "./ga-page-view";

// GA4 (Google Tag Manager is gone: nobody knew its tags, Cédric 2026-11-19,
// DECISIONS.md 2026-11-20), mounted only once audience measurement is accepted (L1-37):
// nothing from Google loads before, so no cookie can be set. Consent Mode
// says the same to Google: analytics granted, advertising always denied.
// GA cookies last 13 months at most (CNIL), counted from their creation
// (cookie_update: false: a visit does not extend them).
const COOKIE_EXPIRES = 60 * 60 * 24 * 395;

export function AnalyticsTags({ gaId }: { gaId: string }) {
  return (
    <>
      <Suspense fallback={null}>
        <GaPageView />
      </Suspense>
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted'});
gtag('js', new Date());
gtag('config', '${gaId}', {cookie_expires: ${COOKIE_EXPIRES}, cookie_update: false});`}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
    </>
  );
}
