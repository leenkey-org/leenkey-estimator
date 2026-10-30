#!/usr/bin/env node
// Computes the embeddings of the knowledge base (L1-27): an admin asks the
// Edge Function `embed` to fill the cards without one (reindex, 20 per call,
// again until none remains). Signed in
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

// The function computes 20 cards per call; the model loads on the first one:
// up to a minute on a cold runtime.
let total = 0;
for (;;) {
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
  if (response.status === 403) fail(`${email} is not an admin.`);
  if (!response.ok) fail(`embed: ${response.status} ${await response.text()}`);
  const { updated, remaining } = await response.json();
  total += updated;
  if (!remaining) break;
  if (updated === 0) fail("no card computed while some remain.");
}
console.log(`Knowledge base embedded: ${total} card(s) computed.`);
