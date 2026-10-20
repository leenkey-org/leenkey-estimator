#!/usr/bin/env node
// Loads the photos of the demo properties (supabase/seed/photos/photos.json,
// L1-46) as their owners would: signed in with the seed accounts, the files
// go to the bucket photos under the RLS of Storage, never with the service
// key (DECISIONS Q48). Then prints the SQL of their rows in public.photos,
// for psql (scripts/db-seed.sh). Only demo properties without any photo get
// theirs: a property is left as the recette made it.
// Each photo is cropped as the manifest says, then written in WebP at 400,
// 800 and 1600 px, never enlarged, as a photo sent by a seller (L1-12,
// core/images/webp.ts): `{property_id}/{uuid}-{width}.webp`, the uuid taken
// from the name of its file, so that a second run finds the same files.
// Usage: node scripts/seed-photos.mjs local|staging
//   SEED_SUPABASE_URL, SEED_SUPABASE_ANON_KEY: the project of the target (its
//     public key); SEED_DATABASE_URL: the database seeded, which must be that
//     project's; SEED_PASSWORD: password of the seed accounts;
//   SEED_PHOTOS_SKIP: ids of the demo properties that already have photos.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = fileURLToPath(new URL("../supabase/seed/photos/", import.meta.url));
const WIDTHS = [400, 800, 1600];
const OWNERS = { a: "seller_a@test.leenkey.fr", b: "seller_b@test.leenkey.fr" };

function fail(message) {
  console.error(`seed-photos: ${message}`);
  process.exit(1);
}

const target = process.argv[2];
const url = process.env.SEED_SUPABASE_URL?.replace(/\/+$/, "");
const anonKey = process.env.SEED_SUPABASE_ANON_KEY;
const password = process.env.SEED_PASSWORD;
if (!url || !anonKey || !password) {
  fail("SEED_SUPABASE_URL, SEED_SUPABASE_ANON_KEY and SEED_PASSWORD are required.");
}
// Never production: the local stack, or the project of the staging database.
const host = new URL(url).hostname;
if (target === "local") {
  if (host !== "localhost" && host !== "127.0.0.1") fail(`local is the local stack, not ${host}.`);
} else if (target === "staging") {
  const ref = /^([a-z0-9]+)\.supabase\.co$/.exec(host)?.[1];
  if (!ref || !(process.env.SEED_DATABASE_URL ?? "").includes(ref)) {
    fail(`${host} is not the project of the staging database.`);
  }
} else {
  fail(`runs on local or staging only, never on production (got: ${target}).`);
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const pad = (n, size) => String(n).padStart(size, "0");
const skip = new Set((process.env.SEED_PHOTOS_SKIP ?? "").split(",").filter(Boolean));

async function signIn(email) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) fail(`sign in of ${email}: ${response.status}`);
  return (await response.json()).access_token;
}

/**
 * A file sent by its owner: true once in the bucket (one already there, a
 * second run, is kept); false when the RLS refuses it, the property changed
 * meanwhile (sold, suspended, deleted): the property is then left out.
 */
async function upload(token, name, data) {
  const response = await fetch(`${url}/storage/v1/object/photos/${name}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      apikey: anonKey,
      "content-type": "image/webp",
      "cache-control": "max-age=3600",
    },
    body: data,
  });
  if (response.ok) return true;
  const text = await response.text();
  if (/duplicate|already exists/i.test(text)) return true;
  if (response.status === 403 || /row-level security|unauthorized/i.test(text)) return false;
  fail(`${name}: ${response.status} ${text}`);
}

const { photos } = JSON.parse(readFileSync(`${dir}photos.json`, "utf8"));
const tokens = new Map();
const rows = [];
for (const photo of photos) {
  if (!Number.isInteger(photo.property) || !(photo.owner in OWNERS)) {
    fail(`${photo.file}: property and owner (a or b) expected.`);
  }
  // The ids of supabase/seed/05_demo_data.sql (seed_ids).
  const propertyId = `5eed1000-0000-4000-8000-${pad(photo.property, 12)}`;
  if (skip.has(propertyId)) continue;
  if (!tokens.has(photo.owner)) tokens.set(photo.owner, await signIn(OWNERS[photo.owner]));
  const hash = createHash("sha256").update(photo.file).digest("hex").slice(0, 12);
  const path = `${propertyId}/5eed7000-0000-4000-8000-${hash}`;
  let largest = { width: 0, height: 0 };
  let sent = true;
  for (const width of WIDTHS) {
    // From the file each time: one lossy encoding, as for an upload.
    const { data, info } = await sharp(`${dir}${photo.file}`)
      .rotate()
      .extract(photo.crop)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    if (info.width > largest.width) largest = { width: info.width, height: info.height };
    if (!(await upload(tokens.get(photo.owner), `${path}-${width}.webp`, data))) {
      console.error(`seed-photos: ${photo.file} left out, its owner may no longer add photos.`);
      sent = false;
      break;
    }
  }
  if (!sent) continue;
  rows.push(
    `(${lit(propertyId)}::uuid, ${lit(path)}, ${largest.width}, ${largest.height}, ${lit(photo.caption)})`,
  );
}

if (rows.length === 0) {
  console.error(
    "seed-photos: no demo property to give a photo (they have some, or may no longer take one).",
  );
  process.exit(0);
}
// Only for properties still without photo (the check is made again here);
// photos_before_insert numbers them in this order, the first one the cover.
console.log(
  "insert into public.photos (property_id, storage_path, width, height, caption)\n" +
    "select v.property_id, v.storage_path, v.width, v.height, v.caption from (values\n" +
    `${rows.join(",\n")}\n) as v(property_id, storage_path, width, height, caption)\n` +
    "where not exists (select 1 from public.photos p where p.property_id = v.property_id)\n" +
    "on conflict (storage_path) do nothing;",
);
console.error(`seed-photos: ${rows.length} photos sent by their owners to the bucket photos.`);
