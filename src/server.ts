import "./lib/error-capture";

import * as Sentry from "@sentry/node";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { extractSubdomain, shouldRewriteForSubdomain } from "./lib/subdomain";

// Initialize once at module load — no-op when SENTRY_DSN is absent.
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "",
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV ?? "production",
});

// ─── Security headers ─────────────────────────────────────────────────────────

const STATIC_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function generateNonce(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function buildCsp(nonce: string): string {
  return [
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

async function applySecurityHeaders(response: Response, nonce: string): Promise<Response> {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(STATIC_SECURITY_HEADERS)) headers.set(k, v);
  headers.set("Content-Security-Policy", buildCsp(nonce));

  const ct = headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const text = await response.text();
  const patched = text.replace(
    /<script\b([^>]*)>/gi,
    (_: string, attrs: string) => {
      if (/\bnonce\s*=/.test(attrs)) return `<script${attrs}>`;
      return `<script${attrs} nonce="${nonce}">`;
    },
  );

  return new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ─── Subdomain routing ────────────────────────────────────────────────────────

function redirectToSubdomain(request: Request): Response | null {
  const host = request.headers.get("host") ?? "";
  if (extractSubdomain(host)) return null;

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/c\/([a-z0-9-]+)(\/.*)?$/i);
  if (!match) return null;

  const slug = match[1];
  const tail = (match[2] || "/") + url.search;
  const [hostname, port] = host.split(":");
  return Response.redirect(
    `${url.protocol}//${slug}.${hostname}${port ? `:${port}` : ""}${tail}`,
    302,
  );
}

function rewriteForSubdomain(request: Request): Request {
  const host = request.headers.get("host");
  const subdomain = extractSubdomain(host);
  if (!subdomain) return request;

  const url = new URL(request.url);
  if (!shouldRewriteForSubdomain(url.pathname)) return request;

  const tail = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/c/${subdomain}${tail}`;

  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    duplex: "half",
  } as RequestInit & { duplex: string });
}

function stripRedundantSubdomainPath(request: Request): Response | null {
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host);
  if (!subdomain) return null;

  const url = new URL(request.url);
  const prefix = `/c/${subdomain}`;
  if (!url.pathname.startsWith(prefix)) return null;

  const tail = url.pathname.slice(prefix.length) || "/";
  return Response.redirect(`${url.protocol}//${host}${tail}${url.search}${url.hash}`, 302);
}

// ─── SSR entry ────────────────────────────────────────────────────────────────

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const err = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(err);
  Sentry.captureException(err);
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// ─── Core handler ─────────────────────────────────────────────────────────────

async function handleRequest(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  const nonce = generateNonce();

  try {
    const subdomainRedirect = redirectToSubdomain(request);
    if (subdomainRedirect) return applySecurityHeaders(subdomainRedirect, nonce);

    const stripRedirect = stripRedundantSubdomainPath(request);
    if (stripRedirect) return applySecurityHeaders(stripRedirect, nonce);

    const handler = await getServerEntry();
    const rewritten = rewriteForSubdomain(request);
    const response = await handler.fetch(rewritten, env, ctx);
    const normalized = await normalizeCatastrophicSsrResponse(response);
    return applySecurityHeaders(normalized, nonce);
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    return applySecurityHeaders(
      new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
      nonce,
    );
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
};
