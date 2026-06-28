const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 5;
const RL_MAX_STORE_SIZE = 50_000;

const store = new Map<string, { count: number; resetAt: number }>();

// Prune all expired entries to prevent unbounded memory growth.
function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export function checkRateLimit(ip: string, scopeId: string): boolean {
  // Safety valve: if the store is too large, prune before adding more entries.
  // This bounds memory even under a rotating-IP DoS attempt.
  if (store.size >= RL_MAX_STORE_SIZE) pruneExpired();

  const key = `${ip}:${scopeId}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count++;
  return true;
}

/**
 * Extracts the client IP from the request.
 *
 * Trusts x-forwarded-for only when the TRUSTED_PROXY env var is set,
 * signalling that the deployment platform controls that header (Cloudflare,
 * Vercel, etc.). Without it, falls back to x-real-ip then "unknown" to avoid
 * letting clients spoof their own IP and bypass rate limiting.
 */
export function getClientIp(headers: Headers): string {
  const trustedProxy = process.env.TRUSTED_PROXY === "true";
  if (trustedProxy) {
    const xff = headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}
