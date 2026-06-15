"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";

export type PlanDef = {
  id: number;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  accent: boolean;
};

export async function getPlans(): Promise<PlanDef[]> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("plan_configs")
    .select("*")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanDef[];
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
    token = cookieStore.get("sb-access-token")?.value || cookieStore.get("supabase-auth-token")?.value;
  }
  if (!token) throw new Error("Unauthorized: No session token found");

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized: Invalid or expired session");
  return user.id;
}

const UpdatePlanInput = z.object({
  id: z.number().int().min(0).max(10),
  name: z.string().trim().min(1).max(80),
  price: z.string().trim().min(1).max(30),
  period: z.string().trim().min(1).max(20),
  description: z.string().trim().min(1).max(200),
  features: z.array(z.string().trim()).min(1).max(10),
  cta: z.string().trim().min(1).max(40),
});

export async function updatePlan(input: {
  id: number;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
}) {
  const data = UpdatePlanInput.parse(input);
  await getCurrentUserId(); // ensure authenticated

  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin
    .from("plan_configs")
    .update({
      name: data.name,
      price: data.price,
      period: data.period,
      description: data.description,
      features: data.features.filter(Boolean),
      cta: data.cta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
