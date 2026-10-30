#!/usr/bin/env node
// Computes the embeddings of the knowledge base (L1-27): an admin asks the
// Edge Function `embed` to fill the cards without one (reindex). Signed in
// with the account of an admin, never with the service key: RLS lets an admin
// alone write knowledge_base. Cards whose answer changed lost their embedding
// at the import (scripts/seed-knowledge.mjs), so only they are computed again.
// Environment: KB_SUPABASE_URL, KB_SUPABASE_ANON_KEY (the project), and
// KB_ADMIN_EMAIL with KB_ADMIN_PASSWORD, or the seed admin with SEED_PASSWORD.
const url = process.env.KB_SUPABASE_URL;
const anonKey = process.env.KB_SUPABASE_ANON_KEY;
const email = process.env.KB_ADMIN_EMAIL ?? "admin@test.leenkey.fr";
const password = process.env.KB_ADMIN_PASSWORD ?? process.env.SEED_PASSWORD;

function fail(message) {
  console.error(`kb-embed: ${message}`);
  process.exit(1);
}

if (!url || !anonKey || !password) {
  fail("KB_SUPABASE_URL, KB_SUPABASE_ANON_KEY and an admin password are required.");
}

const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anonKey, "content-type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!signIn.ok) fail(`sign in of ${email}: ${signIn.status}`);
const token = (await signIn.json()).access_token;

// The model loads on the first call: up to a minute on a cold runtime.
const response = await fetch(`${url}/functions/v1/embed`, {
  method: "POST",
  headers: {
    apikey: anonKey,
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ reindex: true }),
  signal: AbortSignal.timeout(300_000),
});
if (!response.ok) fail(`embed: ${response.status} ${await response.text()}`);
const { updated } = await response.json();
console.log(`Knowledge base embedded: ${updated} card(s) computed.`);
