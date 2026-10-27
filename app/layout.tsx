import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { ConsentManager } from "@/components/analytics/consent-manager";
import { EnvBanner } from "@/components/shared/env-banner";
import { RouteHistory } from "@/leenkey/navigation/components/route-history";
import { SpaceProvider } from "@/leenkey/navigation/components/space-context";
import { isProduction } from "@/lib/env";
import { archivo, sora } from "@/lib/fonts";
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
    // Archivo, self-hosted by next/font (no request to Google before
    // consent, L1-37), for every page and the portals outside <FacadeRoot>;
    // Sora for the pages of the redesign D (L1-57).
    <html lang="fr" className={`${archivo.variable} ${sora.variable}`}>
      <body>
        <EnvBanner />
        {/* Space of the navigation, kept across client navigations (L1-10). */}
        <SpaceProvider>{children}</SpaceProvider>
        {/* The page before, for « Retour aux annonces » (DECISIONS 2026-10-26). */}
        <RouteHistory />
        <Analytics />
        <ConsentManager analyticsEnabled={analytics} gaId={GA_ID} gtmId={GTM_ID} />
      </body>
    </html>
  );
}
