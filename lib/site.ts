// Public address of the site for absolute links (canonical, Open Graph,
// structured data): NEXT_PUBLIC_SITE_URL of each environment, leenkey.fr
// otherwise.
const PRODUCTION_URL = "https://leenkey.fr";

export function siteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return PRODUCTION_URL;
  try {
    return new URL(value).origin;
  } catch {
    return PRODUCTION_URL;
  }
}

/** « https://leenkey.fr/annonce/… » from « /annonce/… ». */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
