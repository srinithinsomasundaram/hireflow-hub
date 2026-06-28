/**
 * Extract the careers-site subdomain from a Host header value.
 * Returns null when running on the main app domain (no subdomain, www, app).
 *
 * Examples:
 *   nexora.hireflow.app        → "nexora"
 *   nexora.localhost:5173      → "nexora"
 *   nexora.lvh.me              → "nexora"
 *   hireflow.app               → null
 *   www.hireflow.app           → null
 *   localhost:5173             → null
 */
export function extractSubdomain(host: string | null | undefined): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0]; // strip port
  const parts = hostname.split(".");

  // Single label (plain "localhost") — no subdomain
  if (parts.length === 1) return null;

  // IPv4 address — no subdomain
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

  const sub = parts[0];
  const RESERVED = new Set(["www", "app", "api", "mail", "smtp", "ftp"]);
  if (RESERVED.has(sub)) return null;

  // Two-label hostnames like "lvh.me" or "localhost" variants with no real subdomain
  // are handled by the single-label guard above.  Anything with 2+ labels where
  // the first part is non-reserved is treated as a subdomain.
  return sub;
}

/** Paths that must never be rewritten to /c/$slug even on a subdomain request. */
const SKIP_PREFIXES = [
  "/_",       // TanStack / Vite internals
  "/api",
  "/oauth",
  "/c/",      // already a /c/ path — don't double-wrap
];

export function shouldRewriteForSubdomain(pathname: string): boolean {
  return !SKIP_PREFIXES.some((p) => pathname.startsWith(p));
}
