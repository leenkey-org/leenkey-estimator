import type { MetadataRoute } from "next";
import { sitemapListings } from "@/leenkey/listings/queries";
import { sitemapEntries } from "@/leenkey/listings/sitemap";

// L1-20: /sitemap.xml, built again at most every hour (new listings).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await sitemapListings());
}
