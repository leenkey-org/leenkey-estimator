// HTTP Basic authentication for the preprod (CLAUDE.md section 4).
// Runs in the middleware (Edge runtime): no Node crypto, so the comparison is
// written to take the same time whatever the position of the first difference.

export function safeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function isAuthorized(header: string | null, user: string, password: string): boolean {
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const givenUser = decoded.slice(0, separator);
  const givenPassword = decoded.slice(separator + 1);
  // Both comparisons always run, so a wrong user and a wrong password take the same time.
  const userOk = safeEqual(givenUser, user);
  const passwordOk = safeEqual(givenPassword, password);
  return userOk && passwordOk;
}

// Paths that carry their own authentication (Stripe signature, CRON_SECRET).
export function isExemptPath(pathname: string): boolean {
  return pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/cron/");
}
