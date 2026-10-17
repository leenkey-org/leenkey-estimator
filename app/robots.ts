import type { MetadataRoute } from "next";
import { isProduction } from "@/lib/env";

// Every environment but production is closed to crawlers. Production keeps
// the V1 rules (everything open, the sitemap) and closes the signed-in
// areas, the back office and the technical routes (L1-20): nothing there to
// index, only redirects to the login page.
const PRIVATE_PATHS = [
  "/vendeur",
  "/acquereur",
  "/messages",
  "/compte",
  "/assistant",
  "/admin",
  "/api/",
  "/auth/",
  "/confirmation",
  "/conditions",
  "/reinitialiser",
] as const;

export default function robots(): MetadataRoute.Robots {
  if (!isProduction()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] },
    sitemap: "https://leenkey.fr/sitemap.xml",
  };
}
