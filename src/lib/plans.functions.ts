import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

export const getPlans = createServerFn({ method: "GET" }).handler(async () => {
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
});

const UpdatePlanInput = z.object({
  id: z.number().int().min(0).max(10),
  name: z.string().trim().min(1).max(80),
  price: z.string().trim().min(1).max(30),
  period: z.string().trim().min(1).max(20),
  description: z.string().trim().min(1).max(200),
  features: z.array(z.string().trim()).min(1).max(10),
  cta: z.string().trim().min(1).max(40),
});

export const updatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdatePlanInput.parse(raw))
  .handler(async ({ data }) => {
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
  });
