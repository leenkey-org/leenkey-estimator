#!/usr/bin/env node
// Loads the photos of the demo properties (supabase/seed/photos/photos.json,
// L1-46) into the bucket photos, then prints the SQL of their rows in
// public.photos, for psql (scripts/db-seed.sh). Each photo is cropped as the
// manifest says (4:3, as a listing photo), then written in WebP at 400, 800
// and 1600 px, never enlarged, as a photo sent by a seller (L1-12,
// core/images/webp.ts): `{property_id}/{uuid}-{width}.webp`. The uuid comes
// from the property and the rank of its photo: a second run replaces the same
// files and adds no row.
// SEED_STORAGE_URL: the Storage API (local: its service in
// scripts/local-stack.sh; staging: https://<ref>.supabase.co/storage/v1).
// SEED_STORAGE_KEY: its service role key, read from the environment only.
import { readFileSync } from "node:fs";
import sharp from "sharp";

const dir = new URL("../supabase/seed/photos/", import.meta.url).pathname;
const WIDTHS = [400, 800, 1600];
const url = process.env.SEED_STORAGE_URL;
const key = process.env.SEED_STORAGE_KEY;
if (!url || !key) {
  console.error("seed-photos: SEED_STORAGE_URL and SEED_STORAGE_KEY are required.");
  process.exit(1);
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const pad = (n, size) => String(n).padStart(size, "0");

const { photos } = JSON.parse(readFileSync(`${dir}photos.json`, "utf8"));
const ranks = new Map();
const rows = [];
for (const photo of photos) {
  const rank = (ranks.get(photo.property) ?? 0) + 1;
  ranks.set(photo.property, rank);
  // The ids of supabase/seed/05_demo_data.sql (seed_ids).
  const propertyId = `5eed1000-0000-4000-8000-${pad(photo.property, 12)}`;
  const path = `${propertyId}/5eed7000-0000-4000-8000-${pad(photo.property, 6)}${pad(rank, 6)}`;
  const cropped = await sharp(`${dir}${photo.file}`).rotate().extract(photo.crop).toBuffer();
  let largest = { width: 0, height: 0 };
  for (const width of WIDTHS) {
    const { data, info } = await sharp(cropped)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    if (info.width > largest.width) largest = { width: info.width, height: info.height };
    const response = await fetch(`${url}/object/photos/${path}-${width}.webp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        apikey: key,
        "content-type": "image/webp",
        "cache-control": "max-age=3600",
        "x-upsert": "true",
      },
      body: data,
    });
    if (!response.ok) {
      throw new Error(
        `seed-photos: ${path}-${width}.webp: ${response.status} ${await response.text()}`,
      );
    }
  }
  rows.push(
    `(${lit(propertyId)}::uuid, ${lit(path)}, ${largest.width}, ${largest.height}, ${lit(photo.caption)})`,
  );
}

// photos_before_insert numbers them in this order, the first one of a property its cover.
console.log(
  "insert into public.photos (property_id, storage_path, width, height, caption) values\n" +
    `${rows.join(",\n")}\non conflict (storage_path) do nothing;`,
);
console.error(
  `seed-photos: ${photos.length} photos of ${ranks.size} demo properties in the bucket photos.`,
);
