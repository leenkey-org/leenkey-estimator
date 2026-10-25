import type { Metadata } from "next";
import { requireAdmin } from "@/core/auth/session";

/**
 * generateMetadata of a page of the back office: its metadata, read under
 * requireAdmin(). For an account without the admin role, Next.js then gives
 * the 404 the metadata of app/not-found.tsx, its title included, instead of
 * the title of the page the 404 hides. Never in the layout: Next.js reads the
 * metadata of the layouts again for the 404, and would fail a second time
 * (no title at all).
 */
export function adminMetadata(metadata: Metadata): () => Promise<Metadata> {
  return async () => {
    await requireAdmin();
    return metadata;
  };
}
