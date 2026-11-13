import type { NextConfig } from "next";

// The V1 marketing pages (public/pages/*.html, removed with L1-41 to L1-43)
// and their V2 page.
const V1_PAGES = [
  ["landing", "/"],
  ["concept", "/concept"],
  ["tarifs", "/tarifs"],
  ["faq", "/faq"],
  ["investir", "/investir"],
] as const;

/**
 * Security headers of every response (L1-38, CLAUDE.md section 11). The CSP
 * holds the directives that close a whole class of attacks without listing
 * the scripts of the site: no framing of Leenkey (clickjacking), no plugin,
 * no <base> pointed elsewhere, forms sent to Leenkey or Stripe Checkout only.
 * A list of the script sources would break Google Tag Manager, whose tags
 * are not known yet (DECISIONS Q40); it waits for that answer (BACKLOG-V3).
 * HSTS without includeSubDomains: other subdomains of leenkey.fr are
 * Cédric's (mail, IONOS) and may not all serve HTTPS.
 */
export const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value:
      "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
] as const;

const nextConfig: NextConfig = {
  // Photos of the properties (L1-12): already WebP in three widths, served by
  // the route /img; the loader picks the width, without the optimiser.
  images: {
    loader: "custom",
    loaderFile: "./lib/images/loader.ts",
    deviceSizes: [400, 800, 1600],
    imageSizes: [],
  },
  experimental: {
    // A photo reduced in the browser beforehand (3.5 MB at most); Vercel
    // takes 4.5 MB per request.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // The share image draws the white logo, read from public/ on the server;
  // the assistant reads its prompts (core/ai/prompts/*.md, L1-28), from its
  // route and from the actions of its suggestions (L1-29), which run in the
  // function of the page that calls them (the messaging, the price step):
  // every function has them (a few kilobytes).
  outputFileTracingIncludes: {
    "/api/og/**": ["./public/brand/logo-white.svg"],
    "/**": ["./core/ai/prompts/**/*.md"],
    // The font of the PDF of an offer (L2-03), read from the disk by its route.
    "/offres/[id]/pdf": ["./leenkey/offers/fonts/*.ttf"],
  },
  // Its renderer loads its own fonts and layout engine: not bundled.
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
  // The addresses of the V1 pages are kept, as permanent redirects
  // (CLAUDE.md section 16).
  async redirects() {
    return V1_PAGES.map(([page, destination]) => ({
      source: `/pages/${page}.html`,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
