import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function adminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  if (data?.email !== process.env.ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin only");
  }
}

export type AdminUser = {
  id: string;
  email: string;
  is_premium: boolean;
  pitch_count: number;
  created_at: string;
};

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const admin = adminClient();

    const [profilesRes, genRes] = await Promise.all([
      admin.from("profiles").select("id, email, is_premium, created_at").order("created_at", { ascending: false }),
      admin.from("user_generations").select("user_id"),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);

    const counts: Record<string, number> = {};
    for (const row of genRes.data ?? []) {
      counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
    }

    const users: AdminUser[] = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? "(no email)",
      is_premium: p.is_premium ?? false,
      pitch_count: counts[p.id] ?? 0,
      created_at: p.created_at,
    }));

    const totalPitches = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      users,
      stats: {
        total: users.length,
        premium: users.filter((u) => u.is_premium).length,
        totalPitches,
      },
    };
  });

export const setUserPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ userId: z.string().uuid(), isPremium: z.boolean() }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    const admin = adminClient();
    const { error } = await admin
      .from("profiles")
      .update({ is_premium: data.isPremium })
      .eq("id", data.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
