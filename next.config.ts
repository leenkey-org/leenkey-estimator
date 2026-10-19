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
  // The share image draws the white logo, read from public/ on the server.
  outputFileTracingIncludes: { "/api/og/**": ["./public/brand/logo-white.svg"] },
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
