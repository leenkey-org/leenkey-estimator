import { readdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PHOTO_WIDTHS } from "@/leenkey/properties/photo-files";
import { sitePhoto } from "@/leenkey/site/photos";

// L1-46: the photos of the home page and of the demo properties.

describe("photo de l'accueil", () => {
  it("ne s'affiche jamais en production tant que ses droits ne sont pas confirmés (Q57)", () => {
    expect(sitePhoto("home", "production")).toBeNull();
    expect(sitePhoto("home", "staging")?.rights).toBe("to_confirm");
    expect(sitePhoto("home", "local")?.rights).toBe("to_confirm");
  });

  it("existe en WebP aux trois largeurs, jamais agrandie", async () => {
    const photo = sitePhoto("home", "local");
    expect(photo?.src).toMatch(/^\/images\/.+-1600\.webp$/);
    if (!photo) return;
    for (const width of PHOTO_WIDTHS) {
      const meta = await sharp(
        `public${photo.src.replace(/-1600\.webp$/, `-${width}.webp`)}`,
      ).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(Math.min(width, photo.width));
    }
  });
});

describe("photos des biens de démonstration (supabase/seed/photos)", () => {
  const dir = "supabase/seed/photos";
  const { photos } = JSON.parse(readFileSync(`${dir}/photos.json`, "utf8")) as {
    photos: {
      property: number;
      file: string;
      caption: string;
      crop: { left: number; top: number; width: number; height: number };
    }[];
  };

  it("une photo ne sert qu'à un seul bien (DESIGN.md 7.2)", () => {
    const files = photos.map((photo) => photo.file);
    expect(new Set(files).size).toBe(files.length);
  });

  it("chaque photo est celle d'une maison du seed, avec une légende courte", () => {
    const seed = readFileSync("supabase/seed/05_demo_data.sql", "utf8");
    for (const photo of photos) {
      expect(seed, photo.file).toMatch(new RegExp(`\\(${photo.property}, '[ab]', 'maison'`));
      expect(photo.caption.length).toBeGreaterThan(0);
      expect(photo.caption.length).toBeLessThanOrEqual(200);
    }
  });

  it("recadrée en 4:3 dans la photo, comme une photo d'annonce", async () => {
    for (const { file, crop } of photos) {
      const meta = await sharp(`${dir}/${file}`).metadata();
      expect(crop.left + crop.width, file).toBeLessThanOrEqual(meta.width ?? 0);
      expect(crop.top + crop.height, file).toBeLessThanOrEqual(meta.height ?? 0);
      expect(crop.width * 3, file).toBe(crop.height * 4);
    }
  });

  it("chaque fichier du dossier est chargé et crédité", () => {
    const credits = readFileSync(`${dir}/CREDITS.md`, "utf8");
    const listed = photos.map((photo) => photo.file).sort();
    const files = readdirSync(dir)
      .filter((file) => file.endsWith(".webp"))
      .sort();
    expect(files).toEqual(listed);
    for (const file of files) expect(credits).toContain(`\`${file}\``);
  });
});
