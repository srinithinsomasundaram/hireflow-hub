import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function adminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const getOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await adminClient()
      .from("profiles")
      .select("onboarding_completed, full_name, agency_name, service_niche")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      completed: data?.onboarding_completed ?? false,
      fullName: data?.full_name ?? "",
      agencyName: data?.agency_name ?? "",
      serviceNiche: data?.service_niche ?? "",
    };
  });

const OnboardingInput = z.object({
  fullName: z.string().trim().max(100),
  agencyName: z.string().trim().max(120),
  serviceNiche: z.string().trim().max(150),
});

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => OnboardingInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await adminClient()
      .from("profiles")
      .upsert(
        {
          id: context.userId,
          full_name: data.fullName || null,
          agency_name: data.agencyName || null,
          service_niche: data.serviceNiche || null,
          onboarding_completed: true,
        },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
