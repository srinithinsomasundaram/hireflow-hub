import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

export type SmtpConfigDecrypted = {
  host: string;
  port: string;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
};

const SaveSmtpInput = z.object({
  organizationId: z.string().uuid(),
  host: z.string().min(1),
  port: z.string(),
  username: z.string().min(1),
  // Empty string means "keep the existing encrypted password unchanged"
  password: z.string(),
  from_name: z.string(),
  from_email: z.string().email(),
  enabled: z.boolean(),
});

// Server function — encrypts the password before writing to DB.
// If password is empty, the existing encrypted password in the DB is preserved.
export const saveSmtpConfigFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => SaveSmtpInput.parse(d))
  .handler(async ({ data, context }) => {
    const { encryptValue } = await import("./encrypt");
    const { supabase } = context;

    // Verify the caller belongs to this org
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .in("role", ["owner", "admin"])
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    // Resolve the password: encrypt a new one, or fetch the existing encrypted value
    let resolvedPassword: string;
    if (data.password) {
      resolvedPassword = encryptValue(data.password);
    } else {
      const { data: existing } = await supabase
        .from("organization_settings")
        .select("smtp_config")
        .eq("organization_id", data.organizationId)
        .maybeSingle();
      const existingConfig = existing?.smtp_config as Record<string, unknown> | null;
      resolvedPassword = existingConfig?.password ? String(existingConfig.password) : "";
      if (!resolvedPassword) throw new Error("A password is required when configuring SMTP for the first time.");
    }

    const smtpConfig = {
      host: data.host,
      port: data.port,
      username: data.username,
      password: resolvedPassword,
      from_name: data.from_name,
      from_email: data.from_email,
    };

    const { error } = await supabase.from("organization_settings").upsert({
      organization_id: data.organizationId,
      smtp_config: smtpConfig as unknown as Json,
      smtp_enabled: data.enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });

    if (error) throw new Error("Failed to save SMTP configuration");
    return { ok: true };
  });
