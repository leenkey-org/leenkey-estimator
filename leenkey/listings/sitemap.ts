import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// L1-20: entries of /sitemap.xml. The V1 pages keep their entries (reprise of
// public/sitemap.xml, CLAUDE.md section 16), then the search and every
// published listing. Robots: app/robots.ts.

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const PAGES: ReadonlyArray<{ path: string; changeFrequency: ChangeFrequency; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/estimer", changeFrequency: "weekly", priority: 0.9 },
  { path: "/acheter", changeFrequency: "daily", priority: 0.9 },
  { path: "/concept", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tarifs", changeFrequency: "monthly", priority: 0.8 },
  { path: "/qui-sommes-nous", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/investir", changeFrequency: "monthly", priority: 0.6 },
  { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cgu", changeFrequency: "yearly", priority: 0.2 },
];

export type SitemapListing = { slug: string; publishedAt: string | null };

export function sitemapEntries(listings: readonly SitemapListing[]): MetadataRoute.Sitemap {
  return [
    ...PAGES.map(({ path, changeFrequency, priority }) => ({
      url: absoluteUrl(path),
      changeFrequency,
      priority,
    })),
    ...listings.map((listing) => ({
      url: absoluteUrl(`/annonce/${listing.slug}`),
      lastModified: listing.publishedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
