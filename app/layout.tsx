import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { ConsentManager } from "@/components/analytics/consent-manager";
import { EnvBanner } from "@/components/shared/env-banner";
import { SpaceProvider } from "@/leenkey/navigation/components/space-context";
import { isProduction } from "@/lib/env";
// V1 fonts (Sora, DM Sans, Poppins), self-hosted: no request to Google before
// consent (L1-37). Façade uses Archivo through next/font.
import "./v1-fonts.css";
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
  // GA4 and GTM only count real visitors (off on the preprod and in local),
  // and only after they accept audience measurement (L1-37).
  const analytics = isProduction();
  return (
    <html lang="fr">
      <head>
        <link rel="preload" href="/pages/landing.html" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/pages/leenkey.css" as="style" />
        <link rel="prefetch" href="/pages/concept.html" />
        <link rel="prefetch" href="/pages/investir.html" />
      </head>
      <body>
        <EnvBanner />
        {/* Space of the navigation, kept across client navigations (L1-10). */}
        <SpaceProvider>{children}</SpaceProvider>
        <Analytics />
        <ConsentManager analyticsEnabled={analytics} gaId={GA_ID} gtmId={GTM_ID} />
      </body>
    </html>
  );
}
