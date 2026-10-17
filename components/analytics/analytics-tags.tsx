"use client";

import Script from "next/script";
import { Suspense } from "react";
import { GaPageView } from "./ga-page-view";

// GA4 and GTM, mounted only once audience measurement is accepted (L1-37):
// nothing from Google loads before, so no cookie can be set. Consent Mode
// says the same to Google: analytics granted, advertising always denied.
// GA cookies last 13 months at most (CNIL).
const COOKIE_EXPIRES = 60 * 60 * 24 * 395;

export function AnalyticsTags({ gaId, gtmId }: { gaId: string; gtmId: string }) {
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
gtag('config', '${gaId}', {cookie_expires: ${COOKIE_EXPIRES}});`}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
    </>
  );
}
