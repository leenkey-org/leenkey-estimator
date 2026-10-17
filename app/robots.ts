import type { MetadataRoute } from "next";
import { PROTECTED_PREFIXES } from "@/leenkey/auth/routes";
import { isProduction } from "@/lib/env";

// Every environment but production is closed to crawlers. Production keeps
// the V1 rules (everything open, the sitemap) and closes the areas behind a
// session and the technical routes (L1-20): nothing there to index, only
// redirects to the login page. The share images of the listings stay open
// (/api/og/, the longest rule wins): social networks read robots.txt.
const PRIVATE_PATHS = [...PROTECTED_PREFIXES, "/api/", "/auth/", "/confirmation", "/reinitialiser"];

export default function robots(): MetadataRoute.Robots {
  if (!isProduction()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: ["/", "/api/og/"], disallow: PRIVATE_PATHS },
    sitemap: "https://leenkey.fr/sitemap.xml",
  };
}
