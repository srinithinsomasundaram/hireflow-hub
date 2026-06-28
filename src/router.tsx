import { QueryClient } from "@tanstack/react-query";
import { createRouter, createBrowserHistory, createHistory } from "@tanstack/react-router";
import type { RouterHistory, HistoryLocation, ParsedHistoryState } from "@tanstack/history";
import { routeTree } from "./routeTree.gen";

const RESERVED = new Set(["www", "app", "api", "mail", "smtp", "ftp"]);

function getSubdomainPrefix(): string {
  if (typeof window === "undefined") return "";
  const parts = window.location.hostname.split(".");
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
