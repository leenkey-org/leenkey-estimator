import "server-only";
import { createHmac } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { addressScope, clientAddress } from "./client-address";

// Limits of requests per address (L1-38, CLAUDE.md section 11): sign-up,
// sign-in, password reset, contact form. Counted in Postgres by
// rate_limit_hit (supabase/migrations/20261108160000_rate_limits.sql), the
// limits written there; the address known by a hash keyed with a key derived
// from CRON_SECRET, the function called with a second derived key that proves
// the caller is this server. Messages and the assistant have their own limits
// (messages_rate_limit, ai_quota_consume, ai_visitor_ask).

export type RateBucket = "signup" | "signin" | "reset" | "contact";

/** The limits of rate_limit_hit, in requests per window (tests/unit/security). */
export const RATE_LIMITS: Record<RateBucket, { limit: number; windowSeconds: number }> = {
  signup: { limit: 5, windowSeconds: 3600 },
  signin: { limit: 20, windowSeconds: 900 },
  reset: { limit: 5, windowSeconds: 3600 },
  contact: { limit: 5, windowSeconds: 3600 },
};

const hmac = (key: string, text: string) => createHmac("sha256", key).update(text).digest("hex");

/** The keys of the limits, derived from CRON_SECRET; none without it. */
export function rateLimitKeys(
  secret = process.env.CRON_SECRET,
): { serverKey: string; hashKey: string } | null {
  if (!secret) return null;
  return {
    serverKey: hmac(secret, "leenkey:rate-limit:server"),
    hashKey: hmac(secret, "leenkey:rate-limit:hash"),
  };
}

/** What the base knows of an address in a bucket: a keyed hash. */
export function rateKey(hashKey: string, bucket: RateBucket, address: string): string {
  return hmac(hashKey, `${bucket}:${addressScope(address)}`);
}

/**
 * Counts a request of this address in the bucket; false once the limit is
 * passed. Lets it through without an address (local, tests), without the
 * secret, or when the base does not answer: a limit never locks people out
 * of their account because of an outage (the error is logged).
 */
export async function allowRequest(bucket: RateBucket, headers: Headers): Promise<boolean> {
  const address = clientAddress(headers);
  const keys = rateLimitKeys();
  if (!address || !keys) return true;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rate_limit_hit", {
    p_server: keys.serverKey,
    p_bucket: bucket,
    p_key: rateKey(keys.hashKey, bucket, address),
  });
  if (error) {
    console.error("[rate-limit] count failed", { bucket, code: error.code });
    return true;
  }
  return data === true;
}
