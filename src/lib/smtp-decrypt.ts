// Server-only. Never import this statically from route files or components.
// Dynamic import only: const { decryptSmtpConfig } = await import("./smtp-decrypt")
import { decryptValue } from "./encrypt";
import type { SmtpConfigDecrypted } from "./smtp-config";

export function decryptSmtpConfig(raw: Record<string, unknown>): SmtpConfigDecrypted {
  return {
    host: String(raw.host ?? ""),
    port: String(raw.port ?? "587"),
    username: String(raw.username ?? ""),
    password: raw.password ? decryptValue(String(raw.password)) : "",
    from_name: String(raw.from_name ?? ""),
    from_email: String(raw.from_email ?? ""),
  };
}
