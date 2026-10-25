import { readdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PHOTO_MINIMUM, PHOTO_WIDTHS } from "@/leenkey/properties/photo-files";
import { isShown, sitePhoto } from "@/leenkey/site/photos";

// L1-46: the photos of the home page and of the demo properties.

describe("photo de l'accueil", () => {
  const photo = { src: "/images/x-1600.webp", width: 1600, height: 1200 };

  it("une photo aux droits non confirmés ne s'affiche jamais en production", () => {
    const pending = { ...photo, rights: "to_confirm" as const };
    expect(isShown(pending, "production")).toBe(false);
    expect(isShown(pending, "staging")).toBe(true);
    expect(isShown(pending, "local")).toBe(true);
    expect(isShown({ ...photo, rights: "cleared" }, "production")).toBe(true);
  });

  it("ses droits confirmés par Younes (Q57), elle s'affiche partout", () => {
    expect(sitePhoto("home", "production")?.rights).toBe("cleared");
    expect(sitePhoto("home", "staging")).not.toBeNull();
    expect(sitePhoto("home", "local")).not.toBeNull();
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
      owner: string;
      file: string;
      caption: string;
      crop: { left: number; top: number; width: number; height: number };
    }[];
  };

  it("une photo ne sert qu'à un seul bien (DESIGN.md 7.2)", () => {
    const files = photos.map((photo) => photo.file);
    expect(new Set(files).size).toBe(files.length);
    // Two files never come from the same Unsplash photo.
    const sources = readFileSync(`${dir}/CREDITS.md`, "utf8").match(
      /images\.unsplash\.com\/photo-[\w-]+/g,
    );
    expect(sources?.length).toBeGreaterThan(0);
    expect(new Set(sources).size).toBe(sources?.length);
  });

  // SPEC-V2 section 23, L1-46b: every listing online in the seed has its photo.
  it("chaque bien publié du seed a au moins une photo", () => {
    const seed = readFileSync("supabase/seed/05_demo_data.sql", "utf8");
    const published = [
      ...seed.matchAll(
        /^ {2}\((\d+), '[ab]', '[a-z]+'[^]*?, '(published|pending|rejected)', \d+, '[a-z]+'\)/gm,
      ),
    ]
      .filter((row) => row[2] === "published")
      .map((row) => Number(row[1]));
    expect(published).toHaveLength(12);
    const shown = new Set(photos.map((photo) => photo.property));
    for (const property of published) expect(shown.has(property), `n° ${property}`).toBe(true);
  });

  // Sent as its owner (scripts/seed-photos.mjs): the seller of the property.
  it("chaque photo est celle d'un bien du seed, de son propriétaire, avec une légende courte", () => {
    const seed = readFileSync("supabase/seed/05_demo_data.sql", "utf8");
    for (const photo of photos) {
      expect(seed, photo.file).toMatch(
        new RegExp(`\\(${photo.property}, '${photo.owner}', '(maison|appartement|terrain)'`),
      );
      expect(photo.caption.length).toBeGreaterThan(0);
      expect(photo.caption.length).toBeLessThanOrEqual(200);
    }
  });

  // As a photo sent by a seller: never under the minimum of L1-12.
  it("recadrée dans la photo, jamais sous le minimum imposé aux vendeurs", async () => {
    for (const { file, crop } of photos) {
      const meta = await sharp(`${dir}/${file}`).metadata();
      expect(crop.left + crop.width, file).toBeLessThanOrEqual(meta.width ?? 0);
      expect(crop.top + crop.height, file).toBeLessThanOrEqual(meta.height ?? 0);
      expect(Math.max(crop.width, crop.height), file).toBeGreaterThanOrEqual(PHOTO_MINIMUM.long);
      expect(Math.min(crop.width, crop.height), file).toBeGreaterThanOrEqual(PHOTO_MINIMUM.short);
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
