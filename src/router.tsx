import { QueryClient } from "@tanstack/react-query";
import { createRouter, createBrowserHistory, createHistory } from "@tanstack/react-router";
import type { RouterHistory, HistoryLocation, ParsedHistoryState } from "@tanstack/history";
import { routeTree } from "./routeTree.gen";

const RESERVED = new Set(["www", "app", "api", "mail", "smtp", "ftp", "hireflow"]);

// e.g. "hireflow.yesp.space" — must be VITE_ prefixed to be available in the browser bundle
const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN ?? "";

function getSubdomainPrefix(): string {
  if (typeof window === "undefined") return "";

  const host = window.location.hostname;

  // Raw IPv4 or bare localhost — no subdomain
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return "";

  // If configured: exact root domain → no subdomain
  if (APP_DOMAIN && host === APP_DOMAIN) return "";

  if (APP_DOMAIN) {
    const suffix = "." + APP_DOMAIN;
    if (host.endsWith(suffix)) {
      const sub = host.slice(0, host.length - suffix.length);
      if (!sub || RESERVED.has(sub)) return "";
      // Clean single-label subdomain
      if (!sub.includes(".")) return `/c/${sub}`;
      // Multi-label sub means APP_DOMAIN is too broad — fall through below
    } else {
      // Completely different domain — not our subdomain
      return "";
    }
  }

  // Fallback: leftmost label (handles local dev and misconfigured APP_DOMAIN)
  const parts = host.split(".");
  if (parts.length < 2) return "";
  const sub = parts[0];
  if (RESERVED.has(sub)) return "";
  return `/c/${sub}`;
}

/**
 * Always reads window.location fresh and adds the subdomain prefix so
 * TanStack Router sees /c/yesphello/careers/jobs/... while the address bar
 * shows the clean /careers/jobs/... URL.
 */
function buildPrefixedLocation(prefix: string): HistoryLocation {
  const { pathname, search, hash } = window.location;
  const prefixed = pathname.startsWith(prefix)
    ? pathname
    : prefix + (pathname === "/" ? "" : pathname);
  return {
    href: prefixed + search + hash,
    pathname: prefixed,
    search,
    hash,
    state: (window.history.state ?? {}) as ParsedHistoryState,
  };
}

function createSubdomainAwareHistory(): RouterHistory {
  const prefix = getSubdomainPrefix();
  if (!prefix) return createBrowserHistory();

  // Strip prefix before writing to browser history so the address bar stays clean.
  const strip = (path: string) =>
    path.startsWith(prefix) ? path.slice(prefix.length) || "/" : path;

  // Use createHistory (the base primitive) so getLocation is called fresh on
  // every access and after every navigation — no cached state to go stale.
  return createHistory({
    getLocation: () => buildPrefixedLocation(prefix),
    getLength: () => window.history.length,
    pushState: (path, state) =>
      window.history.pushState(state, "", strip(path)),
    replaceState: (path, state) =>
      window.history.replaceState(state, "", strip(path)),
    go: (n) => window.history.go(n),
    back: (_ignoreBlocker) => window.history.go(-1),
    forward: (_ignoreBlocker) => window.history.go(1),
    createHref: (path) => strip(path),
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: typeof window !== "undefined" ? createSubdomainAwareHistory() : undefined,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
