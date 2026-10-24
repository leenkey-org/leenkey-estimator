import "server-only";
import { safeEqual } from "@/core/auth/basic-auth";

// The jobs of /api/cron/* (CLAUDE.md sections 11 and 13): called by pg_cron
// with « Authorization: Bearer <CRON_SECRET> » (SPEC-V2 section 19). Without
// CRON_SECRET, nothing is accepted. Compared in constant time.

export function isCronRequest(authorization: string | null, secret = process.env.CRON_SECRET) {
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  return safeEqual(authorization.slice("Bearer ".length).trim(), secret);
}
