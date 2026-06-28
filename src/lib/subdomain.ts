/**
 * Extract the careers-site subdomain from a Host header value.
 * Returns null when running on the main app domain (no subdomain, www, app).
 *
 * Examples (with VITE_APP_DOMAIN=hireflow.yesp.space):
 *   nexora.hireflow.yesp.space → "nexora"
 *   hireflow.yesp.space        → null  (root app domain)
 *   nexora.localhost:5173      → "nexora"
 *   localhost:5173             → null
 *   35.244.2.197:8080          → null  (raw IP)
 */

const RESERVED = new Set(["www", "app", "api", "mail", "smtp", "ftp", "hireflow"]);

// e.g. "hireflow.yesp.space" — set via VITE_APP_DOMAIN env var
const APP_DOMAIN =
  (typeof process !== "undefined" ? process.env.VITE_APP_DOMAIN : undefined) ?? "";

export function extractSubdomain(host: string | null | undefined): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0]; // strip port

  // Raw IPv4 address — no subdomain
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

  // Single label (plain "localhost") — no subdomain
  const parts = hostname.split(".");
  if (parts.length === 1) return null;

  // If configured: exact match is the root app → no subdomain
  if (APP_DOMAIN && hostname === APP_DOMAIN) return null;

  // If configured: must be <sub>.<APP_DOMAIN> to be a tenant subdomain
  if (APP_DOMAIN) {
    const suffix = "." + APP_DOMAIN;
    if (!hostname.endsWith(suffix)) return null;
    const sub = hostname.slice(0, hostname.length - suffix.length);
    if (!sub || sub.includes(".") || RESERVED.has(sub)) return null;
    return sub;
  }

  // Fallback for local dev without APP_DOMAIN set (e.g. nexora.localhost)
  const sub = parts[0];
  if (RESERVED.has(sub)) return null;
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
