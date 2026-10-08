import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
