import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { GaPageView } from "@/components/analytics/ga-page-view";
import "./globals.css";

const GA_ID = "G-27N3E3WP2D";
const GTM_ID = "GTM-MTRM36P4";

export const metadata: Metadata = {
  metadataBase: new URL("https://leenkey.fr"),
  title: "Leenkey — Vendez votre bien immobilier, accompagné à chaque étape",
  description:
    "La plateforme qui accompagne les propriétaires dans la vente de leur bien, sans agence : analyse de valeur, dossier, annonce, négociation, jusqu'à la signature. Forfait fixe et transparent.",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "96x96", type: "image/png" },
      { url: "/leenkey-logo.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Leenkey — Vendez votre bien immobilier, accompagné à chaque étape",
    description:
      "La plateforme qui accompagne les propriétaires dans la vente de leur bien, sans agence : de l'analyse de valeur à la signature. Forfait fixe et transparent.",
    type: "website",
    url: "https://leenkey.fr/",
    siteName: "Leenkey",
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* V1 fonts, kept until the "Façade" design system (L1-07) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=DM+Sans:wght@400;500;600&family=Poppins:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" href="/pages/landing.html" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/pages/leenkey.css" as="style" />
        <link rel="prefetch" href="/pages/concept.html" />
        <link rel="prefetch" href="/pages/investir.html" />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Suspense fallback={null}>
          <GaPageView />
        </Suspense>
        <Analytics />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </body>
    </html>
  );
}
