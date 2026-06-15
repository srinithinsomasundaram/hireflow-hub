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

async function getAuthenticatedUserId(): Promise<string> {
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

async function assertAdmin(userId: string) {
  const admin = adminClient();
  const { data } = await admin
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

export async function getAdminDashboard(): Promise<{
  users: AdminUser[];
  stats: { total: number; premium: number; totalPitches: number };
}> {
  const userId = await getAuthenticatedUserId();
  await assertAdmin(userId);

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
}

export async function setUserPremium(input: { userId: string; isPremium: boolean }) {
  const { userId: targetUserId, isPremium } = z
    .object({ userId: z.string().uuid(), isPremium: z.boolean() })
    .parse(input);

  const callerId = await getAuthenticatedUserId();
  await assertAdmin(callerId);

  const admin = adminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_premium: isPremium })
    .eq("id", targetUserId);

  if (error) throw new Error(error.message);
  return { ok: true };
}
