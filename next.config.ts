import type { NextConfig } from "next";

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
  // V1 marketing pages are static HTML fetched at runtime by HtmlPage:
  // never cache them, so a content change is visible on the next visit.
  async headers() {
    return [
      {
        source: "/pages/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
