export function reportError(error: unknown, _context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error(error);
}
