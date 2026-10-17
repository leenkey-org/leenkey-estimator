// Where to send someone after signing in, signing up or accepting the terms.
// `next` comes from the URL or the user metadata: it is never trusted as is.

const BASE = "https://next-path.invalid";
const MAX_LENGTH = 512;

/** Pages that must never be a destination after authentication. */
const AUTH_PATHS = [
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reinitialiser",
  "/conditions",
  "/confirmation",
  "/auth",
];

/**
 * A path of this site (with its query and hash) to go back to, or `fallback`.
 * Refuses absolute URLs, protocol-relative ("//host", "/\\host") and control
 * characters, so it can be passed to redirect() without an open redirect.
 */
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw || raw.length > MAX_LENGTH || !raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  if (AUTH_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
    return fallback;
  }
  const path = `${url.pathname}${url.search}${url.hash}`;
  // Dot segments are resolved by URL: « /.//evil.com » becomes « //evil.com ».
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}

/** Login page that comes back to `path` afterwards. */
export function loginPath(path: string | null | undefined): string {
  const next = safeNextPath(path, "");
  return next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion";
}
