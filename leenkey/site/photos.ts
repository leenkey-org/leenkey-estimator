import { appEnv, type AppEnv } from "@/lib/env";

// Photos of the public pages (L1-46), in public/images: each one in WebP at
// 400, 800 and 1600 px wide (`…-{width}.webp`, never enlarged), the width
// asked by next/image (lib/images/loader.ts). A photo whose rights Leenkey
// has not confirmed never shows in production: there the page keeps its
// brand drawing.

export type SitePhoto = {
  /** Its file at 1600 px. */
  src: string;
  width: number;
  height: number;
  /** cleared: Leenkey may publish it; to_confirm: local and staging only. */
  rights: "cleared" | "to_confirm";
};

export type SitePhotoName = "home";

const PHOTOS: Record<SitePhotoName, SitePhoto> = {
  // Hero of the home page, sent by Younes on 2026-10-20, who confirmed its
  // rights the same day (DECISIONS Q57, supabase/seed/photos/CREDITS.md).
  home: {
    src: "/images/accueil/maison-1600.webp",
    width: 1199,
    height: 1592,
    rights: "cleared",
  },
};

/** Whether a photo may show in an environment. */
export function isShown(photo: SitePhoto, env: AppEnv): boolean {
  return photo.rights === "cleared" || env !== "production";
}

export function sitePhoto(name: SitePhotoName, env: AppEnv = appEnv()): SitePhoto | null {
  const photo = PHOTOS[name];
  return isShown(photo, env) ? photo : null;
}
