"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";

function adminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function getCurrentUserId(): Promise<string> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE!;

  let token: string | undefined;

  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find(c => c.name.includes("-auth-token") && c.name.startsWith("sb-"));
  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie.value);
      token = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
    } catch {
      token = authCookie.value;
    }
  }

  if (!token) {
    token = cookieStore.get("sb-access-token")?.value
      || cookieStore.get("supabase-auth-token")?.value;
  }

  if (!token) throw new Error("Unauthorized: No session token found");

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized: Invalid or expired session");

  return user.id;
}

export async function getOnboardingStatus() {
  const userId = await getCurrentUserId();

  const { data } = await adminClient()
    .from("profiles")
    .select("onboarding_completed, full_name, agency_name, service_niche")
    .eq("id", userId)
    .maybeSingle();

  return {
    completed: data?.onboarding_completed ?? false,
    fullName: data?.full_name ?? "",
    agencyName: data?.agency_name ?? "",
    serviceNiche: data?.service_niche ?? "",
  };
}

const OnboardingInput = z.object({
  fullName: z.string().trim().max(100),
  agencyName: z.string().trim().max(120),
  serviceNiche: z.string().trim().max(150),
});

export async function saveOnboarding(input: {
  fullName: string;
  agencyName: string;
  serviceNiche: string;
}) {
  const data = OnboardingInput.parse(input);
  const userId = await getCurrentUserId();

  const { error } = await adminClient()
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: data.fullName || null,
        agency_name: data.agencyName || null,
        service_niche: data.serviceNiche || null,
        onboarding_completed: true,
      },
      { onConflict: "id" },
    );

  if (error) throw new Error(error.message);
  return { ok: true };
}
