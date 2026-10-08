import type { MetadataRoute } from "next";
import { isProduction } from "@/lib/env";

// Production keeps the V1 rules; every other environment is closed to crawlers.
export default function robots(): MetadataRoute.Robots {
  if (!isProduction()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://leenkey.fr/sitemap.xml",
  };
}
